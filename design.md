# LLM Observer MVP Design Document

## Design Goals

1. **Low Overhead**: Minimal performance impact on instrumented applications
2. **High Reliability**: Never lose observability data due to transient failures
3. **Scalability**: Handle enterprise-scale LLM usage patterns
4. **Extensibility**: Easy to add new metrics, detectors, and integrations
5. **Operational Simplicity**: Straightforward deployment, monitoring, and maintenance

## Detailed Design Decisions

### 1. SDK Design

#### Event Structure
```json
{
  "trace_id": "string (UUID v4)",
  "span_id": "string (UUID v4)", 
  "agent_id": "string (identifier for the AI agent)",
  "model": "string (model identifier, e.g., 'gpt-4')",
  "provider": "string (llm provider, e.g., 'openai')",
  "prompt_tokens": "integer",
  "completion_tokens": "integer", 
  "cost_usd": "float (estimated cost in USD)",
  "latency_ms": "integer (round-trip time)",
  "status": "string (success/error)",
  "timestamp": "ISO 8601 timestamp",
  "metadata": "object (optional custom fields)"
}
```

#### Key Design Choices
- **Async Non-Blocking**: SDK queues events and sends via background thread
- **Batching at Source**: SDK batches events before network transmission when possible
- **Failure Buffering**: Local disk queue if Collection Service unreachable (configurable size)
- **Zero-Content Collection**: By design, SDK does not capture actual prompt/completion text to avoid PII/security issues
- **Version Negotiation**: SDK and Collection Service communicate via versioned API

### 2. Collection Service Design

#### Architecture
```
[HTTP Server] → [Request Validator] → [Batcher] → [Storage Workers]
                                   ↓
                            [Health Monitor]
```

#### Core Components

**HTTP Server** (net/http with custom middleware)
- POST `/api/v1/event` - Single event ingestion
- POST `/api/v1/batch` - Batch event ingestion (array of events)
- GET `/health` - Service liveness and readiness
- GET `/metrics` - Prometheus metrics endpoint

**Request Validator**
- Schema validation using go-playground/validator
- Rate limiting per agent_id (configurable)
- Size limits on individual events and batches
- Authentication via API key (optional, future enhancement)

**Batcher**
- Time-based flushing: Every 5 seconds
- Size-based flushing: 1000 events or 1MB
- Memory-safe: Uses sync.Pool for event allocation
- Persistent queue: BoltDB-backed queue for crash recovery

**Storage Workers**
- Redpanda Producer: Async, batched writes with compression
- TimescaleDB Client: Connection pooling, prepared statements
- Error Handling: Dead letter queue for failed events (configurable retry)
- Monitoring: Export processing lag and error rates

#### Concurrency Model
- Worker pool pattern for storage workers
- Separate goroutines for each storage backend
- Channel-based communication between components
- Context cancellation for graceful shutdown

### 3. Storage Schema Design

#### TimescaleDB Tables

**llm_events** (Raw Events)
```sql
CREATE TABLE llm_events (
    time TIMESTAMPTZ NOT NULL,
    trace_id UUID NOT NULL,
    span_id UUID NOT NULL,
    agent_id TEXT NOT NULL,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
    cost_usd DOUBLE PRECISION,
    latency_ms INTEGER,
    status TEXT,
    metadata JSONB,
    PRIMARY KEY (time, trace_id)
);

SELECT create_hypertable('llm_events', 'time', chunk_time_interval => INTERVAL '1 day');
```

**Indexes for Common Queries**
```sql
CREATE INDEX idx_llm_events_agent_time ON llm_events (agent_id, time DESC);
CREATE INDEX idx_llm_events_model ON llm_events (model);
CREATE INDEX idx_llm_events_status ON llm_events (status);
```

**hourly_costs** (Materialized View)
```sql
CREATE MATERIALIZED VIEW hourly_costs
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    agent_id,
    SUM(cost_usd) AS total_cost,
    SUM(prompt_tokens) AS total_prompt_tokens,
    SUM(completion_tokens) AS total_completion_tokens,
    COUNT(*) AS request_count
FROM llm_events
GROUP BY hour, agent_id;
```

**latency_percentiles** (Materialized View)
```sql
CREATE MATERIALIZED VIEW latency_percentiles
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', time) AS window,
    agent_id,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_ms,
    AVG(latency_ms) AS avg_latency_ms
FROM llm_events
WHERE status = 'success'
GROUP BY window, agent_id;
```

#### Redpanda Topic Configuration
- Topic: `llm-events`
- Partitions: 6 (aligns with consumer group size)
- Replication Factor: 3 (for durability)
- Retention: 7 days (bytes: -1, time: 604800000 ms)
- Compression: snappy
- Cleanup Policy: delete
- Segment Bytes: 256MB

### 4. Anomaly Detection Design

#### Loop Detection Algorithm
```
For each agent_id in time window:
    1. Group requests by trace_id
    2. For each trace, calculate:
        - request_count: Number of spans in trace
        - unique_span_count: Distinct span_id values
        - repetition_pct = (1 - unique_span_count / request_count) * 100
    3. Flag trace as potential loop if:
        - repetition_pct > threshold (default: 50%)
        - request_count > min_requests (default: 3)
```

#### Design Choices
- **Sliding Window**: 1-hour tumbling window for batch processing
- **Efficient Calculation**: Uses SQL window functions and approximate distinct counts
- **Configurable Thresholds**: Per-agent or global settings
- **Low False Positives**: Requires minimum request count before flagging

#### Prompt Injection Detection (Future - Phase 2)
- **Approach**: Statistical anomaly detection on token patterns
- **Features**: 
  - Sudden increases in special token frequency
  - Deviations from established prompt structure
  - Embedding-based similarity to known attack patterns
- **Model**: Isolation Forest or One-Class SVM (to be implemented)

### 5. API Design

#### Collection Service API
```
POST /api/v1/event
Content-Type: application/json

{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "span_id": "ba7b810-9dad-11d1-80b2-00c04fd430c8",
  "agent_id": "customer-support-bot",
  "model": "gpt-4",
  "provider": "openai",
  "prompt_tokens": 120,
  "completion_tokens": 45,
  "cost_usd": 0.0082,
  "latency_ms": 1240,
  "status": "success"
}

Response:
202 Accepted
{
  "accepted": true,
  "batch_id": "optional-batch-identifier"
}

POST /api/v1/batch
Content-Type: application/json

[
  {event1},
  {event2},
  ...
]

Response:
202 Accepted
{
  "accepted": true,
  "received_count": N,
  "batch_id": "batch-identifier"
}
```

#### SDK Interface (Python)
```python
from llm_observer import observe

@observe(
    agent_id="my-agent",
    model="gpt-4-turbo",
    provider="openai"
)
def call_llm(prompt):
    # Actual LLM call happens here
    return llm_client.complete(prompt)

# Manual instrumentation
observer = LLMObsverver(
    agent_id="my-agent",
    collector_url="http://localhost:8080"
)

with observer.trace("operation-name") as trace:
    trace.span("llm-call").record(
        model="gpt-4",
        prompt_tokens=100,
        completion_tokens=50,
        cost_usd=0.004,
        latency_ms=1200
    )
```

### 6. Deployment & Operations Design

#### Docker Compose Services
- **redpanda**: Single broker for development (production would use 3+)
- **timescaledb**: Single instance with tuning for time-series workloads
- **grafana**: Pre-provisioned with dashboards and datasource
- **collection-service**: The Go application (scalable horizontally)

#### Environment Configuration
```
COLLECTION_SERVICE_PORT=8080
REDPANADA_BROKERS=redpanda:9092
TIMESCALEDB_HOST=timescaledb
TIMESCALEDB_PORT=5432
TIMESCALEDB_DATABASE=llm_events
TIMESCALEDB_USER=observer
TIMESCALEDB_PASSWORD=observer_pass
BATCH_SIZE=1000
BATCH_INTERVAL=5s
REDPOLAND_TOPIC=llm-events
```

#### Monitoring & Health Checks
- **Service Health**: `/health` endpoint checks dependencies
- **Metrics**: Prometheus endpoint for:
  - Events received per second
  - Batch flush latency
  - Storage write errors
  - Queue depth
- **Logging**: Structured JSON logging with levels
- **Alerting**: 
  - Collection service downtime
  - High error rates in event processing
  - Storage lag exceeding thresholds
  - Disk space warnings

#### Backup & Disaster Recovery
- **TimescaleDB**: 
  - Logical backups via pg_dump
  - Point-in-time recovery via WAL archiving
  - Snapshots for chunk-level recovery
- **Configuration**: 
  - Infrastructure as Code (docker-compose, terraform)
  - Version-controlled schema migrations
- **Event Replay**: 
  - Redpanda retains events for reprocessing
  - Ability to rebuild materialized views from raw data

### 7. Extensibility Points

#### Adding New Metrics
1. Add fields to `LLEvent` struct in SDK
2. Update JSON schema validation in Collection Service
3. Add column to `llm_events` table
4. Update materialized views as needed
5. Add Grafana panel

#### New Detectors
1. Implement detector interface in Collection Service
2. Add configuration for sensitivity/threshholds
3. Store results in new table or existing metadata
4. Add alert rules in Grafana
5. Export via SDK if real-time feedback needed

#### Output Integrations
1. Webhook endpoints for custom alerts
2. Plugin architecture for third-party systems
3. Export to data lakes (S3, GCS) for batch analysis
4. Streaming exports via Redpanda consumer groups

## Performance Benchmarks

### Latency Targets
- SDK overhead: <2ms per call (99th percentile)
- Collection Service processing: <10ms per event (99th percentile)
- End-to-end visibility: <30 seconds

### Throughput Capacity
- Single Collection Service instance: 5K events/sec
- With horizontal scaling: Linear to node count
- TimescaleDB sustained write: 100K+ rows/sec on modest hardware

### Resource Usage
- Collection Service: ~50MB RAM, 2 CPU cores at 1K events/sec
- TimescaleDB: Scales with retention and query load
- Redpanda: Minimal overhead for passthrough mode

## Design Tradeoffs

### Consistency vs Availability
- **Choice**: Eventual consistency for better availability
- **Reason**: Observability tolerates brief delays; missing data is worse than late data
- **Implementation**: Async writes with retry and dead letter queues

### Data Completeness vs Performance
- **Choice**: Sample-based approach for very high volume (>100K events/sec)
- **Reason**: Prevents system overload during traffic spikes
- **Implementation**: Configurable sampling rate in SDK (100% by default)

### Feature Richness vs Simplicity
- **Choice**: MVP focuses on core observability; advanced features in Phase 2
- **Reason**: Faster time to market, validate core value proposition
- **Implementation**: Clean extension points for Phase 2 features

## Open Questions for Phase 2

1. **Adaptive Sampling**: Should sampling rate adjust based on system load?
2. **Tenant Isolation**: How to securely separate data between different teams/customers?
3. **Real-time Streaming**: Should we offer low-latency exports for SIEM integration?
4. **AI-powered Detectors**: What ML models provide best anomaly detection with minimal false positives?
5. **UI Customization**: How much dashboard customization should we empower users with?

