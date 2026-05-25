package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
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
		Compression: kafka.Gzip,
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
	http.HandleFunc("/health", server.handleHealth)

	log.Println("Starting collection service on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
