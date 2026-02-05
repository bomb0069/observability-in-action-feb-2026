# Lab 15: Distributed Tracing with LGTM Stack

## Overview

This lab demonstrates **Distributed Tracing** across multiple services using the LGTM stack (Loki, Grafana, Tempo, Mimir). The architecture includes:

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

**Java (User Service)**:

- Uses OpenTelemetry Java Agent
- Bytecode instrumentation at JVM startup
- Automatically instruments Spring Boot, JDBC, HTTP clients

**Node.js (Point Service)**:

- Uses `@opentelemetry/auto-instrumentations-node`
- Loaded with `-r` flag before application
- Automatically instruments HTTP, Express, MySQL2

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
cd lab15
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

### 3. Generate Distributed Traces

**Single Request**:

```bash
curl http://localhost:8080/api/v1/users/1
```

**Load Testing** (generates multiple distributed traces):

```bash
k6 run scripts/load.js
```

## Viewing Traces in Grafana

### 1. Open Grafana

Navigate to: http://localhost:3000

- Username: `admin`
- Password: `admin`

### 2. Navigate to Tempo

1. Click **Explore** (compass icon) in the left sidebar
2. Select **Tempo** from the datasource dropdown

### 3. Query Traces

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

**Search for MySQL Queries**:

```traceql
{ span.db.system = "mysql" }
```

### 4. Analyze a Distributed Trace

Click on any trace to see:

1. **Service Graph**: Visual representation of service calls
2. **Span Timeline**: Time spent in each service
3. **Span Details**:
   - HTTP request/response details
   - Database queries
   - Error stack traces (if any)
4. **Trace Context Propagation**: See how `traceparent` header is propagated

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
OTEL_TRACES_EXPORTER: otlp
OTEL_METRICS_EXPORTER: otlp
OTEL_LOGS_EXPORTER: otlp
```

`package.json` start script:

```json
"start": "node -r ./tracing.js dist/index.js"
```

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
