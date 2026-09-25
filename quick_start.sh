#!/bin/bash
# Quick start script for LLM Observer MVP

set -e

echo "🚀 LLM Observer - Quick Start"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✓ Docker found"

# Start infrastructure
echo ""
echo "📦 Starting infrastructure (Redpanda, TimescaleDB, Grafana)..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Initialize database
echo "📊 Initializing TimescaleDB schema..."
docker exec timescaledb psql -U observer -d llm_events -f /dev/stdin < init_schema.sql 2>/dev/null || echo "(Schema may already exist)"

echo ""
echo "✅ Infrastructure ready!"
echo ""
echo "📍 Service URLs:"
echo "  - TimescaleDB:  postgres://observer:observer_pass@localhost:5432/llm_events"
echo "  - Redpanda:     localhost:9092"
echo "  - Grafana:      http://localhost:3000 (admin/admin)"
echo "  - PgAdmin:      http://localhost:5050 (admin@local.com/admin)"
echo ""
echo "🚀 Next steps:"
echo "  1. Build collection service: go mod download && go run main.go"
echo "  2. Test with: python example_usage.py"
echo "  3. View dashboards: http://localhost:3000"
echo ""
echo "📖 For more info, see README.md"
