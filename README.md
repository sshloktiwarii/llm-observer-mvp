# LLM Observer

> Real-time, local-first LLM observability dashboard, telemetry ingestion pipeline, and multi-agent execution profiler.

LLM Observer provides real-time profiling, token economics tracking, latency heatmaps, and hierarchical trace visualization for local and cloud-based AI agent chains. Built with a local-first philosophy, all metrics and traces remain on your machine with zero external cloud dependencies.

---

## Architecture Stack

```
                              ┌──────────────────────────────────────────────┐
                              │           Host Application / Agents          │
                              └──────────────────────┬───────────────────────┘
                                                     │ (Async non-blocking spans)
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │   Python SDK (TraceLogger)  │
                                      └──────────────┬──────────────┘
                                                     │ HTTP POST /ingest
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Collection Service (Go :8080)                                    │
│                                Batching Engine & TCP Ingestion Gateway                                 │
└──────────────────────────────┬───────────────────────────────────────────┬─────────────────────────────┘
                               │                                           │
                               ▼                                           ▼
                 ┌───────────────────────────┐               ┌───────────────────────────┐
                 │  TimescaleDB (PostgreSQL) │               │   Redpanda (Kafka Bus)    │
                 │      Hypertables :5432    │               │     llm-events :9092      │
                 └─────────────┬─────────────┘               └───────────────────────────┘
                               │
                               ▼ (Dynamic Server Component Queries)
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              Next.js 14 App Router Frontend (:3000 / :3001)                            │
│  - Real-Time Token Economics & Cost Rollups           - Interactive Driver.js Onboarding Tour          │
│  - Live Trace Stream & Hierarchical Waterfall Viewer   - Dynamic Server-Side TCP System Health Grid     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: [Next.js 14 (App Router)](https://nextjs.org/) & [Tailwind CSS](https://tailwindcss.com/)
  - Pure React Server Components for sub-millisecond database queries.
  - Dark-mode minimal design with tailored zinc/indigo aesthetics and spring entrance micro-animations.
  - Interactive onboarding tour powered by [driver.js](https://driverjs.com/).
  - Dynamic System Health grid with real-time server-side TCP socket pinging.
  - Hierarchical Waterfall Trace visualizer for multi-step agent trajectories.
- **Ingestion Engine**: [Go](https://go.dev/) (`:8080`)
  - High-throughput asynchronous event ingestion gateway (`/ingest` and `/api/v1/event`).
  - Thread-safe micro-batching buffer flushing to disk and streaming bus.
- **Storage & Event Bus**: [Docker Compose](https://docs.docker.com/compose/)
  - **TimescaleDB** (`:5432`): PostgreSQL 14 time-series hypertable with automated continuous aggregates.
  - **Redpanda** (`:9092`): Kafka-compatible streaming event log.
  - **Grafana** (`:3000`): Secondary deep infrastructure and container monitoring dashboards.
- **Client SDK**: Python 3 Telemetry SDK (`sdk/telemetry.py`)
  - Background daemon worker thread with thread-safe queueing (`queue.Queue`).
  - Zero performance overhead on agent critical path (< 0.1ms non-blocking span submission).

---

## Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js 18+](https://nodejs.org/) & npm
- [Go 1.21+](https://go.dev/)
- [Python 3.9+](https://www.python.org/)

---

### Step 1: Spin Up the Infrastructure

Launch TimescaleDB, Redpanda, and Grafana in the background:

```bash
docker-compose up -d
```

Verify that all containers are healthy:
```bash
docker-compose ps
```

---

### Step 2: Initialize Database Schema

Inject the TimescaleDB hypertable schema, indexes, and continuous aggregates:

```bash
docker exec -i timescaledb psql -U observer -d llm_events < init_schema.sql
```

---

### Step 3: Start the Go Ingestion Engine

Launch the Go backend service on port `8080`:

```bash
go mod download
go run main.go
```

The server will log:
```text
Connected to TimescaleDB
Starting collection service on :8080
```

---

### Step 4: Run the Next.js Frontend Dashboard

In a new terminal window, start the Next.js development server:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or [http://localhost:3001](http://localhost:3001) if 3000 is occupied) in your browser.

---

### Step 5: Emit Sample Agent Telemetry

Run the included multi-step agent workflow simulation to populate the dashboard with realistic traces:

```bash
# Using your preferred Python environment (e.g. repo virtualenv)
./.venv/bin/python3 example_usage.py

# Or with system python
pip install requests
python3 example_usage.py
```

This simulates a 5-step autonomous software engineering pipeline:
1. **Customer Query Router** (`llama-3-8b` | 165 tokens | 142ms)
2. **Context Augmenter** (`llama-3-8b` | 380 tokens | 295ms)
3. **Code Synthesizer** (`qwen-2.5-coder` | 890 tokens | 1180ms)
4. **Code Reviewer** (`qwen-2.5-coder` | 420 tokens | 410ms)
5. **Response Formatter** (`llama-3-8b` | 230 tokens | 175ms)

---

## Python Telemetry SDK Usage

Install or import the lightweight SDK into your AI application:

```python
from sdk.telemetry import TraceLogger

# Initialize logger (defaults to http://localhost:8080/ingest)
logger = TraceLogger()

# Log spans asynchronously without blocking model execution
span = logger.log_span(
    agent_name="Code Synthesizer",
    model_name="qwen-2.5-coder",
    tokens=480,
    cost=0.00048,
    latency_ms=310,
    status_code=200,
    request_text="Write a Go HTTP health check probe.",
    response_text="func checkHealth() bool { ... }",
)

# Optional: Ensure all queued spans are delivered before exit
logger.flush()
```

### Context Linking for Multi-Step Chains

```python
import uuid
from sdk.telemetry import TraceLogger

logger = TraceLogger()
root_trace_id = str(uuid.uuid4())

# Step 1: Router
step1 = logger.log_span(
    agent_name="Router",
    model_name="llama-3-8b",
    tokens=120,
    cost=0.00012,
    latency_ms=95,
    trace_id=root_trace_id,
)

# Step 2: Worker linked to Step 1
step2 = logger.log_span(
    agent_name="Worker",
    model_name="qwen-2.5-coder",
    tokens=450,
    cost=0.00045,
    latency_ms=420,
    trace_id=root_trace_id,
    parent_span_id=step1["span_id"],
)
```

---

## Key Platform Features

### 1. Zero-Latency Asynchronous Telemetry
Spans are enqueued in-memory in `< 0.1ms` using a background daemon thread pool. Model inference threads never stall on network I/O or database round-trips.

### 2. Live Dynamic Polling & Fresh State
The dashboard bypasses Next.js static data cache using `export const dynamic = 'force-dynamic'` and real-time interval polling, ensuring incoming spans reflect instantaneously.

### 3. Server-Side TCP System Health Grid
The 2x2 health grid performs sub-second TCP socket probes directly from the server to `:8080` (Go), `:5432` (TimescaleDB), `:9092` (Redpanda), and `:3000` (Grafana), rendering real-time green glowing pulse indicators or dimmed red offline alerts.

### 4. Guided First-Time Onboarding Tour
Built with [driver.js](https://driverjs.com/), new visitors receive a contextual 4-step walkthrough of Token Economics, Live Trace Streams, Infrastructure Probes, and Data Purge controls. Can be replayed at any time via the **Tour** header button.

### 5. In-App Data Purging
Wipe recorded traces and reset local benchmarks on demand with the integrated **Purge Data** server action, revalidating cache instantly without requiring external database GUI tools.

---

## Repository Structure

```
llm-observer-mvp/
├── frontend/                  # Next.js 14 App Router Web Application
│   ├── src/app/page.tsx       # Main LLM Telemetry & Health Dashboard
│   ├── src/app/traces/        # Hierarchical Waterfall Trace Explorer
│   ├── src/components/        # Client controls, LiveRefresh, OnboardingTour
│   └── src/app/globals.css    # Tailwind CSS & Driver.js dark-mode theme
├── sdk/                       # Python Telemetry Client SDK
│   ├── __init__.py            # Package exports
│   └── telemetry.py           # TraceLogger async worker implementation
├── main.go                    # Go Ingestion Collector Service (:8080)
├── init_schema.sql            # TimescaleDB hypertables & materialized views
├── docker-compose.yml         # Container definitions (TimescaleDB, Redpanda, Grafana)
├── example_usage.py           # 5-step agent simulation script
├── start.sh                   # One-command bootstrapper script
└── README.md                  # System documentation
```

---

## License
MIT
