# Lab 16: Head-Based Sampling for Distributed Tracing

## Overview

This lab demonstrates **Head-Based Sampling** in distributed tracing using OpenTelemetry and the LGTM stack. In production environments, collecting 100% of traces can be expensive and unnecessary. This lab shows how to reduce trace storage by 90% while maintaining observability.

The architecture includes:

- **User Service**: Java/Spring Boot with OpenTelemetry Java Agent (10% sampling)
- **Point Service**: Node.js/Express with OpenTelemetry auto-instrumentation (10% sampling)
- **PostgreSQL**: User database (20 users)
- **MySQL**: Point database (44 point records)
- **LGTM Stack**: All-in-one observability platform (Grafana, Tempo for traces, Mimir for metrics, Loki for logs)

## Architecture

```
┌─────────────┐      HTTP      ┌──────────────┐      SQL      ┌──────────┐
│             │────────────────>│              │──────────────>│          │
│ User Service│                 │Point Service │               │  MySQL   │
│  (Java)     │<────────────────│  (Node.js)   │<──────────────│ 20 users │
│ 10% Sample  │   Response      │  10% Sample  │   Results     │ 44 points│
└─────┬───────┘                 └──────┬───────┘               └──────────┘
      │                                │
      │ SQL                            │ Traces (10% sampled)
      ▼                                ▼
┌──────────────┐              ┌───────────────┐
│              │              │               │
│ PostgreSQL   │              │ LGTM Stack    │
│ 20 users     │              │ (Tempo)       │
└──────────────┘              └───────────────┘
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
  - 50 virtual users (increased from 10 in Lab 15)
  - 3-minute duration
  - Random user IDs (1-20, increased from 1-5 in Lab 15)

## What is Distributed Tracing?

Distributed tracing tracks requests as they flow through multiple services in a distributed system. Each trace consists of:

- **Trace**: A unique identifier for the entire request journey
- **Spans**: Individual operations within the trace (e.g., HTTP request, database query)
- **Trace Context**: Propagated headers that link spans across services

### Zero-Code Instrumentation

Both services use **zero-code instrumentation**, meaning:

- No code changes required to enable tracing
- No OpenTelemetry SDK dependencies in application code
- Configuration through environment variables only

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
- **Sampling**: 10% of traces (traceidratio)
- **Endpoints**:
  - `GET /api/v1/users/{id}` - Get user with points (distributed call to Point Service)
  - `GET /actuator/health` - Health check
  - `GET /actuator/prometheus` - Prometheus metrics

### Point Service (Node.js/Express)

- **Port**: 8001
- **Database**: MySQL (point-db)
- **Sampling**: 10% of traces (traceidratio)
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
cd lab16
docker-compose up -d --build
```

Wait for all services to be healthy:

```bash
docker-compose ps
```

### 2. Verify Services

**User Service**:

```bash
curl http://localhost:8080/actuator/health
```

**Point Service**:

```bash
curl http://localhost:8001/health
```

### 3. Run Load Test

Generate traffic to observe sampling behavior:

```bash
k6 run scripts/load.js
```

The load test will:

- Run 50 virtual users for 3 minutes
- Generate requests to users 1-20
- Create hundreds of requests but only ~10% will have traces

### 4. Verify Sampling Behavior

Check that only a portion of requests are traced:

```bash
# Run this a few times and note the user_id in the response
curl http://localhost:8080/api/v1/users/1
```

Some requests will have traces in Tempo, others won't. This is expected behavior with 10% sampling.

## Viewing Traces in Grafana

### 1. Open Grafana

Navigate to: http://localhost:3000

- Username: `admin`
- Password: `admin`

### 2. Navigate to Tempo

1. Click **Explore** (compass icon) in the left sidebar
2. Select **Tempo** from the datasource dropdown

### 3. Query Traces

**Note**: With 10% sampling, you'll see significantly fewer traces than requests made.

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

### 4. Compare Request Volume vs Trace Volume

1. Check k6 output for total requests made (e.g., 1000 requests)
2. Query traces in Tempo
3. Observe that only ~100 traces exist (10% of total)
4. This demonstrates the 90% storage reduction from sampling

### 5. Analyze a Sampled Distributed Trace

Click on any trace to see:

1. **Service Graph**: Visual representation of service calls
2. **Span Timeline**: Time spent in each service
3. **Span Details**:
   - HTTP request/response details
   - Database queries
   - Error stack traces (if any)
4. **Trace Context Propagation**: Sampling decision propagated across services

### Example Trace Structure

```
user-service (GET /api/v1/users/1)         [Total: 150ms]
├─ postgres:SELECT * FROM users            [20ms]
├─ http:GET point-service/api/v1/points    [100ms]
│  └─ point-service (GET /api/v1/points/user/1/total)
│     └─ mysql:SELECT SUM(points)          [80ms]
└─ http:response serialization             [30ms]
```

## Understanding Trace Context Propagation

When User Service calls Point Service, OpenTelemetry automatically:

1. **Creates trace context** in User Service
2. **Injects W3C Trace Context headers**:
   - `traceparent`: `00-{trace-id}-{span-id}-01`
   - `tracestate`: Additional vendor-specific context
3. **Propagates to Point Service** via HTTP headers
4. **Extracts context** in Point Service
5. **Creates child spans** linked to parent trace
6. **Reports to Tempo** with full trace hierarchy

### Verify Propagation

Check HTTP headers in Point Service logs:

```bash
docker-compose logs point-service | grep traceparent
```

You should see the propagated trace context.

## Configuration Details

### Sampling Configuration

Both services use the same sampling configuration:

```yaml
# Head-based sampling at 10%
OTEL_TRACES_SAMPLER: traceidratio
OTEL_TRACES_SAMPLER_ARG: "0.1"
```

**Available Samplers**:

- `always_on`: Sample 100% of traces (default)
- `always_off`: Sample 0% of traces
- `traceidratio`: Sample based on trace ID (deterministic, used here)
- `parentbased_traceidratio`: Respect parent sampling decision

### User Service (Java Agent)

Environment variables in `docker-compose.yaml`:

```yaml
OTEL_SERVICE_NAME: user-service
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: http://lgtm:4317
OTEL_EXPORTER_OTLP_PROTOCOL: grpc
OTEL_TRACES_EXPORTER: otlp
OTEL_TRACES_SAMPLER: traceidratio
OTEL_TRACES_SAMPLER_ARG: "0.1"
```

### Point Service (Auto-Instrumentation)

Environment variables in `docker-compose.yaml`:

```yaml
OTEL_SERVICE_NAME: point-service
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: http://lgtm:4317
OTEL_EXPORTER_OTLP_PROTOCOL: grpc
OTEL_TRACES_EXPORTER: otlp
OTEL_TRACES_SAMPLER: traceidratio
OTEL_TRACES_SAMPLER_ARG: "0.1"
```

`package.json` start script:

```json
"start": "node -r ./tracing.js dist/index.js"
```

## Sampling Benefits and Trade-offs

### Benefits

✅ **Cost Reduction**: 90% less storage and bandwidth
✅ **Lower Overhead**: Less data to process and transmit
✅ **Still Observable**: 10% is sufficient for identifying patterns
✅ **Scalable**: Can handle high-traffic production systems

### Trade-offs

⚠️ **Might Miss Rare Issues**: Unsampled traces won't be visible
⚠️ **Statistical Approximation**: Metrics need to account for sampling ratio
⚠️ **Not for Critical Transactions**: Consider 100% for financial/medical data

### When to Use Sampling

- ✅ High-traffic applications (millions of requests/day)
- ✅ Cost-sensitive environments
- ✅ Pattern detection and trend analysis
- ✅ Performance profiling

### When NOT to Use Sampling

- ❌ Critical transactions (payments, healthcare)
- ❌ Debugging specific customer issues
- ❌ Low-traffic applications (<1000 requests/day)
- ❌ Compliance/audit requirements

## Comparison: Lab 15 vs Lab 16

| Aspect               | Lab 15 (100%)     | Lab 16 (10%)        |
| -------------------- | ----------------- | ------------------- |
| **Sampling**         | Always on         | traceidratio (0.1)  |
| **Traces Collected** | All requests      | 1 in 10 requests    |
| **Storage Cost**     | Baseline          | 10% of baseline     |
| **Users/Data**       | 3 users, 9 points | 20 users, 44 points |
| **Load Test**        | 10 VUs, 1-5 users | 50 VUs, 1-20 users  |
| **Use Case**         | Development       | Production          |

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

## Cleanup

```bash
docker-compose down -v
```

## Key Learnings

1. **Head-Based Sampling**: Sampling decision made at trace start and propagated to all services
2. **Storage Reduction**: 10% sampling reduces trace storage by 90%
3. **Deterministic Sampling**: `traceidratio` uses trace ID hash for consistent sampling decisions
4. **Observability at Scale**: High-traffic systems don't need 100% of traces
5. **Cost Optimization**: Sampling significantly reduces observability infrastructure costs
6. **Trade-offs**: Sampling might miss rare issues but captures overall patterns

## Advanced Topics: Tail-Based Sampling

Head-based sampling has limitations:

- Can't sample based on span attributes (e.g., always keep errors)
- Can't make smart decisions about trace importance
- Fixed percentage regardless of traffic patterns

**Tail-based sampling** solves these by:

- Making sampling decisions AFTER trace completes
- Keeping all error traces regardless of sampling rate
- Using policies (e.g., keep slow transactions, keep specific endpoints)
- Adaptive sampling based on traffic volume

This requires an **OpenTelemetry Collector** and will be covered in future labs.

## Next Steps

- Experiment with different sampling rates (0.01, 0.5, 1.0)
- Implement tail-based sampling with OpenTelemetry Collector
- Add sampling policies (always keep errors, keep slow traces)
- Monitor sampling efficiency and adjust rates based on traffic
- Compare head-based vs tail-based sampling strategies

## References

- [OpenTelemetry Sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [TraceIdRatioBased Sampler](https://opentelemetry.io/docs/specs/otel/trace/sdk/#traceidratiobased)
- [OpenTelemetry Java Agent](https://github.com/open-telemetry/opentelemetry-java-instrumentation)
- [OpenTelemetry Node.js Auto-Instrumentations](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Grafana Tempo](https://grafana.com/oss/tempo/)
- [LGTM Stack](https://grafana.com/blog/2024/03/13/an-opentelemetry-backend-in-a-docker-image-introducing-grafana/otel-lgtm/)
