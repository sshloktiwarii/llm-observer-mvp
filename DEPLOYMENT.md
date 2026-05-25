# Deployment Guide - LLM Observer MVP

## Local Development Setup

This guide covers deploying LLM Observer locally for development and testing.

### Prerequisites

- Docker & Docker Compose 1.29+
- Go 1.21+ (for collection service)
- Python 3.9+ (for SDK and examples)
- Git

### Step 1: Clone Repository

```bash
git clone https://github.com/Shlok04423/llm-observer-mvp.git
cd llm-observer-mvp
```

### Step 2: Start Infrastructure (Docker Compose)

```bash
# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps
```

**Services started:**
- **Redpanda** (Kafka): Port 9092 (Kafka protocol), 9644 (Admin)
- **TimescaleDB**: Port 5432 (PostgreSQL)
- **Grafana**: Port 3000
- **PgAdmin**: Port 5050

### Step 3: Initialize Database

```bash
# Option A: Using Docker exec
docker exec timescaledb psql -U observer -d llm_events -f /dev/stdin < init_schema.sql

# Option B: Using psql (if installed locally)
PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events -f init_schema.sql

# Option C: Using PgAdmin UI
# Go to http://localhost:5050 and execute init_schema.sql in the query tool
```

**What this does:**
- Creates `llm_events` hypertable (time-series optimized)
- Creates indexes for fast queries
- Creates materialized views for aggregations (hourly costs, latency percentiles, error stats, loops)
- Inserts default configuration values

### Step 4: Build & Run Collection Service

```bash
# Download dependencies
go mod download

# Run collection service
go run main.go

# You should see:
# Connected to TimescaleDB
# Starting collection service on :8080
```

The collection service:
- Listens on `http://localhost:8080`
- Batches events every 100ms or 1000 events
- Writes to both Redpanda (Kafka) and TimescaleDB
- Non-blocking: 2-second timeout for database writes

### Step 5: Send Test Events

**Using cURL:**
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
    "status": "success",
    "request_text": "What is 2+2?",
    "response_text": "4"
  }'
```

**Using Python SDK:**
```bash
pip install requests
python example_usage.py
```

### Step 6: View Data in Grafana

1. Open http://localhost:3000 (admin/admin)
2. Add PostgreSQL data source:
   - Go to Configuration → Data Sources → Add data source → PostgreSQL
   - **Host**: `timescaledb:5432`
   - **Database**: `llm_events`
   - **User**: `observer`
   - **Password**: `observer_pass`
   - **SSL Mode**: `disable`
   - Click **Save & test**

3. Create dashboards or use SQL queries directly:

```sql
-- Cost by agent (hourly)
SELECT hour, agent_id, total_cost 
FROM hourly_costs 
WHERE hour > NOW() - INTERVAL '24 hours'
ORDER BY hour DESC;

-- Latency percentiles
SELECT window, agent_id, p50_ms, p95_ms, p99_ms 
FROM latency_percentiles
WHERE window > NOW() - INTERVAL '1 hour'
ORDER BY window DESC;

-- Error statistics
SELECT hour, agent_id, status, error_code, error_count
FROM error_stats
WHERE hour > NOW() - INTERVAL '24 hours'
ORDER BY hour DESC, error_count DESC;

-- Detect loops
SELECT window, agent_id, request_count, unique_prompts, repetition_pct
FROM potential_loops
WHERE repetition_pct > 50
ORDER BY window DESC;
```

---

## Monitoring & Verification

### Check Service Health

```bash
# Collection service
curl http://localhost:8080/health
# Response: {"status":"healthy"}

# Redpanda
docker exec redpanda rpk cluster info

# TimescaleDB
PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events -c "SELECT COUNT(*) FROM llm_events;"
```

### View Logs

```bash
# Collection service (running in foreground)
# Ctrl+C to stop

# Docker containers
docker logs redpanda
docker logs timescaledb
docker logs grafana
docker logs pgadmin

# Real-time
docker-compose logs -f
```

### Database Queries

```bash
# Connect to database
PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events

# View schema
\dt llm_events
\dv  # List views

# Sample queries
SELECT COUNT(*) FROM llm_events;
SELECT DISTINCT agent_id FROM llm_events;
SELECT * FROM hourly_costs LIMIT 5;
```

---

## Troubleshooting

### Cannot connect to collection service

```bash
# Check if service is running
lsof -i :8080

# Restart service
# Kill process (Ctrl+C in terminal)
go run main.go
```

### Cannot connect to database

```bash
# Check if TimescaleDB is running
docker ps | grep timescaledb

# View logs
docker logs timescaledb

# Restart
docker-compose restart timescaledb

# Recreate (will lose data)
docker-compose down
docker volume rm llm-observer-mvp_timescale_data
docker-compose up -d
```

### No data appearing in Grafana

1. **Verify events are being sent:**
   ```bash
   curl http://localhost:8080/health
   # Should return: {"status":"healthy"}
   ```

2. **Check database has data:**
   ```bash
   PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events \
     -c "SELECT COUNT(*) FROM llm_events;"
   ```

3. **Verify Grafana data source:**
   - Go to http://localhost:3000
   - Configuration → Data Sources
   - Click PostgreSQL data source
   - Click **Save & test**
   - Should see: "Database Connection OK"

4. **Check materialized views are refreshed:**
   ```bash
   PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events \
     -c "REFRESH MATERIALIZED VIEW hourly_costs;"
   ```

### Port conflicts

If ports 3000, 5050, 5432, or 9092 are in use:

```bash
# Edit docker-compose.yml and change ports
# Example: change 3000:3000 to 3001:3000

docker-compose down
docker-compose up -d
```

---

## Performance Tuning

### TimescaleDB

- **Chunk interval**: Currently 1 day. For high volume, reduce to 1 hour:
  ```sql
  SELECT set_chunk_time_interval('llm_events', INTERVAL '1 hour');
  ```

- **Compression**: Enable for older chunks:
  ```sql
  ALTER TABLE llm_events SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'time DESC'
  );
  SELECT add_compression_policy('llm_events', INTERVAL '1 day');
  ```

### Collection Service

- **Batch size**: Adjust `maxEvents` in `main.go` (default: 1000)
- **Flush interval**: Adjust `flushInterval` (default: 100ms)
- **Parallel writes**: Run multiple collection service instances with load balancer

---

## Cleanup

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (delete data)
docker-compose down -v

# Restart fresh
docker-compose up -d
```

---

## Next Steps

1. **Integrate SDK into your agent**: Use `llm_observer.py` as template
2. **Set cost thresholds**: Update `config` table in database
3. **Create alerts**: Implement webhook handlers in `anomaly_detector.py`
4. **Monitor production**: Deploy collection service to production environment
