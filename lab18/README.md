# Lab 18: Full Observability with LGTM Stack (All OTLP Signals)

## Overview

This lab demonstrates **Full Observability** with all three telemetry signals (traces, metrics, logs) using the LGTM stack (Loki, Grafana, Tempo, Mimir). Unlike Lab 15 which focused on traces only, this lab enables all OTLP signals. The architecture includes:

- **User Service**: Java/Spring Boot application with OpenTelemetry Java Agent (zero-code instrumentation)
- **Point Service**: Node.js/Express application with OpenTelemetry auto-instrumentation (zero-code instrumentation)
- **PostgreSQL**: User database
- **MySQL**: Point database
- **LGTM Stack**: All-in-one observability platform (Grafana, Tempo for traces, Mimir for metrics, Loki for logs)

## Architecture

```
┌─────────────┐      HTTP      ┌──────────────┐      SQL      ┌──────────┐
│             │────────────────>│              │──────────────>│          │
│ User Service│                 │Point Service │               │  MySQL   │
│  (Java)     │<────────────────│  (Node.js)   │<──────────────│          │
│             │   Response      │              │   Results     │          │
└─────┬───────┘                 └──────┬───────┘               └──────────┘
      │                                │
      │ SQL                            │
      ▼                                ▼
┌──────────────┐              ┌───────────────┐
│              │              │               │
│ PostgreSQL   │              │ LGTM Stack    │
│              │              │ (Tempo)       │
└──────────────┘              └───────────────┘
```

## What is Full Observability with OTLP?

This lab demonstrates the **three pillars of observability** using OpenTelemetry Protocol (OTLP):

### 1. **Traces** - Request Journey
- Track requests as they flow through multiple services
- Each trace consists of spans representing operations
- Propagated context links spans across services

### 2. **Metrics** - Performance Indicators
- HTTP request duration, request rate, error rate
- Database query performance
- JVM/Node.js runtime metrics
- Application-specific business metrics

### 3. **Logs** - Event Records
- Application logs with trace context correlation
- Structured logging for better querying
- Automatic trace ID injection for correlation

### Zero-Code Instrumentation

Both services use **zero-code instrumentation** for all three signals:

- No code changes required to enable observability
- No OpenTelemetry SDK dependencies in application code
- Configuration through environment variables only

**Java (User Service)**:

- Uses OpenTelemetry Java Agent
- Bytecode instrumentation at JVM startup
- Automatically instruments Spring Boot, JDBC, HTTP clients
- **Exports**: Traces, Metrics, and Logs via OTLP/gRPC

**Node.js (Point Service)**:

- Uses `@opentelemetry/auto-instrumentations-node`
- Loaded with `-r` flag before application
- Automatically instruments HTTP, Express, MySQL2
- **Exports**: Traces, Metrics, and Logs via OTLP/gRPC

## Services

### User Service (Java/Spring Boot)

- **Port**: 8080
- **Database**: PostgreSQL (user-db)
- **Endpoints**:
  - `GET /api/v1/users/{id}` - Get user with points (distributed call to Point Service)
  - `GET /actuator/health` - Health check
  - `GET /actuator/prometheus` - Prometheus metrics

### Point Service (Node.js/Express)

- **Port**: 8001
- **Database**: MySQL (point-db)
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
cd lab18
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

### 3. Generate Telemetry Data

**Single Request**:

```bash
curl http://localhost:8080/api/v1/users/1
```

This single request generates:
- **Traces**: Distributed trace across user-service → point-service → databases
- **Metrics**: HTTP request duration, database query latency, JVM/Node.js metrics
- **Logs**: Application logs with trace context (trace_id, span_id)

**Load Testing** (generates continuous telemetry):

```bash
k6 run scripts/load.js
```

## Viewing Telemetry in Grafana

### 1. Open Grafana

Navigate to: http://localhost:3000

- Username: `admin`
- Password: `admin`

### 2. Explore Traces (Tempo)

1. Click **Explore** (compass icon) in the left sidebar
2. Select **Tempo** from the datasource dropdown

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

### 3. Explore Metrics (Mimir/Prometheus)

1. Click **Explore** in the left sidebar
2. Select **Prometheus** or **Mimir** from the datasource dropdown

**HTTP Request Rate**:

```promql
sum(rate(http_server_duration_milliseconds_count[5m])) by (service_name)
```

**HTTP Request Duration (p95)**:

```promql
histogram_quantile(0.95, sum(rate(http_server_duration_milliseconds_bucket[5m])) by (le, service_name))
```

**Database Query Duration**:

```promql
rate(db_client_operation_duration_milliseconds_sum[5m]) / rate(db_client_operation_duration_milliseconds_count[5m])
```

**JVM Memory Usage** (User Service):

```promql
process_runtime_jvm_memory_usage_bytes{service_name="user-service"}
```

**Node.js Event Loop Lag** (Point Service):

```promql
nodejs_eventloop_lag_seconds{service_name="point-service"}
```

### 4. Explore Logs (Loki)

1. Click **Explore** in the left sidebar
2. Select **Loki** from the datasource dropdown

**All Logs from User Service**:

```logql
{service_name="user-service"}
```

**Logs with Errors**:

```logql
{service_name="user-service"} |= "ERROR"
```

**Logs Correlated with Specific Trace**:

```logql
{service_name="user-service"} | json | trace_id="<your-trace-id>"
```

### 5. Correlate Traces, Metrics, and Logs

When viewing a trace in Tempo:
1. Click on any span
2. Look for **Logs** button to see correlated logs
3. Click **Metrics** to see related metrics
4. Use the **trace_id** to find logs in Loki

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

### User Service (Java Agent)

Environment variables in `docker-compose.yaml`:

```yaml
OTEL_SERVICE_NAME: user-service
OTEL_EXPORTER_OTLP_ENDPOINT: http://lgtm:4317
OTEL_EXPORTER_OTLP_PROTOCOL: grpc
# All three signals enabled
OTEL_TRACES_EXPORTER: otlp
OTEL_METRICS_EXPORTER: otlp
OTEL_LOGS_EXPORTER: otlp
```

### Point Service (Auto-Instrumentation)

Environment variables in `docker-compose.yaml`:

```yaml
OTEL_SERVICE_NAME: point-service
OTEL_EXPORTER_OTLP_ENDPOINT: http://lgtm:4317
OTEL_EXPORTER_OTLP_PROTOCOL: grpc
# All three signals enabled
OTEL_TRACES_EXPORTER: otlp
OTEL_METRICS_EXPORTER: otlp
OTEL_LOGS_EXPORTER: otlp
```

`package.json` start script:

```json
"start": "node -r ./tracing.js dist/index.js"
```

## Key Differences from Lab 15

| Feature | Lab 15 | Lab 18 |
|---------|--------|--------|
| **Traces** | ✅ Enabled | ✅ Enabled |
| **Metrics** | ❌ Not configured | ✅ Enabled |
| **Logs** | ❌ Not configured | ✅ Enabled |
| **OTLP Endpoint** | Traces only | All signals |
| **Use Case** | Distributed tracing | Full observability |
| **Correlation** | Traces only | Traces ↔ Metrics ↔ Logs |

## Troubleshooting

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

3. **Verify LGTM is receiving traces**:
   ```bash
   docker-compose logs lgtm | grep -i trace
   ```

### No Metrics in Mimir/Prometheus

1. **Check metrics exporter**:
   ```bash
   docker-compose logs user-service | grep -i metric
   ```

2. **Query Prometheus directly**:
   Navigate to http://localhost:9090 (if exposed) or use Grafana Explore

### No Logs in Loki

1. **Check logs exporter**:
   ```bash
   docker-compose logs user-service | grep -i log
   ```

2. **Verify log format** - should include trace_id and span_id

### Trace Context Not Propagated

1. **Check HTTP client instrumentation**:
   - User Service: Java Agent automatically instruments RestTemplate
   - Point Service: Check `tracing.js` includes HTTP instrumentation

2. **Verify headers in Point Service**:
   ```bash
   docker-compose logs point-service | grep traceparent
   ```

### Point Service Connection Fails

1. **Check Point Service is running**:

   ```bash
   docker-compose ps point-service
   ```

2. **Verify MySQL is healthy**:

   ```bash
   docker-compose ps point-db
   ```

3. **Check User Service logs**:
   ```bash
   docker-compose logs user-service | grep -i point
   ```

## Cleanup

```bash
docker-compose down -v
```

## Key Learnings

1. **Zero-Code Instrumentation**: Both Java and Node.js support automatic instrumentation without code changes
2. **Trace Context Propagation**: W3C Trace Context standard enables automatic context propagation across services
3. **Multi-Language Tracing**: OpenTelemetry provides consistent tracing across different programming languages
4. **Span Relationships**: Parent-child span relationships show the full request flow
5. **Performance Analysis**: Trace timeline helps identify bottlenecks across services
6. **Error Correlation**: Errors in any service are linked to the full trace for better debugging

## Next Steps

- Add more services to the trace (e.g., cache layer, message queue)
- Implement custom spans for specific business logic
- Set up alerting based on trace data
- Explore span metrics and RED (Rate, Errors, Duration) metrics
- Implement distributed tracing for asynchronous operations

## References

- [OpenTelemetry Java Agent](https://github.com/open-telemetry/opentelemetry-java-instrumentation)
- [OpenTelemetry Node.js Auto-Instrumentations](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Grafana Tempo](https://grafana.com/oss/tempo/)
- [LGTM Stack](https://grafana.com/blog/2024/03/13/an-opentelemetry-backend-in-a-docker-image-introducing-grafana/otel-lgtm/)
