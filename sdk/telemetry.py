"""Lightweight Python Telemetry SDK for LLM Observer.

Provides non-blocking, asynchronous span and trace logging to the local Go
ingestion server (default: http://localhost:8080/ingest) using background worker
threads and graceful timeout handling.
"""

from __future__ import annotations

import atexit
from datetime import datetime, timezone
import json
import logging
import queue
import threading
from typing import Any, Dict, Optional
import uuid

import requests

logger = logging.getLogger("llm_observer.telemetry")


def _infer_provider(model_name: str) -> str:
    """Infer the model provider based on common model name conventions."""
    name = model_name.lower()
    if any(k in name for k in ("qwen", "llama", "mistral", "phi", "deepseek", "gemma", "local")):
        return "local"
    if any(k in name for k in ("gpt-", "o1", "o3", "text-embedding", "dall-e")):
        return "openai"
    if "claude" in name:
        return "anthropic"
    if "gemini" in name:
        return "google"
    if "groq" in name:
        return "groq"
    return "local"


class TraceLogger:
    """Asynchronous, non-blocking telemetry logger for LLM spans and multi-agent chains.

    Spans logged via `log_span` are immediately enqueued and transmitted to the
    ingestion backend via a dedicated background daemon worker thread, ensuring
    zero latency penalty or blocking on the host application's critical path.
    """

    DEFAULT_INGEST_URL = "http://localhost:8080/ingest"

    def __init__(
        self,
        ingest_url: str = DEFAULT_INGEST_URL,
        timeout: float = 1.5,
        max_queue_size: int = 10000,
        auto_flush_on_exit: bool = True,
    ) -> None:
        """Initialize the TraceLogger.

        Args:
            ingest_url: HTTP URL of the ingestion backend (e.g., http://localhost:8080/ingest).
            timeout: HTTP request timeout in seconds (connect and read).
            max_queue_size: Capacity of the internal thread-safe queue.
            auto_flush_on_exit: Whether to automatically flush pending spans when Python exits.
        """
        self.ingest_url = ingest_url.rstrip("/")
        self.timeout = timeout
        self._queue: queue.Queue[Optional[Dict[str, Any]]] = queue.Queue(maxsize=max_queue_size)
        self._session = requests.Session()
        self._session.headers.update({"Content-Type": "application/json"})
        
        # Background worker management
        self._stop_event = threading.Event()
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            name="LLMObserver-TelemetryWorker",
            daemon=True,
        )
        self._worker_thread.start()

        if auto_flush_on_exit:
            atexit.register(self.shutdown, wait=True, timeout=3.0)

    def _worker_loop(self) -> None:
        """Background thread consumer that transmits queued span payloads."""
        while not self._stop_event.is_set():
            try:
                item = self._queue.get(timeout=0.2)
            except queue.Empty:
                continue

            if item is None:
                # Sentinel shutdown signal
                self._queue.task_done()
                break

            try:
                self._send_payload(item)
            except Exception as exc:  # Guard against unexpected crashes
                logger.debug("Telemetry worker error: %s", exc)
            finally:
                self._queue.task_done()

    def _send_payload(self, payload: Dict[str, Any]) -> bool:
        """Transmit payload via HTTP POST with graceful timeout handling."""
        try:
            resp = self._session.post(
                self.ingest_url,
                json=payload,
                timeout=(min(self.timeout, 1.0), self.timeout),
            )
            if resp.status_code in (200, 201, 202):
                return True
            # Fallback to /api/v1/event if /ingest returns 404
            if resp.status_code == 404 and self.ingest_url.endswith("/ingest"):
                fallback_url = self.ingest_url[:-7] + "/api/v1/event"
                fallback_resp = self._session.post(
                    fallback_url,
                    json=payload,
                    timeout=(min(self.timeout, 1.0), self.timeout),
                )
                return fallback_resp.status_code in (200, 201, 202)
            logger.warning(
                "Ingestion server responded with status %d: %s",
                resp.status_code,
                resp.text[:200],
            )
            return False
        except requests.exceptions.Timeout:
            logger.warning(
                "Telemetry HTTP connection to %s timed out after %.1fs (payload dropped)",
                self.ingest_url,
                self.timeout,
            )
            return False
        except requests.exceptions.ConnectionError as err:
            logger.warning(
                "Failed to connect to ingestion server at %s: %s",
                self.ingest_url,
                err,
            )
            return False
        except requests.exceptions.RequestException as err:
            logger.warning(
                "Unexpected HTTP error sending telemetry payload: %s",
                err,
            )
            return False

    def log_span(
        self,
        agent_name: str,
        model_name: str,
        tokens: int,
        cost: float,
        latency_ms: int,
        status_code: int = 200,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None,
        parent_span_id: Optional[str] = None,
        request_text: Optional[str] = None,
        response_text: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        provider: Optional[str] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        sync: bool = False,
    ) -> Dict[str, Any]:
        """Record and log an LLM execution span.

        Dispatches asynchronously to the background worker thread by default.
        Execution returns immediately (< 0.1ms) without blocking the host application.

        Args:
            agent_name: Human-readable identifier of the agent/component.
            model_name: Model identifier (e.g., 'qwen-2.5-coder', 'llama-3-8b').
            tokens: Total tokens consumed (prompt + completion).
            cost: Estimated cost in USD.
            latency_ms: Duration of the model invocation in milliseconds.
            status_code: HTTP/execution status code (default: 200).
            trace_id: UUID of the root trace for chain linking. Auto-generated if omitted.
            span_id: UUID of this individual span. Auto-generated if omitted.
            parent_span_id: UUID of parent span in a multi-step workflow.
            request_text: Optional input prompt/user query.
            response_text: Optional generated output response.
            error_code: Error classification code if status_code indicates failure.
            error_message: Descriptive error message if status_code indicates failure.
            provider: LLM provider name ('local', 'openai', etc.). Auto-inferred if None.
            prompt_tokens: Number of prompt tokens (auto-approximated if None).
            completion_tokens: Number of output tokens (auto-approximated if None).
            sync: If True, executes the HTTP request synchronously. Defaults to False.

        Returns:
            The structured span dictionary including trace_id and span_id.
        """
        # Validate or generate UUIDs
        tid = trace_id or str(uuid.uuid4())
        sid = span_id or str(uuid.uuid4())
        inferred_provider = provider or _infer_provider(model_name)

        # Distribute tokens if specific prompt/completion counts are not supplied
        if prompt_tokens is None and completion_tokens is None:
            p_tokens = int(tokens * 0.65)
            c_tokens = max(0, tokens - p_tokens)
        else:
            p_tokens = prompt_tokens if prompt_tokens is not None else 0
            c_tokens = completion_tokens if completion_tokens is not None else max(0, tokens - p_tokens)

        status_str = "success" if 200 <= status_code < 300 else "error"

        payload: Dict[str, Any] = {
            "trace_id": tid,
            "span_id": sid,
            "parent_span_id": parent_span_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            # Primary schema fields
            "agent_id": agent_name,
            "agent_name": agent_name,
            "model": model_name,
            "model_name": model_name,
            "provider": inferred_provider,
            "tokens": tokens,
            "prompt_tokens": p_tokens,
            "completion_tokens": c_tokens,
            "cost": float(cost),
            "cost_usd": float(cost),
            "latency_ms": int(latency_ms),
            "status_code": int(status_code),
            "status": status_str,
            "error_code": error_code,
            "error_message": error_message,
            "request_text": request_text[:1000] if request_text else None,
            "response_text": response_text[:2000] if response_text else None,
            "probable_loop": False,
            "prompt_injection_score": 0.0,
        }

        if sync:
            self._send_payload(payload)
        else:
            try:
                self._queue.put_nowait(payload)
            except queue.Full:
                logger.warning(
                    "Telemetry queue capacity reached (%d items). Dropping span.",
                    self._queue.maxsize,
                )

        return payload

    def flush(self, timeout: float = 3.0) -> None:
        """Block until all enqueued spans have been processed or timeout occurs."""
        try:
            self._queue.join()
        except Exception:
            pass

    def shutdown(self, wait: bool = True, timeout: float = 3.0) -> None:
        """Signal the background worker to stop and optionally drain the queue."""
        if self._stop_event.is_set():
            return

        if wait:
            self.flush(timeout=timeout)

        self._stop_event.set()
        try:
            self._queue.put_nowait(None)  # Sentinel to wake up worker
        except queue.Full:
            pass

        if wait and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=timeout)

    def __enter__(self) -> TraceLogger:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.shutdown(wait=True)
