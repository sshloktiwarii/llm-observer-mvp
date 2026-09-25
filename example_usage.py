#!/usr/bin/env python3
"""Example Usage Script for LLM Observer Telemetry SDK.

Simulates a realistic multi-step autonomous agent workflow (Customer Query Router ->
Context Augmenter -> Code Synthesizer -> Code Reviewer -> Response Formatter)
using local models (qwen-2.5-coder, llama-3-8b) and logs telemetry spans asynchronously
to the local Go ingestion server at http://localhost:8080/ingest.

Usage:
    python3 example_usage.py
    # or with the virtual environment:
    ./.venv/bin/python3 example_usage.py
"""

from __future__ import annotations

import os
import sys
import time
import uuid
from pathlib import Path

# Ensure root directory is in sys.path so 'sdk.telemetry' can be imported cleanly
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from sdk.telemetry import TraceLogger
except ImportError:
    # Fallback to local import if executed from within sdk/
    from telemetry import TraceLogger


def run_agent_workflow() -> None:
    """Simulate a realistic 5-step autonomous software engineering workflow."""
    print("=" * 72)
    print("🚀 Initializing LLM Observer Multi-Agent Workflow Simulation")
    print("=" * 72)

    # Initialize the telemetry logger pointing to local Go backend
    ingest_url = os.getenv("OBSERVER_INGEST_URL", "http://localhost:8080/ingest")
    logger = TraceLogger(ingest_url=ingest_url)

    # Shared root trace identifier representing the overall user request chain
    trace_id = str(uuid.uuid4())
    print(f"\n[Trace Root] Trace ID: {trace_id}")
    print(f"[Target Svc] Backend Ingestion Endpoint: {ingest_url}\n")

    # Step 1: Customer Query Router (llama-3-8b)
    print("▶ [Step 1/5] Executing 'Customer Query Router' (Model: llama-3-8b)...")
    span1_id = str(uuid.uuid4())
    span1 = logger.log_span(
        agent_name="Customer Query Router",
        model_name="llama-3-8b",
        tokens=165,
        cost=0.000165,
        latency_ms=142,
        status_code=200,
        trace_id=trace_id,
        span_id=span1_id,
        parent_span_id=None,
        prompt_tokens=120,
        completion_tokens=45,
        request_text="User Request: 'Database pool exhaustion observed in high-concurrency ingestion service. Please analyze and patch.'",
        response_text="Action: Classified as [BACKEND_CONCURRENCY_BUG]. Dispatching to Context Augmenter for schema and pool diagnostic.",
    )
    print(f"  ✓ Logged span: {span1['span_id'][:8]}... (Tokens: {span1['tokens']}, Latency: {span1['latency_ms']}ms, Cost: ${span1['cost']:.6f})")
    time.sleep(0.05)  # Simulate brief processing delay

    # Step 2: Context & Retrieval Augmenter (llama-3-8b)
    print("▶ [Step 2/5] Executing 'Context Augmenter' (Model: llama-3-8b)...")
    span2_id = str(uuid.uuid4())
    span2 = logger.log_span(
        agent_name="Context Augmenter",
        model_name="llama-3-8b",
        tokens=380,
        cost=0.000380,
        latency_ms=295,
        status_code=200,
        trace_id=trace_id,
        span_id=span2_id,
        parent_span_id=span1_id,
        prompt_tokens=290,
        completion_tokens=90,
        request_text="Query Knowledge Base for Go pgx/sql connection pool parameters and TimescaleDB connection limits.",
        response_text="Retrieved: Recommended max open conns = 25, max idle conns = 5, conn max idle time = 5m. Prepared context for synthesizer.",
    )
    print(f"  ✓ Logged span: {span2['span_id'][:8]}... (Tokens: {span2['tokens']}, Latency: {span2['latency_ms']}ms, Cost: ${span2['cost']:.6f})")
    time.sleep(0.05)

    # Step 3: Code Synthesizer (qwen-2.5-coder)
    print("▶ [Step 3/5] Executing 'Code Synthesizer' (Model: qwen-2.5-coder)...")
    span3_id = str(uuid.uuid4())
    span3 = logger.log_span(
        agent_name="Code Synthesizer",
        model_name="qwen-2.5-coder",
        tokens=890,
        cost=0.000890,
        latency_ms=1180,
        status_code=200,
        trace_id=trace_id,
        span_id=span3_id,
        parent_span_id=span2_id,
        prompt_tokens=380,
        completion_tokens=510,
        request_text="Synthesize Go pool fix: db.SetMaxOpenConns(25), db.SetMaxIdleConns(5), db.SetConnMaxLifetime(10*time.Minute).",
        response_text="func initDBPool(db *sql.DB) { db.SetMaxOpenConns(25); db.SetMaxIdleConns(5); db.SetConnMaxIdleTime(5*time.Minute); }",
    )
    print(f"  ✓ Logged span: {span3['span_id'][:8]}... (Tokens: {span3['tokens']}, Latency: {span3['latency_ms']}ms, Cost: ${span3['cost']:.6f})")
    time.sleep(0.05)

    # Step 4: Code Reviewer & Guardrail (qwen-2.5-coder)
    print("▶ [Step 4/5] Executing 'Code Reviewer' (Model: qwen-2.5-coder)...")
    span4_id = str(uuid.uuid4())
    span4 = logger.log_span(
        agent_name="Code Reviewer",
        model_name="qwen-2.5-coder",
        tokens=420,
        cost=0.000420,
        latency_ms=410,
        status_code=200,
        trace_id=trace_id,
        span_id=span4_id,
        parent_span_id=span3_id,
        prompt_tokens=360,
        completion_tokens=60,
        request_text="Verify AST compliance and scan for deadlocks, thread leaks, or unhandled errors in connection setup.",
        response_text="Verification passed: Pool tuning adheres to best practices. Zero leak vectors detected. Code approved for merge.",
    )
    print(f"  ✓ Logged span: {span4['span_id'][:8]}... (Tokens: {span4['tokens']}, Latency: {span4['latency_ms']}ms, Cost: ${span4['cost']:.6f})")
    time.sleep(0.05)

    # Step 5: Response Formatter (llama-3-8b)
    print("▶ [Step 5/5] Executing 'Response Formatter' (Model: llama-3-8b)...")
    span5_id = str(uuid.uuid4())
    span5 = logger.log_span(
        agent_name="Response Formatter",
        model_name="llama-3-8b",
        tokens=230,
        cost=0.000230,
        latency_ms=175,
        status_code=200,
        trace_id=trace_id,
        span_id=span5_id,
        parent_span_id=span4_id,
        prompt_tokens=170,
        completion_tokens=60,
        request_text="Format final patch report with change summary, commit note, and deployment verification steps.",
        response_text="Summary: Tuned database connection pool bounds to 25 open / 5 idle. Commit message and unit tests prepared.",
    )
    print(f"  ✓ Logged span: {span5['span_id'][:8]}... (Tokens: {span5['tokens']}, Latency: {span5['latency_ms']}ms, Cost: ${span5['cost']:.6f})")

    # Flush background queue to guarantee all spans reached the Go backend
    print("\n⏳ Draining background telemetry queue...")
    logger.flush(timeout=3.0)
    print("✨ All 5 spans transmitted successfully to http://localhost:8080/ingest!")
    print("-" * 72)
    print(f"📊 View the live trace in the Observer UI: http://localhost:3001/traces?trace_id={trace_id}")
    print("=" * 72)


if __name__ == "__main__":
    run_agent_workflow()
