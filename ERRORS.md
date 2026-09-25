# LLM Observer MVP Error Catalogue

This document lists all known errors in the LLM Observer MVP system, categorized by severity and impact. Errors are listed in order of severity: Grave → High → Medium → Small.

## Grave Errors (System-Critical)

These errors cause complete system failure, significant data loss, or security breaches requiring immediate attention.

### G1: Total Event Loss
- **Component**: Collection Service → Storage
- **Description**: Events are not persisted to either Redpanda or TimescaleDB due to storage layer failure
- **Impact**: Zero observability data; system provides no value
- **Detection**: 
  - Collection service logs show storage write failures
  - No new data in TimescaleDB or Redpanda consumers
  - Monitoring shows zero incoming events despite SDK sending
- **Root Causes**:
  - TimescaleDB connection failure + Redpanda broker downtime
  - Authentication failure to both storage systems
  - Disk full on both storage volumes
- **Mitigation**: 
  - SDK local buffering (if enabled)
  - Manual restart of storage services
  - Data recovery from SDK buffers if available

### G2: Schema Corruption
- **Component**: TimescaleDB
- **Description**: `llm_events` table or critical indexes become corrupted/unusable
- **Impact**: Cannot query or insert new events; continuous aggregates fail
- **Detection**:
  - PostgreSQL errors in collection service logs
  - `SELECT * FROM llm_events LIMIT 1` fails
  - Continuous aggregate refresh errors
- **Root Causes**:
  - Disk corruption during write
  - Failed migration script
  - Manual DDL errors
- **Mitigation**:
  - Restore from backup
  - REINDEX if index corruption
  - pg_dump/pg_restore for logical corruption

### G3: Security Breach - Data Exfiltration
- **Component**: Any network-exposed service
- **Description**: Unauthorized access to LLM event data containing potentially sensitive metadata
- **Impact**: Exposure of agent IDs, model usage patterns, cost data, possibly PII if misconfigured
- **Detection**:
  - Unusual access patterns in database logs
  - Unknown IPs accessing services
  - Audit trail showing unauthorized queries
- **Root Causes**:
  - Exposed ports without authentication
  - Weak/default credentials
  - SDK misconfigured to send to wrong endpoint
- **Mitigation**:
  - Immediately revoke credentials
  - Audit access logs
  - Enable network policies and authentication
  - Notify stakeholders per data breach policies

### G4: Infinite Loop in Collection Service
- **Component**: Collection Service Go runtime
- **Description**: Service enters infinite loop consuming 100% CPU, stops processing events
- **Impact**: Backpressure builds in SDKs, eventual event loss when buffers overflow
- **Detection**:
  - Service CPU at 100% with low event throughput
  - Increasing lag in SDK queues
  - No new data in storage despite active SDKs
- **Root Causes**:
  - Race condition in batcher or storage workers
  - Deadlock in channel communication
  - Unbounded recursion in error handling
- **Mitigation**:
  - Service restart (Kubernetes/container orchestrator)
  - Core dump analysis for root cause
  - Circuit breaker patterns in critical sections

## High Errors (Significant Impact)

These errors significantly impair functionality but don't cause total system failure. Require timely intervention (within hours).

### H1: Partial Storage Failure - TimescaleDB Down
- **Component**: TimescaleDB storage
- **Description**: Events written to Redpanda but not TimescaleDB (or vice versa)
- **Impact**: 
  - Loss of SQL querying capabilities
  - Continuous aggregates stop updating
  - Grafana dashboards show stale/no data
  - Stream processing (Redpanda) still works
- **Detection**:
  - Collection service logs show TimescaleDB write errors
  - Redpanda consumer lag normal but no DB growth
  - Grafana panels show "no data" or stale data
- **Root Causes**:
  - Database connection pool exhaustion
  - Long-running queries blocking writes
  - Migration locking table
  - Disk full on TimescaleDB volume
- **Mitigation**:
  - Restart TimescaleDB service
  - Increase connection limits
  - Clear disk space
  - Manual backfill from Redpanda if needed

### H2: Schema Migration Failure
- **Component**: Database initialization/upgrades
- **Description**: `init_schema.sql` fails to apply or causes incompatibility
- **Impact**: 
  - New features unavailable
  - Potential data loss if migration rolls back partially
  - Collection service may fail to start
- **Detection**:
  - Service startup fails with SQL errors
  - Migration logs show failed statements
  - Version mismatch between code and schema
- **Root Causes**:
  - Changes to init_sql without backward compatibility
  - Constraints violated by existing data
  - Syntax errors in SQL
- **Mitigation**:
  - Fix migration script
  - Manual schema update
  - Point-in-time recovery if data corrupted

### H3: SDK Collection Service Connection Failure
- **Component**: SDK → Collection Service network
- **Description**: SDK cannot reach Collection Service due to network issues or service downtime
- **Impact**: 
  - Events buffered locally until buffer overflow
  - Potential event loss if downtime exceeds buffer capacity
  - No real-time observability
- **Detection**:
  - SDK logs show connection errors/retry attempts
  - Increasing local queue size in SDK
  - Collection service shows no incoming traffic from affected agents
- **Root Causes**:
  - Network partition between agents and service
  - Collection service crashed or overloaded
  - Firewall rules changed
  - Service scaled to zero instances
- **Mitigation**:
  - Restore network connectivity
  - Scale up collection service
  - Increase SDK buffer size (temporary)
  - Manual retrieval of buffered events on restart

### H4: Batcher Malfunction - Events Stuck in Memory
- **Component**: Collection Service batcher
- **Description**: Events accepted but not flushed to storage due to batcher failure
- **Impact**: 
  - Memory leak in collection service
  - Event loss on service restart
  - Storage appears underutilized despite incoming traffic
- **Detection**:
  - Service memory usage growing unbounded
  - Storage write rates near zero despite incoming requests
  - No errors in logs (silent failure)
  - Prometheus metrics show batch flush latency increasing to timeout
- **Root Causes**:
  - Channel deadlock in batcher
  - Flush timer not firing
  - Condition variable mismatch
- **Mitigation**:
  - Service restart to clear memory
  - Fix batcher logic
  - Add health check for batch flush latency

### H5: Redpanda Consumer Group Lag
- **Component**: Redpada consumers (for stream processing)
- **Description**: Consumers fall behind producers, causing increasing lag
- **Impact**: 
  - Stream processing anomalies (loop detection) delayed
  - Eventually may cause disk space issues if retention too low
  - Alerting based on streams becomes stale
- **Detection**:
  - Consumer lag metrics increasing over time
  - Stream processing results outdated
  - Disk usage growing if not cleaned up
- **Root Causes**:
  - Consumer application crashed or slow
  - Insufficient consumer instances for partition count
  - Network issues between consumers and brokers
  - Long-running processing tasks
- **Mitigation**:
  - Scale up consumer instances
  - Fix consumer processing logic
  - Increase retention temporarily if disk allows
  - Manual consumer group reset (if acceptable to reprocess)

## Medium Errors (Degraded Performance)

These errors cause noticeable degradation but have workarounds. Should be addressed in next maintenance cycle.

### M1: Suboptimal Batch Sizing
- **Component**: Collection Service batcher
- **Description**: Batch size too small or too large for current load
- **Impact**: 
  - Too small: Excessive storage write overhead
  - Too large: Increased latency variability, memory pressure
- **Detection**:
  - Storage IOPS higher/lower than expected
  - Batch flush latency outside target range
  - Memory usage patterns inconsistent with load
- **Root Causes**:
  - Static batch size not tuned to actual throughput
  - Lack of adaptive batching algorithms
- **Mitigation**:
  - Tune batch size/configuration
  - Implement adaptive batching based on load

### M2: Index Fragmentation
- **Component**: TimescaleDB
- **Description**: Indexes on `llm_events` become fragmented over time
- **Impact**: 
  - Query performance degrades gradually
  - Increased disk usage for same data
- **Detection**:
  - `pg_stat_user_indexes` shows high leaf fragmentation
  - Query performance worse than expected for data volume
  - Index bloat reported by pgstattuple
- **Root Causes**:
  - High UPDATE/DELETE workload (though minimal in append-only)
  - Long periods without vacuum
- **Mitigation**:
  - Schedule REINDEX during maintenance window
  - Adjust autovacuum parameters
  - Consider BRIN indexes for time-based columns

### M3: Materialized View Refresh Lag
- **Component**: TimescaleDB continuous aggregates
- **Description**: Materialized views lag behind real-time data
- **Impact**: 
  - Grafana dashboards show delayed aggregations
  - Alert rules based on aggregates fire late
- **Detection**:
  - Compare raw event timestamps vs materialized view window
  - Dashboard timestamps lag behind wall clock
  - Continuous aggregate refresh lag metrics
- **Root Causes**:
  - High volume of events causing refresh backlog
  - Insufficient resources for aggregate maintenance
  - Complex aggregate calculations
- **Mitigation**:
  - Increase refresh interval if real-time not required
  - Allocate more resources to database
  - Simplify aggregate expressions
  - Manual refresh during low-traffic periods

### M4: SDK Version Skew
- **Component**: SDK ↔ Collection Service version mismatch
- **Description**: Different agents using SDK versions incompatible with collection service
- **Impact**: 
  - Some events rejected due to schema validation
  - Inconsistent feature availability
  - Potential silent data loss if fields dropped
- **Detection**:
  - Collection service logs show validation errors for specific agent_ids
  - Missing fields in events from certain SDK versions
  - Feature flags not working consistently
- **Root Causes**:
  - Independent SDK updates without backward compatibility
  - Breaking changes in API without versioning
- **Mitigation**:
  - Enforce SDK version compatibility
  - Implement graceful degradation for unknown fields
  - Use API versioning in HTTP headers

### M5: Grafana Dashboard Misconfiguration
- **Component**: Grafana
- **Description**: Dashboards not showing correct data or misleading visualizations
- **Impact**: 
  - Operators misinterpret system state
  - Alert fatigue from false positives/negatives
  - Reduced trust in observability system
- **Detection**:
  - Dashboard shows impossible values (negative costs, etc.)
  - No data panels despite known activity
  - Inconsistent timeseries across panels
- **Root Causes**:
  - Incorrect datasource configuration
  - Wrong time range or timezone settings
  - Query errors in panel definitions
  - Using deprecated table/column names
- **Mitigation**:
  - Validate datasource connection
  - Check panel queries in explore mode
  - Update dashboards after schema changes
  - Implement dashboard version control

## Small Errors (Minor Issues)

These errors are cosmetic, easily worked around, or affect non-core functionality. Can be addressed in backlog.

### S1: Logging Verbosity Issues
- **Component**: Any service
- **Description**: Logs too verbose (noise) or not verbose enough (missing diagnostics)
- **Impact**: 
  - Difficult to troubleshoot during issues
  - Log storage costs higher than necessary
- **Detection**:
  - Log levels not matching environment (debug in prod)
  - Missing correlation IDs in traces
  - Excessive log volume triggering alerts
- **Root Causes**:
  - Incorrect log level configuration
  - Missing structured logging fields
- **Mitigation**:
  - Adjust log levels per environment
  - Add trace/span IDs to log entries
  - Implement log sampling for high-volume services

### S2: HTTP Response Header Inconsistencies
- **Component**: Collection Service HTTP API
- **Description**: Non-standard or missing HTTP headers in responses
- **Impact**: 
  - Minor integration issues with strict clients
  - Missed opportunities for caching/security
- **Detection**:
  - API contract testing shows missing headers
  - Security scanners flag missing security headers
- **Root Causes**:
  - Omission in HTTP handler implementation
  - Over-reliance on framework defaults
- **Mitigation**:
  - Standardize response headers
  - Add security headers (X-Content-Type-Options, etc.)
  - Implement API contract testing

### S3: Configuration Documentation Gaps
- **Component**: Deployment/documentation
- **Description**: Some configuration options not well documented
- **Impact**: 
  - Longer setup time for new operators
  - Potential misconfiguration
- **Detection**:
  - Users asking about undocumented parameters
  - Configuration through trial and error
  - Missing examples in README/docs
- **Root Causes**:
  - Documentation not updated with new features
  - Assumption that code is self-documenting
- **Mitigation**:
  - Update configuration reference guide
  - Add examples to documentation
  - Implement config validation with helpful errors

### S4: Non-Critical Panic Recoveries
- **Component**: Collection Service Go runtime
- **Description**: Recovered panics that don't affect core functionality
- **Impact**: 
  - Noise in logs
  - Potential minor metric inaccuracies
- **Detection**:
  - "recovered from panic" messages in logs
  - Associated with specific edge cases
- **Root Causes**:
  - Edge case in error handling
  - Assumption violated in rare circumstances
  - Panic during cleanup/shutdown
- **Mitigation**:
  - Fix root cause to eliminate panic
  - Ensure panics don't affect request processing
  - Add more specific error handling

### S5: Temporary Inconsistencies During Deploy
- **Component**: Rolling updates
- **Description**: Brief period where SDK and service versions mismatch during upgrade
- **Impact**: 
  - Small percentage of events may be rejected or processed with old schema
  - Temporary increase in error metrics
- **Detection**:
  - Spike in validation errors during deploy window
  - Mixed version indicators in logs
- **Root Causes**:
  - Incompatible changes between versions
  - Lack of backward/forward compatibility
- **Mitigation**:
  - Use blue/green or canary deployment strategies
  - Ensure backward compatibility for at least one version
  - Implement feature flags for gradual rollout

## Error Handling Guidelines

### For Developers
1. **Fail Fast**: Validate inputs early and return clear errors
2. **Log Context**: Include trace_id, span_id, agent_id in all error logs
3. **Don't Hide Errors**: Never swallow errors without logging
4. **Graceful Degradation**: When possible, continue with reduced functionality
5. **SDK Resilience**: SDKs must never crash the host application

### For Operators
1. **Monitor Key Metrics**: 
   - Event ingestion rate
   - Storage write latency
   - SDK queue depths
   - Consumer group lag
2. **Set Up Alerts**:
   - Zero incoming events for 5+ minutes
   - Storage write failure rate > 1%
   - Collection service CPU > 80% for 5+ minutes
   - Any grave error detection
3. **Runbook Adherence**: Follow documented procedures for each error type
4. **Post-Incident Review**: Document resolution and preventive measures

## Error Detection and Monitoring

### Built-in Health Checks
- Collection Service `/health` endpoint:
  - Checks database connectivity
  - Checks Redpanda producer connectivity
  - Checks memory usage
  - Checks batcher health
- SDK health: Local queue size, connection status

### Recommended Monitoring (Prometheus)
```
# Collection Service
collection_service_events_received_total
collection_service_batch_size
collection_service_storage_write_errors_total
collection_service_memory_bytes
collection_service_goroutines

# TimescaleDB (via postgres_exporter)
postgres_database_size_bytes
postgres_tuples_inserted_total
postgres_max_connections
postgres_replication_delay_seconds

# Redpanda
redpanda_broker_under_replicated_partitions
redpanda_broker_offline_replicas_count
redpanda_topic_partition_current_offset
redpanda_consumer_group_lag

# Business Metrics
llm_observer_events_per_second
llm_observer_unique_agents_5m
llm_observer_avg_latency_ms
llm_observer_total_cost_usd
```

### Log-based Detection
- Search for `ERROR` level logs across all components
- Monitor for repeated warning patterns that may precede failures
- Track restart frequency of services
- Alert on missing expected log patterns (indicating silent failure)

