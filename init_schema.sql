-- Initialize TimescaleDB schema for LLM event tracking

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Main events table
CREATE TABLE IF NOT EXISTS llm_events (
  time TIMESTAMPTZ NOT NULL,
  trace_id UUID NOT NULL,
  span_id UUID NOT NULL,
  parent_span_id UUID,
  agent_id TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  
  -- Request metrics
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  
  -- Costs (in USD)
  cost_usd DECIMAL(10, 6) NOT NULL,
  
  -- Latency (in milliseconds)
  latency_ms INT NOT NULL,
  
  -- Status and errors
  status TEXT NOT NULL DEFAULT 'success',
  error_code TEXT,
  error_message TEXT,
  
  -- Request/Response text (truncated for security)
  request_text TEXT,
  response_text TEXT,
  
  -- Flags
  probable_loop BOOLEAN DEFAULT FALSE,
  prompt_injection_score DECIMAL(3, 2) DEFAULT 0,
  
  PRIMARY KEY (time, trace_id, span_id)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('llm_events', 'time', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_llm_events_agent ON llm_events (agent_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_llm_events_provider ON llm_events (provider, time DESC);
CREATE INDEX IF NOT EXISTS idx_llm_events_trace ON llm_events (trace_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_llm_events_status ON llm_events (status, time DESC);

-- Cost tracking aggregates (continuous aggregate)
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_costs AS
SELECT 
  time_bucket('1 hour', time) AS hour,
  agent_id,
  provider,
  COUNT(*) as request_count,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency_ms,
  MAX(latency_ms) as max_latency_ms,
  MIN(latency_ms) as min_latency_ms
FROM llm_events
WHERE status = 'success'
GROUP BY hour, agent_id, provider;

-- Performance metrics aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS latency_percentiles AS
SELECT 
  time_bucket('5 minutes', time) AS window,
  agent_id,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_ms,
  COUNT(*) as request_count
FROM llm_events
WHERE status = 'success'
GROUP BY window, agent_id;

-- Error tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS error_stats AS
SELECT 
  time_bucket('1 hour', time) AS hour,
  agent_id,
  status,
  error_code,
  COUNT(*) as error_count
FROM llm_events
WHERE status != 'success'
GROUP BY hour, agent_id, status, error_code;

-- Loop detection tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS potential_loops AS
SELECT 
  time_bucket('10 minutes', time) AS window,
  trace_id,
  agent_id,
  COUNT(*) as request_count,
  COUNT(DISTINCT request_text) as unique_prompts,
  ROUND(100.0 * (COUNT(*) - COUNT(DISTINCT request_text)) / COUNT(*), 2) as repetition_pct
FROM llm_events
GROUP BY window, trace_id, agent_id
HAVING COUNT(*) >= 5;

-- Configuration table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert thresholds
INSERT INTO config (key, value) VALUES 
  ('cost_alert_hourly_usd', '10.00'),
  ('latency_alert_p95_ms', '5000'),
  ('error_rate_threshold_pct', '10'),
  ('loop_detection_min_requests', '5'),
  ('retention_days', '30')
ON CONFLICT (key) DO NOTHING;
