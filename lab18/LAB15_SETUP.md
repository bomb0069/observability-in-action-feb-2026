# Lab 15 Setup Summary

## What Was Created

Lab 15 extends Lab 14 to demonstrate **distributed tracing across multiple services** using the LGTM stack.

### New Components

1. **Point Service** (Node.js/Express + MySQL)
   - REST API for managing user points
   - Zero-code instrumentation with OpenTelemetry auto-instrumentations-node
   - MySQL database backend
2. **Service Integration**
   - User Service (Java) calls Point Service (Node.js) via HTTP
   - Trace context automatically propagated between services
   - End-to-end request visibility across languages and databases

### Architecture

```
User Request → User Service (Java/Spring Boot)
                 ↓
               PostgreSQL
                 ↓
            Point Service (Node.js/Express)
                 ↓
               MySQL
                 ↓
            LGTM Stack (Tempo) ← All traces
```

## Key Files Modified/Created

### Modified Files

1. **lab15/user/src/main/java/com/example/user/UserController.java**
   - Added RestTemplate to call Point Service
   - Modified getUserById endpoint to fetch points from Point Service
   - Returns combined user + points data

2. **lab15/user/src/main/java/com/example/user/RestConfig.java** (NEW)
   - RestTemplate bean configuration
   - Automatically instrumented by Java Agent for trace propagation

3. **lab15/user/src/main/resources/application.yaml**
   - Added point.service.url configuration
   - Default: http://localhost:8001 (overridden in docker-compose)

4. **lab15/docker-compose.yaml**
   - Added point-service configuration
   - Added point-db (MySQL) configuration
   - Updated user-service to depend on point-service
   - Added POINT_SERVICE_URL environment variable

5. **lab15/scripts/load.js**
   - Updated load test to call user endpoint (which triggers distributed tracing)
   - Random user IDs (1-5) for varied traffic patterns

### New Files Created

1. **lab15/point/package.json**
   - Express 4.18.2
   - mysql2 3.6.5
   - @opentelemetry/auto-instrumentations-node 0.40.3
   - @opentelemetry/sdk-node 0.45.1
   - TypeScript 5.3.3

2. **lab15/point/tsconfig.json**
   - TypeScript configuration for ES2020
   - Output to dist/ directory

3. **lab15/point/tracing.js**
   - OpenTelemetry SDK initialization
   - Auto-instrumentation for HTTP, Express, MySQL2
   - OTLP exporter configuration
   - Loaded via -r flag before application starts

4. **lab15/point/src/index.ts**
   - Express REST API with 5 endpoints
   - MySQL connection pool management
   - Error handling and graceful shutdown
   - Health check endpoint

5. **lab15/point/Dockerfile**
   - Multi-stage build (builder + production)
   - TypeScript compilation in builder stage
   - Production stage with only runtime dependencies
   - Starts with: node -r ./tracing.js dist/index.js

6. **lab15/point/tearup/init.sql**
   - MySQL schema creation (points table)
   - Seed data (9 records for 5 users)
   - Total points ranging from 100-500

7. **lab15/point/.dockerignore**
   - Standard Node.js ignore patterns
   - Excludes node_modules, dist, .env files

8. **lab15/README.md**
   - Comprehensive lab documentation
   - Architecture diagrams
   - Setup instructions
   - TraceQL query examples
   - Troubleshooting guide

## Zero-Code Instrumentation

### User Service (Java)

Environment variables only - no code or dependency changes:

```yaml
OTEL_SERVICE_NAME: user-service
OTEL_EXPORTER_OTLP_ENDPOINT: http://lgtm:4317
OTEL_EXPORTER_OTLP_PROTOCOL: grpc
OTEL_TRACES_EXPORTER: otlp
```

Java Agent automatically instruments:

- Spring Boot MVC controllers
- RestTemplate HTTP client
- JDBC database calls
- JPA operations

### Point Service (Node.js)

Environment variables + tracing.js preload:

```yaml
OTEL_SERVICE_NAME: point-service
OTEL_EXPORTER_OTLP_ENDPOINT: http://lgtm:4317
OTEL_EXPORTER_OTLP_PROTOCOL: grpc
OTEL_TRACES_EXPORTER: otlp
```

Auto-instrumentation package instruments:

- Express HTTP server
- HTTP client requests
- MySQL2 database queries
- DNS lookups

## Distributed Tracing Flow

1. **User sends request** → `GET /api/v1/users/1`
2. **User Service receives** → Creates root span
3. **User Service queries PostgreSQL** → Child span
4. **User Service calls Point Service** → HTTP client span
   - Injects W3C Trace Context headers (traceparent)
5. **Point Service receives** → Extracts trace context, creates child span
6. **Point Service queries MySQL** → Grandchild span
7. **Point Service responds** → Span ends
8. **User Service responds** → All spans end
9. **All spans sent to Tempo** → Full trace available in Grafana

## Services Summary

| Service       | Technology               | Port             | Database      | Instrumentation                          |
| ------------- | ------------------------ | ---------------- | ------------- | ---------------------------------------- |
| user-service  | Java/Spring Boot 3       | 8080             | PostgreSQL 16 | OpenTelemetry Java Agent                 |
| point-service | Node.js 20/Express       | 8001             | MySQL 8.3     | OpenTelemetry auto-instrumentations-node |
| lgtm          | Grafana/Tempo/Mimir/Loki | 3000, 4317, 4318 | N/A           | N/A                                      |

## Endpoints

### User Service (8080)

- `GET /api/v1/users/{id}` - Get user with points (distributed trace!)
- `GET /actuator/health` - Health check
- `GET /actuator/prometheus` - Metrics

### Point Service (8001)

- `GET /health` - Health check
- `GET /api/v1/points` - List all points
- `GET /api/v1/points/user/:userId` - Get user's points history
- `GET /api/v1/points/user/:userId/total` - Get user's total points
- `POST /api/v1/points` - Add points (JSON body)

## Testing

### Start Services

```bash
cd lab15
docker compose up -d --build
```

### Generate Distributed Traces

```bash
# Single request
curl http://localhost:8080/api/v1/users/1

# Load testing
docker run --rm -i grafana/k6 run - <scripts/load.js
```

### View Traces

1. Open Grafana: http://localhost:3000 (admin/admin)
2. Navigate to Explore → Tempo
3. Search: `{ resource.service.name = "user-service" }`
4. Click any trace to see distributed timeline

## Key Learnings

1. **W3C Trace Context**: Standard for propagating trace context across services
2. **Zero-Code Instrumentation**: No SDK dependencies needed in application code
3. **Multi-Language Tracing**: Same observability stack works across Java, Node.js
4. **Automatic Propagation**: HTTP clients/servers automatically handle trace context
5. **Unified Visualization**: Single trace shows full request path across all services

## Next Steps

- Add more services (e.g., notification service, cache layer)
- Implement custom spans for business-critical operations
- Add span events for important milestones
- Set up alerts based on trace data (error rate, latency)
- Explore span metrics and service graphs
