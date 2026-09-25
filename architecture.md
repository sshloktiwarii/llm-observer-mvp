# LLM Observer MVP Architecture

## Overview
LLM Observer MVP is a real-time observability platform for monitoring AI agent interactions with Large Language Models (LLMs). It tracks token consumption, costs, latency, and detects anomalies like execution loops and prompt injection attacks.

## High-Level Components

```
App Code
   ↓
[LLM Observer SDK] (Python/Go/Node.js)
   ↓
[Collection Service] (Go, batching)
   ↓ (HTTP POST)
[Event Storage]
   ├→ Redpanda (Kafka topic: llm-events)
   └→ TimescaleDB (direct insert)
   ↓
[Grafana] (visualization)
```

## Detailed Component Description

### 1. Application Instrumentation (SDK)
- **Language Support**: Python (primary), with examples for Go/Node.js
- **Functionality**: 
  - Wraps LLM API calls to capture metadata
  - Tracks prompt tokens, completion tokens, latency, costs
  - Generates unique trace/span IDs for request correlation
  - Sends events to Collection Service via HTTP

### 2. Collection Service
- **Language**: Go
- **Responsibilities**:
  - HTTP endpoint for receiving events (`/api/v1/event`, `/api/v1/batch`)
  - Event batching to reduce network calls (100x reduction)
  - Basic validation and enrichment of events
  - Forwarding to storage layers (Redpanda and TimescaleDB)
  - Health check endpoint (`/health`)

### 3. Event Storage Layer
#### Redpanda (Apache Kafka Compatible)
- **Purpose**: Stream processing buffer for real-time analytics
- **Topic**: `llm-events`
- **Retention**: Configurable (default: 7 days)
- **Partitioning**: Enables parallel consumption

#### TimescaleDB
- **Purpose**: Optimized time-series database for metrics and alerts
- **Tables**:
  - `llm_events`: Raw event data
  - `hourly_costs`: Aggregated cost metrics
  - `latency_percentiles`: Performance metrics
  - `potential_loops`: Detected execution loops
  - `config`: Alert thresholds and settings
- **Features**:
  - Automatic partitioning by time
  - Continuous aggregates for efficient querying
  - Built-in time-series optimization functions

### 4. Visualization & Alerting
- **Platform**: Grafana
- **Data Source**: TimescaleDB
- **Dashboards**:
  - Real-time cost monitoring
  - Latency and throughput metrics
  - Error rates and status codes
  - Loop detection alerts
  - Token consumption trends

## Data Flow

1. **Event Generation**:
   - Application makes LLM call via SDK
   - SDK captures: trace_id, span_id, agent_id, model, provider, token counts, latency, cost, status
   - Event JSON sent to Collection Service

2. **Collection & Batching**:
   - Service receives events via HTTP POST
   - Events buffered in memory batch (size/time based)
   - Batch flushed to storage when threshold reached

3. **Storage Persistence**:
   - Events written to Redpanda topic for stream processing
   - Events inserted directly into TimescaleDB for querying
   - Both writes happen asynchronously for performance

4. **Processing & Visualization**:
   - TimescaleDB continuous aggregates update materialized views
   - Grafana queries materialized views for dashboards
   - Alert rules trigger on threshold breaches

## Scalability Characteristics

- **Collection Service**: Handles 1K-10K events/sec per instance
- **Batching**: Reduces storage writes by ~100x
- **TimescaleDB**: Optimized for billions of time-series rows
- **Redpanda**: Horizontally scalable for stream processing
- **Stateless**: Collection service can be scaled horizontally

## Failure Modes & Resilience

- **Collection Service Downtime**: SDKs implement retry with exponential backoff
- **Storage Issues**: Events buffered in memory until recovery
- **Network Partitions**: SDKs queue events locally when service unreachable
- **Data Loss**: Dual-write to Redpanda and TimescaleDB provides redundancy

## Security Considerations

- **In Transit**: HTTPS recommended for SDK to Collection Service
- **At Rest**: TimescaleDB encryption configurable
- **Access Control**: Database credentials managed via environment
- **PII**: SDK designed to avoid capturing prompt/completion content by default

## Technology Choices Rationale

- **Go for Collection Service**: High concurrency, low latency, efficient memory usage
- **Python SDK**: Wide LLM library compatibility, ease of integration
- **TimescaleDB**: Purpose-built for time-series, SQL familiarity, rich ecosystem
- **Redpanda**: Kafka compatibility with simpler operational model
- **Grafana**: Rich visualization, alerting, and plugin ecosystem

