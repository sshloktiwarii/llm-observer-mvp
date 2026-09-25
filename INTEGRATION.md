# Integration Guide - Adding LLM Observer to Your Agent

## Python Integration

### 1. Install SDK

```bash
cp llm_observer.py /path/to/your/project/
```

### 2. Basic Setup

```python
from llm_observer import LLMObserver
import uuid
import time

# Initialize observer
observer = LLMObserver(collection_service_url="http://localhost:8080")

# Wrap your LLM calls
trace_id = str(uuid.uuid4())
start = time.time()

# Your LLM call here
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "What is 2+2?"}],
)

latency_ms = int((time.time() - start) * 1000)

# Track the call
observer.track_llm_call(
    trace_id=trace_id,
    agent_id="my-agent",
    model="gpt-4",
    provider="openai",
    prompt_tokens=response.usage.prompt_tokens,
    completion_tokens=response.usage.completion_tokens,
    cost_usd=0.0042,  # Calculate based on model and tokens
    latency_ms=latency_ms,
    status="success",
    request_text="What is 2+2?",
    response_text=response.choices[0].message.content,
)
```

### 3. Multi-Step Agent Tracking

```python
import uuid

class ResearchAgent:
    def __init__(self, observer):
        self.observer = observer
        self.trace_id = str(uuid.uuid4())
    
    def search(self, query):
        span_id = str(uuid.uuid4())
        # Track search step
        self.observer.track_llm_call(
            trace_id=self.trace_id,
            span_id=span_id,
            agent_id="research-agent",
            model="gpt-4",
            provider="openai",
            prompt_tokens=100,
            completion_tokens=50,
            cost_usd=0.002,
            latency_ms=500,
            status="success",
        )
        return span_id
    
    def analyze(self, search_results, parent_span_id):
        span_id = str(uuid.uuid4())
        # Track analysis step, linked to search
        self.observer.track_llm_call(
            trace_id=self.trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            agent_id="research-agent",
            model="gpt-4",
            provider="openai",
            prompt_tokens=250,
            completion_tokens=100,
            cost_usd=0.005,
            latency_ms=1200,
            status="success",
        )

# Usage
agent = ResearchAgent(observer)
search_span = agent.search("AI trends 2024")
agent.analyze(results, search_span)
```

### 4. Error Tracking

```python
try:
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "What is 2+2?"}],
    )
except Exception as e:
    observer.track_llm_call(
        trace_id=trace_id,
        agent_id="my-agent",
        model="gpt-4",
        provider="openai",
        prompt_tokens=100,
        completion_tokens=0,
        cost_usd=0,
        latency_ms=latency_ms,
        status="error",
        error_code=type(e).__name__,
        error_message=str(e),
    )
    raise
```

---

## Go Integration

### 1. Add Dependency

```bash
go get github.com/reuben-d/llm-observer@latest
```

### 2. Basic Usage

```go
package main

import (
    "github.com/reuben-d/llm-observer"
    "github.com/google/uuid"
    "time"
)

func main() {
    observer := llmobserver.NewObserver("http://localhost:8080")
    
    traceID := uuid.New().String()
    start := time.Now()
    
    // Your LLM call here
    
    latency := int(time.Since(start).Milliseconds())
    
    observer.TrackCall(
        traceID,
        "my-agent",
        "gpt-4",
        "openai",
        100,  // prompt tokens
        50,   // completion tokens
        0.0042,
        latency,
        "success",
        "",
    )
}
```

---

## Node.js Integration

### 1. Create SDK Package

```javascript
// llm-observer.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class LLMObserver {
  constructor(collectionServiceUrl = 'http://localhost:8080') {
    this.collectionServiceUrl = collectionServiceUrl;
    this.client = axios.create({
      timeout: 2000,
      baseURL: collectionServiceUrl,
    });
  }

  async trackCall({
    traceId,
    agentId,
    model,
    provider,
    promptTokens,
    completionTokens,
    costUsd,
    latencyMs,
    status = 'success',
    requestText = null,
    responseText = null,
    errorCode = null,
    errorMessage = null,
  }) {
    try {
      await this.client.post('/api/v1/event', {
        trace_id: traceId,
        span_id: uuidv4(),
        timestamp: new Date().toISOString(),
        agent_id: agentId,
        model,
        provider,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: costUsd,
        latency_ms: latencyMs,
        status,
        request_text: requestText?.substring(0, 500),
        response_text: responseText?.substring(0, 500),
        error_code: errorCode,
        error_message: errorMessage,
        probable_loop: false,
        prompt_injection_score: 0,
      });
      return true;
    } catch (error) {
      console.error('Failed to track LLM call:', error);
      return false;
    }
  }
}

module.exports = LLMObserver;
```

### 2. Usage

```javascript
const LLMObserver = require('./llm-observer');
const observer = new LLMObserver();

const start = Date.now();
const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'What is 2+2?' }],
});
const latency = Date.now() - start;

await observer.trackCall({
  traceId: 'trace-123',
  agentId: 'my-agent',
  model: 'gpt-4',
  provider: 'openai',
  promptTokens: response.usage.prompt_tokens,
  completionTokens: response.usage.completion_tokens,
  costUsd: 0.0042,
  latencyMs: latency,
  status: 'success',
  responseText: response.choices[0].message.content,
});
```

---

## Cost Calculation

Use these formulas to calculate `cost_usd`:

### OpenAI Pricing (as of 2024)

```python
def calculate_openai_cost(model, prompt_tokens, completion_tokens):
    pricing = {
        'gpt-4': {
            'prompt': 0.03 / 1000,      # $0.03 per 1K prompt tokens
            'completion': 0.06 / 1000,  # $0.06 per 1K completion tokens
        },
        'gpt-4-turbo': {
            'prompt': 0.01 / 1000,
            'completion': 0.03 / 1000,
        },
        'gpt-3.5-turbo': {
            'prompt': 0.0005 / 1000,
            'completion': 0.0015 / 1000,
        },
    }
    
    p = pricing.get(model, {'prompt': 0, 'completion': 0})
    return (prompt_tokens * p['prompt']) + (completion_tokens * p['completion'])
```

### Claude Pricing (Anthropic)

```python
def calculate_claude_cost(model, prompt_tokens, completion_tokens):
    pricing = {
        'claude-3-opus': {
            'prompt': 0.015 / 1000,
            'completion': 0.075 / 1000,
        },
        'claude-3-sonnet': {
            'prompt': 0.003 / 1000,
            'completion': 0.015 / 1000,
        },
        'claude-3-haiku': {
            'prompt': 0.00025 / 1000,
            'completion': 0.00125 / 1000,
        },
    }
    
    p = pricing.get(model, {'prompt': 0, 'completion': 0})
    return (prompt_tokens * p['prompt']) + (completion_tokens * p['completion'])
```

---

## Best Practices

1. **Always set trace_id**: Use UUID v4 to correlate multi-step requests
2. **Track parent-child relationships**: Set `parent_span_id` to link related calls
3. **Truncate sensitive data**: Request/response text is limited to 500 chars
4. **Non-blocking**: Collection service has 2-second timeout - design for failures
5. **Batch when possible**: Use `track_batch()` for high-volume scenarios
6. **Monitor locally first**: Test integration with example_usage.py before production

---

## Testing Your Integration

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Run collection service
go run main.go

# 3. Test with your integration
python -c "from your_agent import Agent; a = Agent(); a.run()"

# 4. Query database
PGPASSWORD=observer_pass psql -h localhost -U observer -d llm_events \
  -c "SELECT * FROM llm_events ORDER BY time DESC LIMIT 10;"

# 5. View in Grafana
# Open http://localhost:3000
```
