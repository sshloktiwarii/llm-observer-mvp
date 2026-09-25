package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
	_ "github.com/lib/pq"
)

// LLMEvent represents a single LLM API call
type LLMEvent struct {
	TraceID               uuid.UUID `json:"trace_id"`
	SpanID                uuid.UUID `json:"span_id"`
	ParentSpanID          *uuid.UUID `json:"parent_span_id,omitempty"`
	Timestamp             time.Time `json:"timestamp"`
	AgentID               string    `json:"agent_id"`
	Model                 string    `json:"model"`
	Provider              string    `json:"provider"`
	PromptTokens          int       `json:"prompt_tokens"`
	CompletionTokens      int       `json:"completion_tokens"`
	CostUSD               float64   `json:"cost_usd"`
	LatencyMs             int       `json:"latency_ms"`
	Status                string    `json:"status"`
	ErrorCode             *string   `json:"error_code,omitempty"`
	ErrorMessage          *string   `json:"error_message,omitempty"`
	RequestText           *string   `json:"request_text,omitempty"`
	ResponseText          *string   `json:"response_text,omitempty"`
	ProbableLoop          bool      `json:"probable_loop"`
	PromptInjectionScore  float64   `json:"prompt_injection_score"`
}

// EventBatcher batches events before publishing to Kafka
type EventBatcher struct {
	events        []LLMEvent
	maxEvents     int
	flushInterval time.Duration
	kafkaWriter   *kafka.Writer
	db            *sql.DB
	mu            sync.Mutex
	ticker        *time.Ticker
	done          chan bool
}

func NewEventBatcher(kafkaAddr string, db *sql.DB) *EventBatcher {
	writer := kafka.NewWriter(kafka.WriterConfig{
		Brokers:     []string{kafkaAddr},
		Topic:       "llm-events",
	})

	batcher := &EventBatcher{
		events:        make([]LLMEvent, 0, 1000),
		maxEvents:     1000,
		flushInterval: 100 * time.Millisecond,
		kafkaWriter:   writer,
		db:            db,
		ticker:        time.NewTicker(100 * time.Millisecond),
		done:          make(chan bool),
	}

	// Start background flush routine
	go batcher.flushRoutine()

	return batcher
}

func (eb *EventBatcher) AddEvent(event LLMEvent) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	eb.events = append(eb.events, event)

	// Flush if we hit max events
	if len(eb.events) >= eb.maxEvents {
		eb.flushUnlocked()
	}
}

func (eb *EventBatcher) flushRoutine() {
	for {
		select {
		case <-eb.ticker.C:
			eb.Flush()
		case <-eb.done:
			eb.Flush() // Final flush
			return
		}
	}
}

func (eb *EventBatcher) Flush() {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.flushUnlocked()
}

func (eb *EventBatcher) flushUnlocked() {
	if len(eb.events) == 0 {
		return
	}

	// Publish to Kafka
	messages := make([]kafka.Message, len(eb.events))
	for i, event := range eb.events {
		data, _ := json.Marshal(event)
		messages[i] = kafka.Message{
			Key:   []byte(event.TraceID.String()),
			Value: data,
		}
	}

	if err := eb.kafkaWriter.WriteMessages(context.Background(), messages...); err != nil {
		log.Printf("Error writing to Kafka: %v", err)
		return
	}

	// Also write to database for querying
	eb.writeToDatabase(eb.events)

	log.Printf("Flushed %d events to Kafka and database", len(eb.events))
	eb.events = eb.events[:0] // Reset slice
}

func (eb *EventBatcher) writeToDatabase(events []LLMEvent) {
	stmt, err := eb.db.Prepare(`
		INSERT INTO llm_events (
			time, trace_id, span_id, parent_span_id, agent_id, model, provider,
			prompt_tokens, completion_tokens, cost_usd, latency_ms, status,
			error_code, error_message, request_text, response_text,
			probable_loop, prompt_injection_score
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`)
	if err != nil {
		log.Printf("Error preparing statement: %v", err)
		return
	}
	defer stmt.Close()

	for _, event := range events {
		_, err := stmt.Exec(
			event.Timestamp, event.TraceID, event.SpanID, event.ParentSpanID,
			event.AgentID, event.Model, event.Provider,
			event.PromptTokens, event.CompletionTokens, event.CostUSD, event.LatencyMs,
			event.Status, event.ErrorCode, event.ErrorMessage,
			event.RequestText, event.ResponseText,
			event.ProbableLoop, event.PromptInjectionScore,
		)
		if err != nil {
			log.Printf("Error inserting event: %v", err)
		}
	}
}

func (eb *EventBatcher) Close() {
	close(eb.done)
	eb.kafkaWriter.Close()
}

// HTTP Server
type Server struct {
	batcher *EventBatcher
}

func (s *Server) handleEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var event LLMEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validation
	if event.TraceID == uuid.Nil {
		http.Error(w, "trace_id required", http.StatusBadRequest)
		return
	}
	if event.SpanID == uuid.Nil {
		http.Error(w, "span_id required", http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	s.batcher.AddEvent(event)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}

func (s *Server) handleBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var events []LLMEvent
	if err := json.NewDecoder(r.Body).Decode(&events); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	for _, event := range events {
		if event.Timestamp.IsZero() {
			event.Timestamp = time.Now()
		}
		s.batcher.AddEvent(event)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "accepted",
		"count":   len(events),
	})
}

// IngestPayload represents a flexible ingested event payload
type IngestPayload struct {
	TraceID              string   `json:"trace_id"`
	SpanID               string   `json:"span_id"`
	ParentSpanID         *string  `json:"parent_span_id,omitempty"`
	Timestamp            string   `json:"timestamp"`
	AgentID              string   `json:"agent_id"`
	AgentName            string   `json:"agent_name"`
	Model                string   `json:"model"`
	ModelName            string   `json:"model_name"`
	Provider             string   `json:"provider"`
	Tokens               int      `json:"tokens"`
	PromptTokens         int      `json:"prompt_tokens"`
	CompletionTokens     int      `json:"completion_tokens"`
	Cost                 float64  `json:"cost"`
	CostUSD              float64  `json:"cost_usd"`
	LatencyMs            int      `json:"latency_ms"`
	StatusCode           int      `json:"status_code"`
	Status               string   `json:"status"`
	ErrorCode            *string  `json:"error_code,omitempty"`
	ErrorMessage         *string  `json:"error_message,omitempty"`
	RequestText          *string  `json:"request_text,omitempty"`
	ResponseText         *string  `json:"response_text,omitempty"`
	ProbableLoop         bool     `json:"probable_loop"`
	PromptInjectionScore float64  `json:"prompt_injection_score"`
}

func (s *Server) handleIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var p IngestPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	event := LLMEvent{
		AgentID:              p.AgentID,
		Model:                p.Model,
		Provider:             p.Provider,
		PromptTokens:         p.PromptTokens,
		CompletionTokens:     p.CompletionTokens,
		CostUSD:              p.CostUSD,
		LatencyMs:            p.LatencyMs,
		Status:               p.Status,
		ErrorCode:            p.ErrorCode,
		ErrorMessage:         p.ErrorMessage,
		RequestText:          p.RequestText,
		ResponseText:         p.ResponseText,
		ProbableLoop:         p.ProbableLoop,
		PromptInjectionScore: p.PromptInjectionScore,
	}

	if event.AgentID == "" {
		event.AgentID = p.AgentName
	}
	if event.AgentID == "" {
		event.AgentID = "default-agent"
	}
	if event.Model == "" {
		event.Model = p.ModelName
	}
	if event.Model == "" {
		event.Model = "unknown-model"
	}
	if event.Provider == "" {
		event.Provider = "local"
	}
	if event.CostUSD == 0 && p.Cost > 0 {
		event.CostUSD = p.Cost
	}
	if event.PromptTokens == 0 && event.CompletionTokens == 0 && p.Tokens > 0 {
		event.PromptTokens = (p.Tokens * 3) / 4
		event.CompletionTokens = p.Tokens - event.PromptTokens
	}
	if event.Status == "" {
		if p.StatusCode != 0 {
			if p.StatusCode >= 200 && p.StatusCode < 300 {
				event.Status = "success"
			} else {
				event.Status = "error"
			}
		} else {
			event.Status = "success"
		}
	}

	// UUID parsing
	if p.TraceID != "" {
		if u, err := uuid.Parse(p.TraceID); err == nil {
			event.TraceID = u
		}
	}
	if event.TraceID == uuid.Nil {
		event.TraceID = uuid.New()
	}

	if p.SpanID != "" {
		if u, err := uuid.Parse(p.SpanID); err == nil {
			event.SpanID = u
		}
	}
	if event.SpanID == uuid.Nil {
		event.SpanID = uuid.New()
	}

	if p.ParentSpanID != nil && *p.ParentSpanID != "" {
		if u, err := uuid.Parse(*p.ParentSpanID); err == nil {
			event.ParentSpanID = &u
		}
	}

	if p.Timestamp != "" {
		if t, err := time.Parse(time.RFC3339, p.Timestamp); err == nil {
			event.Timestamp = t
		}
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	s.batcher.AddEvent(event)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "accepted",
		"trace_id": event.TraceID.String(),
		"span_id":  event.SpanID.String(),
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func main() {
	// Connect to database
	dbURL := "postgres://observer:observer_pass@localhost:5432/llm_events?sslmode=disable"
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to TimescaleDB")

	// Create batcher
	batcher := NewEventBatcher("localhost:9092", db)
	defer batcher.Close()

	// Setup HTTP server
	server := &Server{batcher: batcher}

	http.HandleFunc("/api/v1/event", server.handleEvent)
	http.HandleFunc("/api/v1/batch", server.handleBatch)
	http.HandleFunc("/ingest", server.handleIngest)
	http.HandleFunc("/health", server.handleHealth)

	log.Println("Starting collection service on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
