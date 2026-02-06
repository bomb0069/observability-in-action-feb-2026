# Lab 19: eBPF-based Auto-Instrumentation with Beyla

## Overview

This lab demonstrates **eBPF-based auto-instrumentation** using Grafana Beyla. Unlike Lab 18 which uses runtime agents (OpenTelemetry Java Agent and Node.js auto-instrumentation), this lab uses **eBPF technology** to instrument applications **without any code changes or runtime agents**. The architecture includes:

- **User Service**: Java/Spring Boot application (no OpenTelemetry agent)
- **Point Service**: Node.js/Express application (no OpenTelemetry SDK)
- **PostgreSQL**: User database
- **MySQL**: Point database
- **Beyla**: eBPF-based auto-instrumentation
- **LGTM Stack**: All-in-one observability platform (Grafana, Tempo for traces, Mimir for metrics, Loki for logs)

## Architecture

```
┌─────────────┐      HTTP      ┌──────────────┐      SQL      ┌──────────┐
│             │────────────────>│              │──────────────>│          │
│ User Service│                 │Point Service │               │  MySQL   │
│  (Java)     │<────────────────│  (Node.js)   │<──────────────│          │
│             │   Response      │              │   Results     │          │
└─────────────┘                 └──────────────┘               └──────────┘
      │                                │
      │                                │
      │                                │
      └────────────┬───────────────────┘
                   │
                   │ eBPF instrumentation (kernel-level)
                   │
              ┌────▼─────┐
              │          │
              │  Beyla   │ ────OTLP────> LGTM Stack
              │  (eBPF)  │                (Tempo/Mimir)
              │          │
              └──────────┘
```

## What is eBPF-based Auto-Instrumentation?

**eBPF (extended Berkeley Packet Filter)** is a technology that allows running sandboxed programs in the Linux kernel without changing kernel source code. Beyla uses eBPF to instrument applications by:

### Key Differences from Lab 18 (Runtime Agents)

| Aspect                        | Lab 18 (Runtime Agents)                                   | Lab 19 (eBPF/Beyla)                              |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| **Instrumentation Level**     | Application runtime (JVM bytecode, Node.js require hooks) | Kernel level (network syscalls, function probes) |
| **Code Changes**              | None (zero-code)                                          | None (truly zero-code)                           |
| **Agent Required**            | Yes (Java Agent, Node.js SDK)                             | No agents in application                         |
| **Performance Impact**        | Moderate (bytecode manipulation)                          | Low (kernel-level monitoring)                    |
| **Language Support**          | Language-specific agents                                  | Language-agnostic                                |
| **Trace Context Propagation** | Automatic (W3C Trace Context headers)                     | Network-based correlation                        |
| **Metrics Collected**         | Runtime + HTTP + Database                                 | HTTP/gRPC + Network                              |
| **Logs**                      | Application logs with trace correlation                   | Not collected by Beyla                           |

### How Beyla Works

1. **Process Discovery**: Finds target processes by port or executable name
2. **eBPF Probes**: Attaches probes to kernel functions and HTTP/gRPC libraries
3. **Network Monitoring**: Captures HTTP requests/responses at network layer
4. **Trace Generation**: Creates OpenTelemetry traces from network calls
5. **Metrics Export**: Generates RED (Rate, Errors, Duration) metrics
6. **OTLP Export**: Sends traces and metrics to OTLP endpoint

### Benefits of eBPF Instrumentation

✅ **Zero overhead in application**: No agents loaded into application memory  
✅ **Language-agnostic**: Works with any language (Java, Node.js, Go, Python, etc.)  
✅ **No dependencies**: Applications run as-is without any instrumentation libraries  
✅ **Network-level visibility**: Captures all HTTP traffic regardless of framework  
✅ **Retroactive instrumentation**: Can instrument already-running applications

### Limitations

❌ **No automatic log correlation**: Cannot inject trace IDs into application logs  
❌ **Limited internal visibility**: Cannot see internal function calls or database queries  
❌ **Linux kernel required**: Requires kernel 4.x+ with eBPF support  
❌ **Privileged access**: Needs `SYS_ADMIN`, `SYS_PTRACE`, `SYS_RESOURCE` capabilities

## Services

### User Service (Java/Spring Boot)

- **Port**: 8080
- **Database**: PostgreSQL (user-db)
- **Instrumentation**: None (pure Spring Boot application)
- **Dockerfile**: `Dockerfile.noagent` (no OpenTelemetry Java Agent)
- **Endpoints**:
  - `GET /api/v1/users/{id}` - Get user with points (distributed call to Point Service)
  - `GET /actuator/health` - Health check
  - `GET /actuator/prometheus` - Prometheus metrics

### Point Service (Node.js/Express)

- **Port**: 8001
- **Database**: MySQL (point-db)
- **Instrumentation**: None (pure Express application)
- **Dockerfile**: `Dockerfile.noagent` (no OpenTelemetry SDK)
- **Endpoints**:
  - `GET /health` - Health check
  - `GET /api/v1/points` - Get all points
  - `GET /api/v1/points/user/:userId` - Get user points
  - `GET /api/v1/points/user/:userId/total` - Get total points for user
  - `POST /api/v1/points` - Add points

### Beyla (eBPF Instrumentation)

- **Image**: `grafana/beyla:latest`
- **Mode**: Host network and PID namespace
- **Configuration**: `beyla/beyla-config.yml`
- **Capabilities**: `SYS_ADMIN`, `SYS_PTRACE`, `SYS_RESOURCE`
- **Discovery**:
  - User Service: Port 8080, executable pattern `java`
  - Point Service: Port 8001, executable pattern `node`

## Prerequisites

- Docker and Docker Compose
- Linux kernel 4.x+ with eBPF support
- k6 (for load testing): `brew install k6`

## Getting Started

### 1. Start Services

```bash
cd lab19
docker-compose up -d --build
```

**Note**: Beyla requires privileged access to attach eBPF probes. The container runs with:

- `privileged: true`
- `cap_add: SYS_ADMIN, SYS_PTRACE, SYS_RESOURCE`
- `pid: host` (access host PID namespace)
- `network_mode: host` (access host network)

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

**Beyla Logs** (verify instrumentation):

```bash
docker-compose logs beyla
```

You should see:

```
INF Discovered service: user-service (pid: XXXX, port: 8080)
INF Discovered service: point-service (pid: XXXX, port: 8001)
INF Attached eBPF probes to HTTP endpoints
```

### 3. Generate Telemetry Data

**Single Request**:

```bash
curl http://localhost:8080/api/v1/users/1
```

This single request generates:

- **Traces**: HTTP spans captured by Beyla at network layer
- **Metrics**: HTTP request duration, request rate, error rate

**Load Testing** (generates continuous telemetry):

```bash
docker run --rm -i grafana/k6 run - <scripts/load.js
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

**Search for Distributed Traces**:

```traceql
{ span.kind = "server" && span.http.method = "GET" }
```

**Compare with Lab 18**: Notice that traces are less detailed:

- No internal spans (database queries, internal methods)
- Only HTTP/network-level spans
- Trace context propagation based on network correlation

### 3. Explore Metrics (Mimir/Prometheus)

1. Click **Explore** in the left sidebar
2. Select **Prometheus** or **Mimir** from the datasource dropdown

**HTTP Request Rate** (Beyla RED metrics):

```promql
sum(rate(http_server_duration_seconds_count[5m])) by (http_target)
```

**HTTP Request Duration (p95)**:

```promql
histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le, http_target))
```

**HTTP Error Rate**:

```promql
sum(rate(http_server_duration_seconds_count{http_status_code=~"5.."}[5m])) / sum(rate(http_server_duration_seconds_count[5m]))
```

## Beyla Configuration

The Beyla configuration is located in [beyla/beyla-config.yml](beyla/beyla-config.yml):

### Service Discovery

```yaml
discovery:
  services:
    - name: user-service
      open_ports: 8080
      exe_path_regexp: "java"
    - name: point-service
      open_ports: 8001
      exe_path_regexp: "node"
```

### OTLP Export

```yaml
otel_traces_export:
  endpoint: http://localhost:4317
  protocol: grpc

otel_metrics_export:
  endpoint: http://localhost:4317
  protocol: grpc
  interval: 30s
```

### Network Instrumentation

```yaml
network:
  enable: true
  cidrs:
    - 0.0.0.0/0 # Monitor all network traffic
```

## Key Observations

### 1. Application Simplicity

Applications run without any observability dependencies:

**User Service** (Java):

- Standard Spring Boot application
- No OpenTelemetry Java Agent
- No `-javaagent` JVM parameter
- Pure business logic

**Point Service** (Node.js):

- Standard Express application
- No OpenTelemetry SDK dependencies
- No `tracing.js` initialization
- Direct `node dist/index.js` startup

### 2. Network-Level Visibility

Beyla captures:

- HTTP method, path, status code
- Request/response duration
- Client IP and port
- Service-to-service communication

### 3. Trace Correlation

Unlike Lab 18 which uses W3C Trace Context headers for trace propagation, Beyla uses **network-based correlation**:

- Matches outgoing requests with incoming responses
- Builds distributed traces from network flow
- Less precise than header-based propagation

### 4. Performance Characteristics

eBPF instrumentation has minimal performance impact because:

- No bytecode manipulation
- No JVM overhead
- No Node.js hook overhead
- Kernel-level monitoring is highly efficient

## Comparison: Lab 18 vs Lab 19

### When to Use Runtime Agents (Lab 18)

✅ Need detailed internal visibility (database queries, method calls)  
✅ Require log correlation with trace IDs  
✅ Want automatic context propagation  
✅ Need framework-specific metrics (JVM, Node.js runtime)  
✅ Have control over application deployment

### When to Use eBPF/Beyla (Lab 19)

✅ Cannot modify application code or deployment  
✅ Need to instrument legacy applications  
✅ Want language-agnostic instrumentation  
✅ Require minimal performance overhead  
✅ HTTP/network-level visibility is sufficient  
✅ Running in containerized/Kubernetes environment

## Cleanup

```bash
cd lab19
docker-compose down -v
```

## Next Steps

- **Lab 20** (future): Hybrid approach - eBPF for network + selective runtime agents
- Explore Beyla's Kubernetes service discovery
- Compare trace detail between runtime agents and eBPF
- Evaluate performance impact differences

## Key Takeaways

1. **eBPF enables truly zero-code instrumentation** - no agents needed in applications
2. **Network-level visibility** - captures all HTTP traffic at kernel level
3. **Language-agnostic** - works with any programming language
4. **Trade-off**: Less detailed traces compared to runtime agents
5. **Ideal for retroactive instrumentation** - can instrument already-deployed applications without restarts
6. **Kubernetes-ready** - Beyla excels in containerized environments

## Resources

- [Grafana Beyla Documentation](https://grafana.com/docs/beyla/)
- [eBPF Documentation](https://ebpf.io/)
- [OpenTelemetry Protocol (OTLP)](https://opentelemetry.io/docs/specs/otlp/)
- [LGTM Stack Overview](https://grafana.com/docs/grafana-cloud/monitor-applications/application-observability/)
