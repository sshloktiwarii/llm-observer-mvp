#!/bin/bash

echo "🚀 Booting LLM Observer MVP..."

# 1. Ensure Docker Desktop is running
if ! docker info > /dev/null 2>&1; then
    echo "🐳 Starting Docker Desktop (this may take a few seconds)..."
    open -a Docker
    while ! docker info > /dev/null 2>&1; do sleep 2; done
fi

# 2. Spin up Redpanda, TimescaleDB, and Grafana
echo "📦 Starting infrastructure..."
docker-compose up -d

# 3. Wait for TimescaleDB to be ready and inject the schema
echo "🗄️ Waiting for database to accept connections..."
while ! docker exec timescaledb pg_isready -U observer > /dev/null 2>&1; do sleep 2; done
echo "⚙️ Injecting SQL schema..."
docker exec -i timescaledb psql -U observer -d llm_events < init_schema.sql

# 4. Install Go if missing
if ! command -v go &> /dev/null; then
    echo "🐹 Installing Go..."
    brew install go
fi

# 5. Start the Go collection service in the background
echo "⚡ Starting the Go backend on port 8080..."
go mod download
go run main.go &
GO_PID=$!

# 6. Open Grafana in the default browser
echo "📈 Opening Dashboard..."
sleep 2
open http://localhost:3000

echo "✅ System is live! (Grafana: admin/admin)"
echo "🛑 Press Ctrl+C to shut down the Go server."

# Keep script running to hold the Go server open
wait $GO_PID
