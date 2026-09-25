"""Python SDK for LLM Observer - Lightweight instrumentation for LLM API calls

Usage:
    from llm_observer import LLMObserver
    
    observer = LLMObserver(collection_service_url="http://localhost:8080")
    
    # Wrap OpenAI calls
    response = observer.track_llm_call(
        trace_id="unique-request-id",
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
"""

import json
import requests
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class LLMObserver:
    def __init__(self, collection_service_url: str = "http://localhost:8080"):
        self.collection_url = collection_service_url
        self.session = requests.Session()
    
    def track_llm_call(
        self,
        trace_id: str,
        agent_id: str,
        model: str,
        provider: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        latency_ms: int,
        status: str = "success",
        request_text: Optional[str] = None,
        response_text: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        parent_span_id: Optional[str] = None,
    ) -> bool:
        """
        Track a single LLM API call
        
        Args:
            trace_id: Unique identifier for the request chain
            agent_id: ID of the agent making the call
            model: Model name (e.g., "gpt-4")
            provider: Provider name (e.g., "openai")
            prompt_tokens: Number of tokens in the prompt
            completion_tokens: Number of tokens in the completion
            cost_usd: Cost of the call in USD
            latency_ms: Latency in milliseconds
            status: "success", "error", "timeout", etc.
            request_text: The prompt (optional, truncated for privacy)
            response_text: The response (optional, truncated for privacy)
            error_code: Error code if status != success
            error_message: Error message if status != success
            parent_span_id: Parent span ID for multi-step flows
        
        Returns:
            True if successfully sent to collection service
        """
        
        event = {
            "trace_id": trace_id,
            "span_id": str(uuid.uuid4()),
            "parent_span_id": parent_span_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent_id": agent_id,
            "model": model,
            "provider": provider,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "cost_usd": cost_usd,
            "latency_ms": latency_ms,
            "status": status,
            "error_code": error_code,
            "error_message": error_message,
            "request_text": request_text[:500] if request_text else None,  # Truncate
            "response_text": response_text[:500] if response_text else None,  # Truncate
            "probable_loop": False,
            "prompt_injection_score": 0.0,
        }
        
        try:
            response = self.session.post(
                f"{self.collection_url}/api/v1/event",
                json=event,
                timeout=2  # Non-blocking
            )
            
            if response.status_code == 200:
                return True
            else:
                logger.warning(f"Collection service returned {response.status_code}")
                return False
                
        except requests.exceptions.Timeout:
            logger.warning("Collection service timeout (non-blocking)")
            return False
        except Exception as e:
            logger.error(f"Failed to track LLM call: {e}")
            return False
    
    def track_batch(self, events: list) -> bool:
        """Send multiple events in a batch"""
        try:
            response = self.session.post(
                f"{self.collection_url}/api/v1/batch",
                json=events,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to track batch: {e}")
            return False


# Decorator for easy OpenAI integration
def track_openai_call(observer: LLMObserver, agent_id: str, trace_id: str):
    """Decorator to automatically track OpenAI API calls"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            import time
            
            start_time = time.time()
            try:
                response = func(*args, **kwargs)
                latency_ms = int((time.time() - start_time) * 1000)
                
                # Extract usage from OpenAI response
                if hasattr(response, 'usage'):
                    observer.track_llm_call(
                        trace_id=trace_id or str(uuid.uuid4()),
                        agent_id=agent_id,
                        model=response.model if hasattr(response, 'model') else "unknown",
                        provider="openai",
                        prompt_tokens=response.usage.prompt_tokens,
                        completion_tokens=response.usage.completion_tokens,
                        cost_usd=0.0,  # You can calculate this
                        latency_ms=latency_ms,
                        status="success",
                    )
                
                return response
                
            except Exception as e:
                latency_ms = int((time.time() - start_time) * 1000)
                observer.track_llm_call(
                    trace_id=trace_id or str(uuid.uuid4()),
                    agent_id=agent_id,
                    model="unknown",
                    provider="openai",
                    prompt_tokens=0,
                    completion_tokens=0,
                    cost_usd=0,
                    latency_ms=latency_ms,
                    status="error",
                    error_message=str(e),
                )
                raise
        
        return wrapper
    return decorator
