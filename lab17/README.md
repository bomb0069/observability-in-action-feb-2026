# Lab 17: Tail-Based Sampling for Distributed Tracing

## Overview

This lab demonstrates **Tail-Based Sampling** using OpenTelemetry Collector. Unlike head-based sampling (Lab 16) which makes sampling decisions at trace start, tail-based sampling waits for the trace to complete before deciding whether to keep it. This enables smart sampling policies like **always keeping error traces** while sampling successful traces.

The architecture includes:

- **User Service**: Java/Spring Boot with OpenTelemetry Java Agent (sends all traces)
- **Point Service**: Node.js/Express with OpenTelemetry auto-instrumentation (sends all traces)
- **OpenTelemetry Collector**: Tail-based sampling processor (keeps 100% errors, 10% success)
- **PostgreSQL**: User database (20 users)
- **MySQL**: Point database (44 point records)
- **LGTM Stack**: All-in-one observability platform (Grafana, Tempo for traces)

## Architecture

```
┌─────────────┐      HTTP      ┌──────────────┐      SQL      ┌──────────┐
│             │────────────────>│              │──────────────>│          │
│ User Service│                 │Point Service │               │  MySQL   │
│  (Java)     │<────────────────│  (Node.js)   │<──────────────│ 20 users │
│ Always On   │   Response      │  Always On   │   Results     │ 44 points│
└─────┬───────┘                 └──────┬───────┘               └──────────┘
      │                                │
      │ SQL                            │ All Traces (100%)
      ▼                                ▼
┌──────────────┐              ┌────────────────────┐
│              │              │                    │
│ PostgreSQL   │              │ OTel Collector     │
│ 20 users     │              │ Tail Sampling:     │
└──────────────┘              │ - 100% errors      │
                              │ - 10% success      │
                              └─────────┬──────────┘
                                        │ Sampled Traces
                                        ▼
                              ┌───────────────┐
                              │               │
                              │ LGTM Stack    │
                              │ (Tempo)       │
                              └───────────────┘
```

## Test Data

- **20 Users**: Distributed across 4 organizations
  - Org 1: Somchai, Ekkasit, Boonchuay, Manee, Prasert
  - Org 2: Suda, Anong, Wichai, Kulap, Somjai
  - Org 3: Nittaya, Chalerm, Rattana, Siriporn, Surasak
  - Org 4: Pirom, Waraporn, Chaiyaporn, Nopparat, Monthira

- **44 Point Records**: Each user has 2+ point entries
  - Welcome bonuses (90-200 points)
  - Activity rewards (purchase, referral, survey, daily login)

- **Load Test Configuration**:
  - 50 virtual users (same as Lab 16)
  - 3-minute duration
  - Random user IDs (1-20)
  - Error simulation: User Service 5% (1/20), Point Service 20% (1/5)

## What is Tail-Based Sampling?

**Tail-based sampling** makes sampling decisions AFTER a trace completes, allowing smart policies based on trace attributes:

### Head-Based vs Tail-Based Sampling

| Aspect | Head-Based (Lab 16) | Tail-Based (Lab 17) |
|--------|---------------------|---------------------|
| **Decision Point** | At trace start | After trace completes |
| **Can sample by error?** | ❌ No | ✅ Yes |
| **Can sample by duration?** | ❌ No | ✅ Yes |
| **Requires Collector?** | ❌ No | ✅ Yes |
| **Memory usage** | Low | Higher (buffers traces) |
| **Best for** | Simple sampling | Smart policies |

### Tail-Based Sampling Policies (Lab 17)

This lab uses three policies in the OpenTelemetry Collector:

1. **Always Keep Errors** (`status_code` policy)
   - Keeps 100% of traces with ERROR status
   - Ensures all failed requests are visible

2. **Always Keep HTTP Errors** (`string_attribute` policy)
   - Keeps traces with HTTP 5xx status codes (500, 502, 503, 504)
   - Catches errors that might not set span status

3. **Probabilistic Sampling** (`probabilistic` policy)
   - Keeps 10% of successful traces
   - Reduces storage for normal operations

### Expected Results

For 1000 requests with ~5-20% error rate:
- **All error traces**: ~100-200 traces (100% of errors)
- **Sample of success**: ~80-90 traces (10% of success)
- **Total**: ~180-290 traces vs 100 traces in Lab 16

**Key advantage**: You never miss error traces!

## What is Distributed Tracing?

Distributed tracing tracks requests as they flow through multiple services in a distributed system. Each trace consists of:

- **Trace**: A unique identifier for the entire request journey
- **Spans**: Individual operations within the trace (e.g., HTTP request, database query)
- **Trace Context**: Propagated headers that link spans across services

### Zero-Code Instrumentation

Both services use **zero-code instrumentation** with `always_on` sampling:

- Services send 100% of traces to OpenTelemetry Collector
- Collector performs tail-based sampling
- No code changes required in applications

## OpenTelemetry Collector Configuration

The collector uses the `tail_sampling` processor with three policies:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s  # Wait for trace to complete
    num_traces: 10000   # Buffer size
    
    policies:
      # Policy 1: Keep all error traces
      - name: error-traces
        type: status_code
        status_code:
          status_codes: [ERROR]
      
      # Policy 2: Keep HTTP 5xx errors
      - name: error-attributes
        type: string_attribute
        string_attribute:
          key: http.status_code
          values: ["500", "502", "503", "504"]
      
      # Policy 3: Sample 10% of success
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
```

### How It Works

1. **Services send all traces** to collector (always_on sampling)
2. **Collector buffers traces** for 10 seconds (decision_wait)
3. **After trace completes**, collector checks policies:
   - Has ERROR status? → Keep
   - Has HTTP 5xx? → Keep
   - Otherwise → 10% probability
4. **Sampled traces** forwarded to Tempo in LGTM stack

## What is Head-Based Sampling?

Head-based sampling is a decision made at the **start of a trace** (the "head") to determine whether the entire trace should be collected. The sampling decision is based on the trace ID and is propagated to all downstream services.

### Key Characteristics

- **Decision Point**: Made at the root span (first service in the chain)
- **Propagation**: Sampling decision is passed to all child services
- **Deterministic**: Same trace ID always gets the same sampling decision
- **Consistent**: Either all spans in a trace are collected, or none are

### Sampling Configuration

In this lab, both services use:

```yaml
OTEL_TRACES_SAMPLER: traceidratio
OTEL_TRACES_SAMPLER_ARG: "0.1"
```

This means:

- **10% of traces** will be collected
- **90% of traces** will be dropped
- For 1000 requests: ~100 traces stored (90% reduction)

## Architecture

## Services

### User Service (Java/Spring Boot)

- **Port**: 8080
- **Database**: PostgreSQL (user-db)
- **Sampling**: Always on (100%), collector does tail-based sampling
- **Error Rate**: 5% (1 in 20 requests)
- **Endpoints**:
  - `GET /api/v1/users/{id}` - Get user with points (distributed call to Point Service)
  - `GET /actuator/health` - Health check
  - `GET /actuator/prometheus` - Prometheus metrics

### Point Service (Node.js/Express)

- **Port**: 8001
- **Database**: MySQL (point-db)
- **Sampling**: Always on (100%), collector does tail-based sampling
- **Error Rate**: 20% (1 in 5 requests)
- **Endpoints**:
  - `GET /health` - Health check
  - `GET /api/v1/points` - Get all points
  - `GET /api/v1/points/user/:userId` - Get user points
  - `GET /api/v1/points/user/:userId/total` - Get total points for user
  - `POST /api/v1/points` - Add points

## Prerequisites

- Docker and Docker Compose
- k6 (for load testing): `brew install k6`

## Getting Started

### 1. Start Services

```bash
cd lab17
docker-compose up -d --build
```

Wait for all services to be healthy (especially otel-collector):

```bash
docker-compose ps
```

### 2. Verify OpenTelemetry Collector

Check that collector is running:

```bash
# Check collector logs
docker-compose logs otel-collector

# Health check
curl http://localhost:13133
```

### 3. Verify Services

**User Service**:

```bash
curl http://localhost:8080/actuator/health
```

**Point Service**:

```bash
curl http://localhost:8001/health
```

### 4. Run Load Test to Generate Traces

Generate traffic including both success and error traces:

```bash
k6 run scripts/load.js
```

The load test will:

- Run 50 virtual users for 3 minutes
- Generate requests to users 1-20
- Create ~5-20% error traces (from user-service and point-service)
- All traces sent to collector, collector applies tail-based sampling

### 5. Observe Tail-Based Sampling

**Key difference from Lab 16**: All error traces will be visible!

```bash
# Make some requests and observe errors
for i in {1..20}; do
  curl http://localhost:8080/api/v1/users/$(shuf -i 1-20 -n 1)
  sleep 0.5
done
```

You'll see some 5xx errors - **these will ALL be in Tempo** due to tail-based sampling.

## Viewing Traces in Grafana

### 1. Open Grafana

Navigate to: http://localhost:3000

- Username: `admin`
- Password: `admin`

### 2. Navigate to Tempo

1. Click **Explore** (compass icon) in the left sidebar
2. Select **Tempo** from the datasource dropdown

### 3. Query Traces

**Key observation**: With tail-based sampling, you'll see **ALL error traces** plus 10% of success traces.

**Search for ALL Errors** (should see 100% of errors):

```traceql
{ status = error }
```

**Search by Service Name**:

```traceql
{ resource.service.name = "user-service" }
```

**Search for Distributed Traces** (spans from both services):

```traceql
{ span.kind = "client" && span.http.method = "GET" }
```

**Search for Traces with Errors**:

```traceql
{ status = error }
```

**Search for Traces to Point Service**:

```traceql
{ resource.service.name = "point-service" }
```

**Search for User Service Errors** (1/20 = 5% error rate):

```traceql
{ resource.service.name = "user-service" && status = error }
```

**Search for Point Service Errors** (1/5 = 20% error rate):

```traceql
{ resource.service.name = "point-service" && status = error }
```

### 4. Verify All Errors Are Captured

Run this experiment:

1. Generate 100 requests:
```bash
for i in {1..100}; do curl -s http://localhost:8080/api/v1/users/$(shuf -i 1-20 -n 1) > /dev/null; done
```

2. Count errors in application logs:
```bash
docker-compose logs user-service 2>&1 | grep -c "FakeInternalException"
docker-compose logs point-service 2>&1 | grep -c "Simulated error"
```

3. Query error traces in Tempo: `{ status = error }`

4. Compare: Number of errors in logs should match traces in Tempo!

**This is the power of tail-based sampling!**

### 5. Analyze Error Traces

Click on any error trace in Tempo to see:

1. **Service Graph**: Which service caused the error
2. **Span Timeline**: When error occurred in the request flow
3. **Error Details**:
   - Exception stack traces
   - HTTP 500/503 status codes
   - Error messages from user-service or point-service
4. **Full Context**: All spans in the trace, even if error occurred in downstream service

### Example Error Trace from Point Service

```
user-service (GET /api/v1/users/5)         [Total: 120ms] [STATUS: ERROR]
├─ postgres:SELECT * FROM users            [20ms] [OK]
├─ http:GET point-service/api/v1/points    [90ms] [ERROR]
│  └─ point-service (GET /api/v1/points/user/5/total)
│     ├─ Simulated error occurred!         [ERROR: 503]
│     └─ Error: Random error simulation
└─ http:response with error                [10ms] [ERROR]
```

**Note**: Even though error occurred in Point Service, the entire distributed trace is captured!

## Understanding Tail-Based Sampling Flow

### Complete Flow

1. **Application generates trace**
   - User Service creates root span
   - Calls Point Service (child span)
   - All spans sent to collector

2. **Collector receives spans**
   - Buffers all spans for the trace
   - Waits for trace to complete (10 second decision_wait)

3. **Collector applies policies**
   - Checks if trace has ERROR status → Keep
   - Checks if trace has HTTP 5xx → Keep
   - Otherwise: 10% probability → Keep or Drop

4. **Sampled traces forwarded to Tempo**
   - Complete trace (all spans) sent to LGTM
   - Stored in Tempo for querying

### Trace Context Propagation

Trace context is still propagated using W3C Trace Context:

```bash
docker-compose logs point-service | grep traceparent
```

Key difference from Lab 16:
- **Lab 16 (head-based)**: Sampling decision in traceparent header
- **Lab 17 (tail-based)**: All traces sent, collector decides later

## Configuration Details

### Services: Always On Sampling

Both services configured to send ALL traces:

**User Service (Java Agent)**:

```yaml
OTEL_SERVICE_NAME: user-service
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: http://otel-collector:4317
OTEL_TRACES_EXPORTER: otlp
OTEL_TRACES_SAMPLER: always_on  # Send 100% to collector
```

**Point Service (Node.js)**:

```yaml
OTEL_SERVICE_NAME: point-service
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: http://otel-collector:4317
OTEL_TRACES_EXPORTER: otlp
OTEL_TRACES_SAMPLER: always_on  # Send 100% to collector
```

### OpenTelemetry Collector Configuration

File: `otel-collector-config.yaml`

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 10000
    expected_new_traces_per_sec: 100
    
    policies:
      - name: error-traces
        type: status_code
        status_code:
          status_codes: [ERROR]
      
      - name: error-attributes
        type: string_attribute
        string_attribute:
          key: http.status_code
          values: ["500", "502", "503", "504"]
      
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  otlp:
    endpoint: lgtm:4317
    tls:
      insecure: true
```

## Tail-Based Sampling: Benefits and Trade-offs

### Benefits over Head-Based Sampling

✅ **Never Miss Errors**: 100% of error traces captured
✅ **Smart Policies**: Sample based on duration, attributes, etc.
✅ **Better Debugging**: All errors visible for troubleshooting
✅ **Flexible**: Can add custom policies (e.g., slow requests)
✅ **Production-Ready**: Ideal for high-traffic systems with occasional errors

### Trade-offs

⚠️ **Requires Collector**: Need to run OpenTelemetry Collector
⚠️ **Higher Memory**: Collector buffers traces (configurable)
⚠️ **Latency**: decision_wait adds delay (10s default)
⚠️ **Complexity**: More moving parts than head-based sampling

### When to Use Tail-Based Sampling

- ✅ Need to capture ALL errors
- ✅ Want smart sampling policies
- ✅ High-traffic production systems
- ✅ Debugging unknown issues
- ✅ Have infrastructure for collector

### When to Use Head-Based Sampling (Lab 16)

- ✅ Simpler setup (no collector needed)
- ✅ Lower resource usage
- ✅ Deterministic sampling acceptable
- ✅ Can afford to miss some errors
- ✅ Development/staging environments

## Comparison: Lab 16 vs Lab 17

| Aspect | Lab 16 (Head-Based) | Lab 17 (Tail-Based) |
|--------|---------------------|---------------------|
| **Sampling Location** | At trace start | After trace completes |
| **Error Capture** | ~10% of errors | 100% of errors |
| **Success Capture** | 10% of success | 10% of success |
| **Requires Collector** | ❌ No | ✅ Yes |
| **Total Traces** | ~100 (for 1000 req) | ~180-290 (for 1000 req) |
| **Memory Usage** | Low | Medium (collector buffers) |
| **Setup Complexity** | Simple | Medium |
| **Best For** | Dev/Staging | Production |

### Example Numbers (1000 requests, 15% error rate)

**Lab 16 (Head-Based)**:
- All requests sampled at 10%
- Error traces: ~15 (10% of 150 errors) ❌ **Miss 135 errors!**
- Success traces: ~85 (10% of 850 success)
- Total: ~100 traces

**Lab 17 (Tail-Based)**:
- Errors sampled at 100%, success at 10%
- Error traces: ~150 (100% of 150 errors) ✅ **Never miss errors!**
- Success traces: ~85 (10% of 850 success)
- Total: ~235 traces

**Storage cost**: 2.35x more traces but **never miss critical errors**!

## Troubleshooting

### Fewer Traces Than Expected (This is Normal!)

With 10% sampling, you should see significantly fewer traces than requests. This is expected behavior:

```bash
# If k6 makes 1000 requests, you should see ~100 traces in Tempo
# This is the sampling working correctly
```

### No Traces in Tempo

1. **Check service health**:

   ```bash
   docker-compose ps
   ```

2. **Check OTLP endpoint connectivity**:

   ```bash
   docker-compose logs user-service | grep -i otlp
   docker-compose logs point-service | grep -i otlp
   ```

3. **Verify sampling is configured**:

   ```bash
   docker-compose logs user-service | grep -i sampler
   docker-compose logs point-service | grep -i sampler
   ```

4. **Verify LGTM is receiving traces**:
   ```bash
   docker-compose logs lgtm | grep -i trace
   ```

### Want to See All Traces?

To temporarily disable sampling for debugging:

```yaml
# Change in docker-compose.yaml
OTEL_TRACES_SAMPLER: always_on
# Remove or comment out OTEL_TRACES_SAMPLER_ARG
```

Then rebuild:

```bash
docker-compose up -d --build
```

## Troubleshooting

### No Traces in Tempo

1. **Check OpenTelemetry Collector is running**:

   ```bash
   docker-compose ps otel-collector
   docker-compose logs otel-collector
   ```

2. **Verify services send to collector**:

   ```bash
   docker-compose logs user-service | grep -i "otel-collector"
   docker-compose logs point-service | grep -i "otel-collector"
   ```

3. **Check collector forwards to LGTM**:

   ```bash
   docker-compose logs otel-collector | grep -i "lgtm"
   ```

4. **Verify LGTM is receiving traces**:
   ```bash
   docker-compose logs lgtm | grep -i trace
   ```

### Fewer Error Traces Than Expected

If you're not seeing all errors in Tempo:

1. **Check decision_wait time**: Traces need to complete before sampling decision
   ```bash
   # Wait 10+ seconds after generating errors before querying
   sleep 12
   ```

2. **Verify error status is set**: Check application logs
   ```bash
   docker-compose logs user-service | grep -i error
   docker-compose logs point-service | grep -i error
   ```

3. **Check collector policy**:
   ```bash
   cat otel-collector-config.yaml | grep -A 5 "status_code"
   ```

### Collector Memory Issues

If collector runs out of memory:

1. **Reduce buffer size** in `otel-collector-config.yaml`:
   ```yaml
   tail_sampling:
     num_traces: 5000  # Reduce from 10000
     decision_wait: 5s  # Reduce from 10s
   ```

2. **Restart collector**:
   ```bash
   docker-compose restart otel-collector
   ```

### Want to See All Traces for Debugging?

Temporarily change collector to keep all traces:

```yaml
# In otel-collector-config.yaml
policies:
  - name: keep-all
    type: always_sample
```

Then restart:
```bash
docker-compose restart otel-collector
```

## Cleanup

```bash
docker-compose down -v
```

## Key Learnings

1. **Tail-Based Sampling**: Sampling decision made AFTER trace completes
2. **Never Miss Errors**: 100% of error traces captured with tail-based sampling
3. **Smart Policies**: Can sample based on status, duration, attributes, etc.
4. **OpenTelemetry Collector**: Required for tail-based sampling
5. **Best of Both Worlds**: Keep all errors + sample successful traces
6. **Production-Ready**: Ideal for debugging production issues

## Advanced: Custom Sampling Policies

You can add more sophisticated policies to `otel-collector-config.yaml`:

### Sample Slow Requests

```yaml
- name: slow-requests
  type: latency
  latency:
    threshold_ms: 1000  # Keep traces > 1 second
```

### Sample Specific Endpoints

```yaml
- name: important-endpoint
  type: string_attribute
  string_attribute:
    key: http.target
    values:
      - "/api/v1/users/1"  # Always keep user 1 requests
```

### Composite Policy (AND logic)

```yaml
- name: slow-and-specific-service
  type: and
  and:
    and_sub_policy:
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 500
      - name: service-policy
        type: string_attribute
        string_attribute:
          key: service.name
          values: ["point-service"]
```

## Next Steps

- Experiment with different sampling percentages
- Add custom policies for slow requests
- Implement rate limiting policies
- Monitor collector performance and memory
- Compare storage costs: Lab 16 vs Lab 17

## References

- [OpenTelemetry Tail Sampling Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)
- [OpenTelemetry Sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [OpenTelemetry Java Agent](https://github.com/open-telemetry/opentelemetry-java-instrumentation)
- [OpenTelemetry Node.js Auto-Instrumentations](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Grafana Tempo](https://grafana.com/oss/tempo/)
- [LGTM Stack](https://grafana.com/blog/2024/03/13/an-opentelemetry-backend-in-a-docker-image-introducing-grafana/otel-lgtm/)
