"""
Example usage of LLM Observer SDK with OpenAI API

Requirements:
    pip install openai requests
"""

import os
from llm_observer import LLMObserver, track_openai_call
import uuid

# Initialize observer
observer = LLMObserver(collection_service_url="http://localhost:8080")

# Example 1: Manual tracking
def example_manual_tracking():
    trace_id = str(uuid.uuid4())
    
    observer.track_llm_call(
        trace_id=trace_id,
        agent_id="research-agent-1",
        model="gpt-4",
        provider="openai",
        prompt_tokens=150,
        completion_tokens=75,
        cost_usd=0.0042,
        latency_ms=1240,
        status="success",
        request_text="What is the capital of France?",
        response_text="The capital of France is Paris.",
    )
    
    print(f"✓ Tracked call with trace_id: {trace_id}")


# Example 2: OpenAI decorator usage
def example_with_openai():
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        trace_id = str(uuid.uuid4())
        
        # You can wrap the API call manually
        import time
        start = time.time()
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "What is 2+2?"}],
        )
        
        latency_ms = int((time.time() - start) * 1000)
        
        observer.track_llm_call(
            trace_id=trace_id,
            agent_id="math-agent",
            model="gpt-4",
            provider="openai",
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens,
            cost_usd=0.0,  # Calculate based on token counts
            latency_ms=latency_ms,
            status="success",
            response_text=response.choices[0].message.content[:500],
        )
        
        print(f"✓ Tracked OpenAI call: {response.choices[0].message.content}")
        
    except ImportError:
        print("OpenAI library not installed. Run: pip install openai")


# Example 3: Multi-step agent trajectory
def example_multi_step_trajectory():
    trace_id = str(uuid.uuid4())
    agent_id = "research-bot"
    
    # Step 1: Search query
    span1_id = str(uuid.uuid4())
    observer.track_llm_call(
        trace_id=trace_id,
        span_id=span1_id,
        agent_id=agent_id,
        model="gpt-4",
        provider="openai",
        prompt_tokens=100,
        completion_tokens=50,
        cost_usd=0.002,
        latency_ms=800,
        status="success",
        request_text="Generate search queries for AI trends",
        response_text="1. AI trends 2024\n2. Machine learning advances\n3. LLM innovations",
    )
    
    # Step 2: Analysis with reference to previous
    span2_id = str(uuid.uuid4())
    observer.track_llm_call(
        trace_id=trace_id,
        span_id=span2_id,
        parent_span_id=span1_id,
        agent_id=agent_id,
        model="gpt-4",
        provider="openai",
        prompt_tokens=250,
        completion_tokens=150,
        cost_usd=0.005,
        latency_ms=1500,
        status="success",
        request_text="Analyze search results and summarize...",
        response_text="Key findings: AI adoption is accelerating...",
    )
    
    print(f"✓ Tracked multi-step trajectory with trace_id: {trace_id}")


if __name__ == "__main__":
    print("LLM Observer SDK Examples\n")
    
    print("1. Manual Tracking:")
    example_manual_tracking()
    
    print("\n2. Multi-Step Trajectory:")
    example_multi_step_trajectory()
    
    print("\n3. OpenAI Integration (requires API key):")
    example_with_openai()
    
    print("\n✓ Examples completed! Check http://localhost:3000 (Grafana) for dashboards")
