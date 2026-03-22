# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Observability workshop lab series (24 labs: Lab00-01–Lab06-03) teaching ELK Stack and LGTM Stack concepts progressively. Written primarily in Thai with English technical terms. Each lab is a self-contained Docker Compose environment. Labs are organized in a 2-layer grouped directory structure: `XX_group/YY_description/`, with lab IDs using `LabGG-NN` format matching the directory structure.

## Common Commands

```bash
# Start a lab (example: ELK Filebeat lab)
cd 02_log/01_elk_filebeat_flog
docker-compose up -d

# View logs / stop
docker-compose logs -f
docker-compose down

# Build & run Spring Boot user-service locally (labs with user/ dir)
cd 03_metrics/01_spring_boot_prometheus/user
mvn spring-boot:run          # or: make run

# Run k6 load test (labs that have scripts/load.js)
docker run --rm -i grafana/k6 run - <scripts/load.js
```

There are no global test suites or linters — each lab is independent.

## Architecture

### Lab Progression

| Group | Path | Focus | Stack |
|-------|------|-------|-------|
| 00_warmup | `01_image_pull/` | Image pre-pull warm-up | All images |
| 01_quickstart | `01_spring_boot_metrics/`, `02_opentelemetry_run/` | Quickstart (metrics + OpenTelemetry) | Prometheus, Grafana, LGTM |
| 02_log | `01_elk_filebeat_flog/` – `06_unified_ecs/` | Logs collection & visualization (ELK) | Elasticsearch, Logstash, Kibana, Filebeat |
| 02_log | `07_lgtm_grafana/`, `08_lgtm_multi_app/` | Logs with LGTM | Loki, Grafana, Promtail |
| 03_metrics | `01_spring_boot_prometheus/` – `03_node_exporter/` | Metrics (app → DB → infra) | Prometheus, Grafana, exporters |
| 04_tracing | `01_distributed_tracing_intro/` – `04_trace_sampling/` | Distributed tracing & sampling | LGTM + OpenTelemetry |
| 05_instrumentation | `01_full_otlp/` | Full OTLP instrumentation (agents + logs) | LGTM + OTel agents |
| 05_instrumentation | `02_ebpf_beyla/` | eBPF auto-instrumentation | Beyla (no agents in apps) |
| 05_instrumentation | `03_log_derived_metrics/` | Log-derived metrics & function timing | LGTM + OTel |
| 06_profiling | `01_pyroscope_intro/` | SDK-based continuous profiling | Pyroscope, LGTM |
| 06_profiling | `02_profiles_and_traces/` | Span profiles (traces + profiling) | Pyroscope, OTel, LGTM |
| 06_profiling | `03_ebpf_profiling/` | eBPF zero-code profiling with Alloy | Alloy, Pyroscope, LGTM |

### Multi-Service Application (01_quickstart/02_opentelemetry_run, 04_tracing/*, 05_instrumentation/*)

Three microservices share a common pattern:

- **user-service** (Spring Boot 3 / Java) — `*/user/`, Maven build, PostgreSQL, Micrometer actuator
- **store-service** (Go) — `01_quickstart/02_opentelemetry_run/store/`, MySQL
- **point-service** (NestJS / TypeScript) — `*/point/`, MySQL

Each service has `tearup/init.sql` for DB schema initialization mounted into `/docker-entrypoint-initdb.d/`.

### Docker Compose Conventions

- `.yml` extension: 00_warmup/01_image_pull, 02_log/*
- `.yaml` extension: 01_quickstart/*, 03_metrics/*, 04_tracing/*, 05_instrumentation/*, 06_profiling/*
- Container names are prefixed per-lab in early labs (e.g., `lab00-elasticsearch`) to avoid conflicts
- Grafana provisioning follows: `grafana/provisioning/{datasources,dashboards}/` + `grafana/dashboards/*.json`
- Prometheus configs: `prometheus/prometheus.yml`
- Log pipeline configs: `filebeat/filebeat.yml`, `logstash/pipeline/logstash.conf`, `promtail/` configs

### Key Ports (when services are running)

| Port | Service |
|------|---------|
| 3000 | Grafana |
| 5601 | Kibana |
| 8080 | user-service (Spring Boot) |
| 9090 | Prometheus |
| 9200 | Elasticsearch |
| 4040 | Pyroscope |
| 4317/4318 | OTLP gRPC/HTTP |

### OpenTelemetry Instrumentation Approaches

- **04_tracing/*, 05_instrumentation/01_full_otlp**: Java agent (`user/agent/opentelemetry-javaagent.jar`), Node.js SDK packages
- **05_instrumentation/02_ebpf_beyla**: Beyla eBPF-based (kernel-level, no agents needed in application code)

## Implementation Roadmap

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the next features to implement (groups 07–10: alerting, SLO, correlation, dashboards).
