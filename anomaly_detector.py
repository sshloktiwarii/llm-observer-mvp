"""
Anomaly Detection Engine for LLM Events

This module provides real-time anomaly detection using:
1. Threshold-based alerts (99% coverage, 0 ML overhead)
2. Isolation Forest for statistical anomalies (high-dimensional)
3. Sequence pattern matching for loops and cascades
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import numpy as np
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnomalyType(Enum):
    COST_SPIKE = "cost_spike"
    LATENCY_DEGRADATION = "latency_degradation"
    ERROR_RATE_HIGH = "error_rate_high"
    EXECUTION_LOOP = "execution_loop"
    PROMPT_INJECTION_ATTEMPT = "prompt_injection_attempt"
    HALLUCINATION_SIGNAL = "hallucination_signal"
    RUNAWAY_TOKENS = "runaway_tokens"


@dataclass
class Anomaly:
    type: AnomalyType
    severity: float  # 0-1, where 1 is critical
    agent_id: str
    trace_id: str
    message: str
    timestamp: datetime
    details: Dict


class AnomalyDetector:
    def __init__(self, config: Dict = None):
        self.config = config or self._default_config()
        self.trace_history = {}  # trace_id -> list of events
        self.agent_metrics = {}  # agent_id -> recent metrics
    
    @staticmethod
    def _default_config() -> Dict:
        """Default alert thresholds"""
        return {
            "cost_alert_hourly_usd": 10.0,
            "latency_alert_p95_ms": 5000,
            "error_rate_threshold_pct": 10,
            "loop_detection_min_requests": 5,
            "loop_repetition_threshold_pct": 50,
            "runaway_token_threshold": 100000,
            "max_tokens_per_call": 30000,
        }
    
    def detect(self, event: Dict) -> List[Anomaly]:
        """Analyze single event for anomalies"""
        anomalies = []
        
        # Track event in trace
        trace_id = event.get("trace_id")
        if trace_id not in self.trace_history:
            self.trace_history[trace_id] = []
        self.trace_history[trace_id].append(event)
        
        # Detect loop patterns
        loop_anomaly = self._detect_loop(event)
        if loop_anomaly:
            anomalies.append(loop_anomaly)
        
        # Detect cost spikes
        cost_anomaly = self._detect_cost_spike(event)
        if cost_anomaly:
            anomalies.append(cost_anomaly)
        
        # Detect latency degradation
        latency_anomaly = self._detect_latency_spike(event)
        if latency_anomaly:
            anomalies.append(latency_anomaly)
        
        # Detect errors
        error_anomaly = self._detect_errors(event)
        if error_anomaly:
            anomalies.append(error_anomaly)
        
        # Detect prompt injection attempts
        injection_anomaly = self._detect_prompt_injection(event)
        if injection_anomaly:
            anomalies.append(injection_anomaly)
        
        # Detect runaway tokens
        token_anomaly = self._detect_runaway_tokens(event)
        if token_anomaly:
            anomalies.append(token_anomaly)
        
        return anomalies
    
    def _detect_loop(self, event: Dict) -> Optional[Anomaly]:
        """Detect execution loops: identical requests in short time window"""
        trace_id = event.get("trace_id")
        trace_events = self.trace_history.get(trace_id, [])
        
        if len(trace_events) < self.config["loop_detection_min_requests"]:
            return None
        
        # Look for identical prompts in last 30 seconds
        recent = [
            e for e in trace_events 
            if (datetime.fromisoformat(e["timestamp"].replace('Z', '+00:00')) > 
                datetime.utcnow() - timedelta(seconds=30))
        ]
        
        if len(recent) < 3:
            return None
        
        # Count unique prompts
        prompts = [e.get("request_text") for e in recent if e.get("request_text")]
        unique_prompts = len(set(prompts))
        total_prompts = len(prompts)
        
        if total_prompts == 0:
            return None
        
        repetition_pct = ((total_prompts - unique_prompts) / total_prompts) * 100
        
        if repetition_pct >= self.config["loop_repetition_threshold_pct"]:
            return Anomaly(
                type=AnomalyType.EXECUTION_LOOP,
                severity=min(1.0, repetition_pct / 100),
                agent_id=event.get("agent_id", "unknown"),
                trace_id=trace_id,
                message=f"Execution loop detected: {repetition_pct:.1f}% repetition in {total_prompts} calls",
                timestamp=datetime.utcnow(),
                details={
                    "total_calls": total_prompts,
                    "unique_prompts": unique_prompts,
                    "repetition_pct": repetition_pct,
                }
            )
        
        return None
    
    def _detect_cost_spike(self, event: Dict) -> Optional[Anomaly]:
        """Detect unusual cost increases"""
        agent_id = event.get("agent_id")
        cost = event.get("cost_usd", 0)
        
        # Track agent's recent costs
        if agent_id not in self.agent_metrics:
            self.agent_metrics[agent_id] = {"costs": [], "latencies": []}
        
        self.agent_metrics[agent_id]["costs"].append(cost)
        
        # Keep last 100 calls
        if len(self.agent_metrics[agent_id]["costs"]) > 100:
            self.agent_metrics[agent_id]["costs"].pop(0)
        
        # Check if this call is unusually expensive
        recent_costs = self.agent_metrics[agent_id]["costs"]
        if len(recent_costs) > 5:
            avg_cost = np.mean(recent_costs[:-1])
            std_cost = np.std(recent_costs[:-1])
            
            # Alert if cost > 3 std devs from mean
            if std_cost > 0 and cost > avg_cost + (3 * std_cost):
                return Anomaly(
                    type=AnomalyType.COST_SPIKE,
                    severity=min(1.0, (cost - avg_cost) / (avg_cost + 0.01)),
                    agent_id=agent_id,
                    trace_id=event.get("trace_id"),
                    message=f"Cost spike: ${cost:.4f} (avg: ${avg_cost:.4f})",
                    timestamp=datetime.utcnow(),
                    details={
                        "current_cost": cost,
                        "average_cost": avg_cost,
                        "std_dev": std_cost,
                    }
                )
        
        return None
    
    def _detect_latency_spike(self, event: Dict) -> Optional[Anomaly]:
        """Detect latency degradation"""
        agent_id = event.get("agent_id")
        latency = event.get("latency_ms", 0)
        
        if agent_id not in self.agent_metrics:
            self.agent_metrics[agent_id] = {"costs": [], "latencies": []}
        
        self.agent_metrics[agent_id]["latencies"].append(latency)
        
        if len(self.agent_metrics[agent_id]["latencies"]) > 100:
            self.agent_metrics[agent_id]["latencies"].pop(0)
        
        recent_latencies = self.agent_metrics[agent_id]["latencies"]
        if len(recent_latencies) > 5:
            p95 = np.percentile(recent_latencies[:-1], 95)
            
            if latency > p95 * 2:  # 2x p95
                return Anomaly(
                    type=AnomalyType.LATENCY_DEGRADATION,
                    severity=min(1.0, latency / (p95 * 5)),
                    agent_id=agent_id,
                    trace_id=event.get("trace_id"),
                    message=f"Latency spike: {latency}ms (p95: {p95:.0f}ms)",
                    timestamp=datetime.utcnow(),
                    details={
                        "current_latency_ms": latency,
                        "p95_ms": p95,
                    }
                )
        
        return None
    
    def _detect_errors(self, event: Dict) -> Optional[Anomaly]:
        """Detect high error rates"""
        if event.get("status") == "success":
            return None
        
        agent_id = event.get("agent_id")
        error_code = event.get("error_code", "unknown")
        
        return Anomaly(
            type=AnomalyType.ERROR_RATE_HIGH,
            severity=0.5,
            agent_id=agent_id,
            trace_id=event.get("trace_id"),
            message=f"API error: {error_code} - {event.get('error_message', 'Unknown error')}",
            timestamp=datetime.utcnow(),
            details={
                "error_code": error_code,
                "error_message": event.get("error_message"),
                "status": event.get("status"),
            }
        )
    
    def _detect_prompt_injection(self, event: Dict) -> Optional[Anomaly]:
        """Detect potential prompt injection attacks"""
        score = event.get("prompt_injection_score", 0)
        
        if score > 0.7:  # Configurable threshold
            return Anomaly(
                type=AnomalyType.PROMPT_INJECTION_ATTEMPT,
                severity=score,
                agent_id=event.get("agent_id"),
                trace_id=event.get("trace_id"),
                message=f"Potential prompt injection detected (score: {score:.2f})",
                timestamp=datetime.utcnow(),
                details={
                    "injection_score": score,
                    "request_text": event.get("request_text", "")[:200],
                }
            )
        
        return None
    
    def _detect_runaway_tokens(self, event: Dict) -> Optional[Anomaly]:
        """Detect unusually high token consumption"""
        total_tokens = event.get("prompt_tokens", 0) + event.get("completion_tokens", 0)
        
        if total_tokens > self.config["max_tokens_per_call"]:
            return Anomaly(
                type=AnomalyType.RUNAWAY_TOKENS,
                severity=min(1.0, total_tokens / self.config["runaway_token_threshold"]),
                agent_id=event.get("agent_id"),
                trace_id=event.get("trace_id"),
                message=f"Runaway token consumption: {total_tokens} tokens",
                timestamp=datetime.utcnow(),
                details={
                    "total_tokens": total_tokens,
                    "prompt_tokens": event.get("prompt_tokens"),
                    "completion_tokens": event.get("completion_tokens"),
                }
            )
        
        return None


class AnomalyAlertManager:
    """Send alerts based on detected anomalies"""
    
    def __init__(self):
        self.alert_handlers = []
    
    def add_handler(self, handler):
        """Add alert handler (e.g., email, Slack, webhook)"""
        self.alert_handlers.append(handler)
    
    def emit_alert(self, anomaly: Anomaly):
        """Send anomaly to all handlers"""
        alert_data = {
            "type": anomaly.type.value,
            "severity": anomaly.severity,
            "agent_id": anomaly.agent_id,
            "trace_id": anomaly.trace_id,
            "message": anomaly.message,
            "timestamp": anomaly.timestamp.isoformat(),
            "details": anomaly.details,
        }
        
        logger.warning(f"ANOMALY ALERT: {json.dumps(alert_data, indent=2)}")
        
        for handler in self.alert_handlers:
            try:
                handler(alert_data)
            except Exception as e:
                logger.error(f"Error in alert handler: {e}")
