# LLM Observer MVP

Real-time observability and anomaly detection for AI agents. Monitor token consumption, costs, latency, and detect execution loops and prompt injection attacks.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Go 1.21+ (for collection service)
- Python 3.9+ (for SDK and examples)

### 1. Start Infrastructure

```bash
cd llm-observer
docker-compose up -d
```

This starts:
- **Redpanda** (Kafka): `localhost:9092`
- **TimescaleDB**: `localhost:5432` (user: observer, pass: observer_pass)
- **Grafana**: `http://localhost:3000` (admin/admin)
- **PgAdmin**: `http://localhost:5050` (admin@local.com/admin)

### 2. Initialize Database Schema

```bash
# Inside container
docker exec timescaledb psql -U observer -d llm_events -f /dev/stdin < init_schema.sql

# Or locally (if psql installed)
PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events -f init_schema.sql
```

### 3. Build & Run Collection Service

```bash
go mod download
go run main.go
```

The collection service listens on `:8080`:
- `POST /api/v1/event` - Single event
- `POST /api/v1/batch` - Batch of events
- `GET /health` - Health check

### 4. Test with Examples

**Python SDK:**
```bash
pip install requests
python example_usage.py
```

**cURL Test:**
```bash
curl -X POST http://localhost:8080/api/v1/event \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "span_id": "6ba7b810-9dad-11d1-80b2-00c04fd430c8",
    "agent_id": "test-agent",
    "model": "gpt-4",
    "provider": "openai",
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "cost_usd": 0.0042,
    "latency_ms": 1240,
    "status": "success"
  }'
```

### 5. View Dashboards

Open **Grafana**: http://localhost:3000 (admin/admin)

Add TimescaleDB data source:
- Host: `timescaledb`
- Database: `llm_events`
- User: `observer`
- Password: `observer_pass`

Query examples:
```sql
-- Hourly cost by agent (last 24h)
SELECT hour, agent_id, total_cost FROM hourly_costs 
WHERE hour > NOW() - INTERVAL '24 hours'
ORDER BY hour DESC;

-- Latency percentiles (last hour)
SELECT window, agent_id, p50_ms, p95_ms, p99_ms FROM latency_percentiles
WHERE window > NOW() - INTERVAL '1 hour'
ORDER BY window DESC;

-- Detect loops (requests with high repetition)
SELECT window, agent_id, request_count, repetition_pct FROM potential_loops
WHERE repetition_pct > 50
ORDER BY window DESC;
```

---

## Architecture

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

---

## Core Features (MVP)

✅ **Cost Tracking**
- Track cost per agent, model, provider
- Hourly aggregations
- Alert on cost thresholds

✅ **Performance Metrics**
- Latency percentiles (p50, p95, p99)
- Throughput (requests/sec)
- Token consumption tracking

✅ **Error Tracking**
- Status codes, error messages
- Error rates by agent
- Failure patterns

✅ **Loop Detection**
- Identify repeated requests in traces
- Repetition percentage calculation
- Alert on suspicious patterns

---

## Phase 2: Advanced Features (TBD)

- [ ] ML-based anomaly detection (Isolation Forest)
- [ ] Hallucination scoring
- [ ] Prompt injection detection
- [ ] Multi-tenancy & RBAC
- [ ] Slack/PagerDuty integrations
- [ ] Custom alert builder UI

---

## Troubleshooting

**Collection service can't connect to Kafka:**
```bash
docker exec redpanda rpk cluster info
```

**TimescaleDB connection refused:**
```bash
# Check DB is running
docker ps | grep timescaledb

# Connect directly
PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events -c "SELECT 1;"
```

**No data in Grafana:**
1. Verify events are being sent: `curl http://localhost:8080/health`
2. Check database has data: `SELECT COUNT(*) FROM llm_events;`
3. Ensure Grafana data source is correctly configured

---

## Performance Notes

- **Single collection service** handles 1K-10K events/sec
- **Batching reduces network calls** by ~100x
- **TimescaleDB** optimized for time-series: fast aggregations on billions of rows
- **Redpanda** for future stream processing (Phase 2)

---

## Files Overview

| File | Purpose |
|------|------|
| `docker-compose.yml` | Infrastructure setup (Redpanda, TimescaleDB, Grafana) |
| `init_schema.sql` | Database schema, indexes, materialized views |
| `main.go` | Collection service (HTTP listener + event batching) |
| `llm_observer.py` | Python SDK for app instrumentation |
| `http_interceptor.py` | Optional reverse proxy for LLM APIs |
| `example_usage.py` | Example tracking patterns |

---

## Next Steps

1. **Integrate SDK into your agent code** (Python SDK provided, Go/Node.js examples easy to build)
2. **Set cost alert thresholds** in config table
3. **Create custom dashboards** in Grafana
4. **Run example.py** to see data flow
5. **Monitor and refine** detection thresholds based on your workload

---

For questions or issues, check logs:
```bash
docker logs redpanda
docker logs timescaledb
docker logs grafana
```
