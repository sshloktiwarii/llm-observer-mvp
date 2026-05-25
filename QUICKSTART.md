# LLM Observer MVP - Quick Reference

## 🚀 Get Started in 5 Minutes

### 1. Start Infrastructure
```bash
cd llm-observer-mvp
docker-compose up -d
```

### 2. Initialize Database
```bash
docker exec timescaledb psql -U observer -d llm_events -f /dev/stdin < init_schema.sql
```

### 3. Run Collection Service
```bash
go mod download
go run main.go
```

### 4. Send Test Events
```bash
pip install requests
python example_usage.py
```

### 5. View Dashboard
Open http://localhost:3000 (admin/admin)

---

## 📊 Core Queries

### Cost Analysis
```sql
-- Cost by agent (last 24h)
SELECT hour, agent_id, total_cost, request_count
FROM hourly_costs 
WHERE hour > NOW() - INTERVAL '24 hours'
ORDER BY total_cost DESC;

-- Daily total cost
SELECT DATE(hour) as day, SUM(total_cost) as daily_cost
FROM hourly_costs
GROUP BY DATE(hour)
ORDER BY day DESC;
```

### Performance Metrics
```sql
-- Latency p50/p95/p99 by agent
SELECT window, agent_id, p50_ms, p95_ms, p99_ms, request_count
FROM latency_percentiles
WHERE window > NOW() - INTERVAL '1 hour'
ORDER BY window DESC;

-- Slowest requests
SELECT agent_id, model, latency_ms, cost_usd
FROM llm_events
WHERE status = 'success'
ORDER BY latency_ms DESC
LIMIT 10;
```

### Error Tracking
```sql
-- Error rate by agent
SELECT agent_id, status, COUNT(*) as count
FROM llm_events
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY agent_id, status;

-- Error breakdown
SELECT hour, error_code, COUNT(*) as count
FROM error_stats
WHERE hour > NOW() - INTERVAL '24 hours'
ORDER BY count DESC;
```

### Loop Detection
```sql
-- Detect execution loops
SELECT window, agent_id, request_count, repetition_pct
FROM potential_loops
WHERE repetition_pct > 50
ORDER BY window DESC;

-- Manual loop detection
SELECT trace_id, COUNT(*) as requests, COUNT(DISTINCT request_text) as unique
FROM llm_events
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY trace_id
HAVING COUNT(*) > COUNT(DISTINCT request_text)
ORDER BY requests DESC;
```

### Token Analysis
```sql
-- Token usage by agent
SELECT agent_id, 
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  AVG(prompt_tokens + completion_tokens) as avg_tokens
FROM llm_events
WHERE time > NOW() - INTERVAL '1 day'
GROUP BY agent_id
ORDER BY total_prompt_tokens DESC;

-- Cost per token
SELECT agent_id,
  SUM(cost_usd) / (SUM(prompt_tokens) + SUM(completion_tokens)) as cost_per_token
FROM llm_events
WHERE time > NOW() - INTERVAL '1 day' AND status = 'success'
GROUP BY agent_id;
```

---

## 🔌 API Endpoints

### Send Single Event
```bash
POST /api/v1/event
Content-Type: application/json

{
  "trace_id": "uuid",
  "span_id": "uuid",
  "agent_id": "string",
  "model": "gpt-4",
  "provider": "openai",
  "prompt_tokens": 100,
  "completion_tokens": 50,
  "cost_usd": 0.0042,
  "latency_ms": 1240,
  "status": "success"
}
```

### Send Batch
```bash
POST /api/v1/batch
Content-Type: application/json

[
  { event1 },
  { event2 },
  ...
]
```

### Health Check
```bash
GET /health
# Returns: {"status":"healthy"}
```

---

## 🐍 Python SDK

### Basic Usage
```python
from llm_observer import LLMObserver
import uuid

observer = LLMObserver(collection_service_url="http://localhost:8080")

observer.track_llm_call(
    trace_id=str(uuid.uuid4()),
    agent_id="my-agent",
    model="gpt-4",
    provider="openai",
    prompt_tokens=100,
    completion_tokens=50,
    cost_usd=0.0042,
    latency_ms=1240,
    status="success",
    request_text="What is 2+2?",
    response_text="4"
)
```

### Multi-Step Tracking
```python
trace_id = str(uuid.uuid4())

# Step 1
observer.track_llm_call(
    trace_id=trace_id,
    span_id=step1_id,
    agent_id="research-agent",
    ...
)

# Step 2 (links to Step 1)
observer.track_llm_call(
    trace_id=trace_id,
    span_id=step2_id,
    parent_span_id=step1_id,  # Establishes relationship
    agent_id="research-agent",
    ...
)
```

---

## 📈 Docker Commands

### View Logs
```bash
docker-compose logs -f redpanda
docker-compose logs -f timescaledb
docker-compose logs -f grafana
```

### Connect to Database
```bash
PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events
```

### Stop/Start Services
```bash
docker-compose stop      # Stop
docker-compose start     # Start
docker-compose restart   # Restart
docker-compose down      # Stop and remove
docker-compose down -v   # Stop, remove, delete volumes
```

---

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| Collection service won't start | Check database connection: `psql -h localhost -U observer -d llm_events -c "SELECT 1;"` |
| No data in Grafana | 1. Send test event: `curl http://localhost:8080/health` 2. Check database: `SELECT COUNT(*) FROM llm_events;` 3. Refresh views: `REFRESH MATERIALIZED VIEW hourly_costs;` |
| Port conflicts | Edit `docker-compose.yml` and change ports (e.g., 3000:3000 → 3001:3000) |
| Database locked | Restart TimescaleDB: `docker-compose restart timescaledb` |
| High latency | Increase batch size in `main.go`: `maxEvents: 5000` |

---

## 📚 Configuration

Edit thresholds in database:
```sql
SELECT * FROM config;

UPDATE config SET value = '50' WHERE key = 'cost_alert_hourly_usd';
UPDATE config SET value = '10000' WHERE key = 'latency_alert_p95_ms';
UPDATE config SET value = '80' WHERE key = 'loop_repetition_threshold_pct';
```

---

## 🎯 Features in MVP

✅ Cost tracking by agent, model, provider  
✅ Latency percentiles (p50, p95, p99)  
✅ Token consumption tracking  
✅ Error rate tracking  
✅ Loop detection (repetitive prompts)  
✅ Materialized views for fast aggregations  
✅ Python SDK for easy integration  
✅ Grafana dashboards  
✅ HTTP API for all data  

---

## 📋 Phase 2 Roadmap

- ML-based anomaly detection (Isolation Forest)
- Hallucination scoring
- Prompt injection detection
- Multi-tenancy & RBAC
- Slack/PagerDuty alerts
- Custom alert builder UI
- Kubernetes deployment
- ClickHouse support for 1B+ events

---

## 📞 Support

- **Docs**: See README.md, DEPLOYMENT.md, INTEGRATION.md
- **Issues**: GitHub Issues
- **Examples**: example_usage.py
- **Health Check**: curl http://localhost:8080/health
