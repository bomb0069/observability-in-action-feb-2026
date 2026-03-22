# Implementation Plan: Observability Workshop — Next Labs

> This document serves as the roadmap for extending the observability workshop.
> AI Agents and Developers should use this as a guide for what to implement next.
> Each feature is self-contained and includes enough context to be built independently.

---

## Current State (as of 2026-03-22)

28 labs across 7 groups covering: warmup, quickstart, logs (ELK + LGTM), metrics, tracing, instrumentation (OTLP + eBPF), and profiling (Pyroscope).

**What exists:**
- Log collection & visualization (ELK + Loki)
- Metrics collection (Prometheus, exporters)
- Distributed tracing (Tempo, sampling strategies)
- Full OTLP instrumentation + eBPF zero-code
- Continuous profiling + span-profile linking
- Partial cross-signal correlation (traces→logs, traces→profiles in Lab06-02)

**What's missing:**
- Alerting & notification
- SLO/SLI/Error budgets
- Cross-signal correlation (exemplars, metrics↔traces)
- Dashboards-as-code
- Frontend/RUM observability

---

## Implementation Priority Order

### Priority 1: `07_alerting` — Alerting & Notification

**Why first:** The workshop teaches how to *see* problems but never how to *get notified*. This is the most critical operational gap.

---

#### Feature 07-01: `07_alerting/01_prometheus_alertmanager`

**Title:** Basic Alerting with Prometheus Alertmanager

**Goal:** Teach participants to define alert rules in Prometheus and route notifications through Alertmanager.

**What to build:**
1. `docker-compose.yaml` with services:
   - `user-service` (reuse `bomb0069/observability-user-service` image)
   - `user-db` (PostgreSQL 16.3)
   - `prometheus` (with alert rules file mounted)
   - `alertmanager` (with routing config)
   - `grafana` (with Prometheus + Alertmanager datasources)
   - `mailhog` or `webhook.site` container for notification sink
2. `prometheus/prometheus.yml` — scrape config + `rule_files` reference
3. `prometheus/alert-rules.yml` — alert rules:
   - `HighErrorRate` — `rate(http_server_requests_seconds_count{status=~"5.."}[5m]) / rate(http_server_requests_seconds_count[5m]) > 0.05`
   - `ServiceDown` — `up == 0`
   - `HighLatency` — `histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m])) > 1`
4. `alertmanager/alertmanager.yml` — route config with receiver (webhook/email to mailhog)
5. `grafana/provisioning/datasources/datasource.yml` — Prometheus + Alertmanager datasources
6. `scripts/load.js` — k6 script that generates both normal and error traffic
7. `README.md` — Thai-primary documentation following existing format

**Key concepts to teach:**
- Pending → Firing → Resolved lifecycle
- `for` duration (avoid flapping)
- Labels and annotations in alerts
- Alertmanager grouping, inhibition, silencing

**Ports:** 8080 (user-service), 9090 (Prometheus), 9093 (Alertmanager), 3000 (Grafana), 8025 (Mailhog UI)

**Reference patterns:** Base on `03_metrics/01_spring_boot_prometheus` for Prometheus setup. Add Alertmanager layer.

---

#### Feature 07-02: `07_alerting/02_grafana_alerting`

**Title:** Grafana Unified Alerting

**Goal:** Teach Grafana's built-in alerting system (Grafana 9+ Unified Alerting) as an alternative to Alertmanager.

**What to build:**
1. `docker-compose.yaml` with services:
   - `user-service` + `point-service` (multi-service for richer alert scenarios)
   - `user-db` (PostgreSQL), `db` (MySQL)
   - `lgtm` (grafana/otel-lgtm — all-in-one with Grafana, Loki, Tempo, Mimir)
2. `grafana/provisioning/alerting/` — provisioned alert rules as YAML:
   - Alert on high error rate (from Mimir/Prometheus metrics)
   - Alert on log error spike (from Loki log queries)
   - Alert on high trace latency (from Tempo metrics)
3. `grafana/provisioning/alerting/contact-points.yml` — webhook contact point
4. `grafana/provisioning/alerting/notification-policies.yml` — routing by severity label
5. `scripts/load.js` — k6 load test generating mixed traffic
6. `README.md` — compare Grafana Alerting vs Alertmanager approach

**Key concepts to teach:**
- Grafana alert rules (multi-datasource: metrics, logs, traces)
- Contact points and notification policies
- Alert state history and annotations on dashboards
- Provisioning alerts as code (YAML)

**Ports:** 3000 (Grafana/LGTM), 4317/4318 (OTLP), 8080 (user-service), 8001 (point-service)

**Reference patterns:** Base on `05_instrumentation/01_full_otlp` for multi-service + LGTM setup.

---

#### Feature 07-03: `07_alerting/03_alert_routing_multi_channel`

**Title:** Alert Routing, Grouping & Multi-Channel Notification

**Goal:** Advanced alerting — route different alert severities to different channels, demonstrate grouping and inhibition.

**What to build:**
1. `docker-compose.yaml` — extend 07-01 setup with:
   - Multiple notification sinks (webhook containers simulating Slack, PagerDuty, email)
   - `alertmanager` with complex routing tree
2. `alertmanager/alertmanager.yml` — advanced config:
   - Route `critical` → PagerDuty-like webhook
   - Route `warning` → Slack-like webhook
   - Route `info` → email (Mailhog)
   - Inhibition rules (critical inhibits warning for same service)
   - Grouping by `alertname` and `service`
3. `prometheus/alert-rules.yml` — tiered alerts with severity labels:
   - `critical`: service completely down, error rate > 50%
   - `warning`: error rate > 10%, latency p95 > 2s
   - `info`: high request volume, approaching resource limits
4. `scripts/load.js` — k6 scenarios that trigger different severity levels
5. `README.md` — routing tree visualization, grouping explanation

**Key concepts to teach:**
- Routing tree and label matching
- Grouping (reduce alert noise)
- Inhibition (suppress lower-severity alerts)
- Silencing (maintenance windows)
- Repeat interval and resolved notifications

---

### Priority 2: `08_slo` — SLO, SLI & Error Budgets

**Why second:** After alerting, teams need to define *what good looks like*. SLOs bridge monitoring to business reliability.

---

#### Feature 08-01: `08_slo/01_sli_slo_intro`

**Title:** Defining SLIs and SLOs from Application Metrics

**Goal:** Teach how to define Service Level Indicators from existing Prometheus metrics and set SLO targets.

**What to build:**
1. `docker-compose.yaml` with:
   - `user-service` + `point-service` (reuse existing images)
   - `user-db`, `db` (databases)
   - `prometheus` with recording rules for SLI calculation
   - `grafana` with SLO dashboard
2. `prometheus/prometheus.yml` — scrape + recording rules reference
3. `prometheus/recording-rules.yml` — pre-computed SLI metrics:
   - Availability SLI: `sum(rate(http_server_requests_seconds_count{status!~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m]))`
   - Latency SLI: `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))`
4. `grafana/dashboards/slo-dashboard.json` — dashboard showing:
   - Current SLI values vs SLO targets
   - Error budget remaining (30-day rolling)
   - Burn rate visualization
5. `scripts/load.js` — sustained traffic to build meaningful SLI data
6. `README.md` — explain SLI vs SLO vs SLA, choosing the right SLIs

**Key concepts to teach:**
- SLI (what to measure), SLO (target), SLA (contract)
- Availability and latency as SLIs
- Recording rules for efficient SLI computation
- Error budget = 1 - SLO (e.g., 99.9% SLO = 0.1% error budget)

---

#### Feature 08-02: `08_slo/02_error_budget_burn_rate`

**Title:** Error Budget Tracking and Burn Rate Alerts

**Goal:** Implement multi-window burn rate alerting (Google SRE approach) so alerts fire when error budget is being consumed too fast.

**What to build:**
1. `docker-compose.yaml` — extend 08-01 with Alertmanager
2. `prometheus/alert-rules.yml` — multi-window burn rate alerts:
   - Fast burn: 14.4x burn rate over 1h (2% budget in 1h → pages in 1h)
   - Medium burn: 6x burn rate over 6h
   - Slow burn: 1x burn rate over 3d (consumes budget steadily)
3. `prometheus/recording-rules.yml` — burn rate recording rules:
   - `slo:error_rate:ratio_rate1h`, `slo:error_rate:ratio_rate6h`, `slo:error_rate:ratio_rate3d`
4. `grafana/dashboards/error-budget.json` — dashboard:
   - Error budget remaining over time
   - Burn rate chart (current vs thresholds)
   - Time-to-exhaustion estimate
5. `README.md` — explain why burn rate > simple threshold alerting

**Key concepts to teach:**
- Why simple error rate thresholds fail (too slow or too noisy)
- Multi-window burn rate approach
- Mapping burn rate to alert severity
- Error budget policy (what happens when budget runs out)

---

### Priority 3: `09_correlation` — Cross-Signal Correlation

**Why third:** The workshop covers each pillar separately. This group ties them together for the "aha moment" — clicking from a metric spike → trace → log → profile.

---

#### Feature 09-01: `09_correlation/01_exemplars`

**Title:** Metrics-to-Traces Linking with Exemplars

**Goal:** Enable Prometheus exemplars so users can click from a metric data point directly to the trace that produced it.

**What to build:**
1. `docker-compose.yaml` with:
   - `user-service` (with OTel agent that produces exemplars)
   - `user-db`
   - `prometheus` (with `--enable-feature=exemplar-storage`)
   - `lgtm` (for Tempo trace storage)
   - `grafana` (with both Prometheus and Tempo datasources)
2. `prometheus/prometheus.yml`:
   - `exemplar-storage: true` feature flag
   - Scrape config with `enable_http2: true`
3. `grafana/provisioning/datasources/datasource.yml`:
   - Prometheus datasource with `exemplarTraceIdDestinations` linking to Tempo
   - Tempo datasource
4. `grafana/dashboards/exemplar-dashboard.json`:
   - Histogram panels with exemplar display enabled (`"exemplar": true`)
   - Click-through from exemplar → Tempo trace view
5. `scripts/load.js` — steady traffic to populate exemplars
6. `README.md` — explain what exemplars are, when they're useful

**Key concepts to teach:**
- What exemplars are (trace_id attached to metric samples)
- How OTel Java agent automatically produces exemplars
- Prometheus exemplar storage (separate from TSDB)
- Grafana exemplar visualization and drill-down to traces
- Limitation: exemplars are sampled, not every metric point has one

**Important implementation detail:**
- Spring Boot Actuator with Micrometer + OTel bridge: exemplars require `io.micrometer:micrometer-tracing-bridge-otel` dependency
- Alternatively, use Prometheus remote write from OTel Collector which natively supports exemplars

---

#### Feature 09-02: `09_correlation/02_logs_traces_metrics`

**Title:** Unified Correlation — Logs, Traces, and Metrics

**Goal:** Build the full correlation experience: metric spike → trace → logs → profile, all connected in Grafana.

**What to build:**
1. `docker-compose.yaml` with full stack:
   - `user-service`, `point-service`, `store-service` (all 3 microservices)
   - `user-db` (PostgreSQL), `db` (MySQL)
   - `lgtm` (Grafana + Loki + Tempo + Mimir)
   - `pyroscope` (profiling)
   - `prometheus` (for exemplar support if not using Mimir)
2. `grafana/provisioning/datasources/datasource.yml` — full correlation config:
   ```yaml
   # Tempo datasource with ALL correlation links:
   tracesToLogsV2:       # trace → Loki logs (by trace_id)
   tracesToMetrics:      # trace → Prometheus/Mimir metrics
   tracesToProfiles:     # trace → Pyroscope profiles
   serviceMap:           # service dependency graph from metrics
   nodeGraph:            # trace span graph

   # Prometheus datasource:
   exemplarTraceIdDestinations:  # metric → Tempo trace

   # Loki datasource:
   derivedFields:        # log → Tempo trace (extract trace_id from log line)
   ```
3. `grafana/dashboards/correlation-dashboard.json`:
   - Overview panel: request rate, error rate, latency (RED metrics)
   - Click metric → exemplar → trace
   - Trace view with logs panel and profile link
4. Application logging config that includes `trace_id` and `span_id` in log lines (already exists in Lab05-01 pattern)
5. `scripts/load.js` — multi-endpoint traffic to generate diverse telemetry
6. `README.md` — walkthrough of the full correlation journey with screenshots placeholders

**Key concepts to teach:**
- The "golden path": metric anomaly → find trace → read logs → check profile
- How trace_id is the universal correlation key
- Grafana datasource linking configuration
- Service map (dependency graph from trace data)
- When to use which signal (metrics for detection, traces for scoping, logs for details, profiles for optimization)

---

#### Feature 09-03: `09_correlation/03_service_map`

**Title:** Service Dependency Map and Topology Visualization

**Goal:** Visualize the microservice topology from trace data using Tempo's service graph.

**What to build:**
1. `docker-compose.yaml` — reuse 09-02 stack (or simplified version)
2. Tempo service graph configuration (metrics generator):
   - Enable `metrics_generator` in Tempo config
   - Service graph processor generates `traces_service_graph_request_total` etc.
3. Prometheus scrape config for Tempo's metrics generator endpoint
4. `grafana/dashboards/service-map.json`:
   - Service map (node graph) panel showing service topology
   - Edge labels: request rate, error rate, latency between services
   - Click node → drill into service-specific dashboard
5. `README.md` — explain how service graphs are generated from spans

**Key concepts to teach:**
- Service graph generation from trace spans (client/server span pairs)
- Topology visualization for understanding dependencies
- Using service maps for incident scoping ("which service is affected?")
- Rate, error, duration (RED) metrics per edge

---

### Priority 4: `10_dashboards` — Production-Ready Dashboards

---

#### Feature 10-01: `10_dashboards/01_golden_signals`

**Title:** Golden Signals / RED Method Dashboards

**Goal:** Build production-quality dashboards following Google's Four Golden Signals and the RED method.

**What to build:**
1. `docker-compose.yaml` — multi-service setup with Prometheus + Grafana
2. `grafana/dashboards/golden-signals.json`:
   - **Latency:** p50, p90, p95, p99 histograms per service and endpoint
   - **Traffic:** Requests per second by service, endpoint, status code
   - **Errors:** Error rate %, error count by type, error logs panel
   - **Saturation:** CPU, memory, connection pool usage
3. `grafana/dashboards/red-per-service.json`:
   - Template variable for service selection
   - Rate, Error rate, Duration panels
   - Comparison: today vs yesterday vs last week
4. `README.md` — explain Golden Signals vs RED vs USE, when to use each

---

#### Feature 10-02: `10_dashboards/02_dashboards_as_code`

**Title:** Dashboards as Code with Grafonnet

**Goal:** Teach how to version-control and generate Grafana dashboards programmatically.

**What to build:**
1. `docker-compose.yaml` — Grafana + Prometheus + user-service
2. `grafonnet/` directory with Jsonnet files:
   - `lib/panels.libsonnet` — reusable panel definitions
   - `lib/variables.libsonnet` — template variables
   - `dashboards/service-overview.jsonnet` — generates dashboard JSON
3. `Makefile` — build targets:
   - `make dashboards` — compile Jsonnet → JSON
   - `make validate` — validate generated dashboards
4. Generated output in `grafana/dashboards/`
5. `README.md` — Grafonnet basics, why dashboards-as-code matters

---

## Lab Structure Template

Every new lab MUST follow this structure:

```
GG_group/NN_description/
├── docker-compose.yaml          # Service definitions
├── README.md                     # Thai-primary, English technical terms
├── scripts/
│   └── load.js                   # k6 load test
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasource.yml
│   │   ├── dashboards/
│   │   │   └── dashboard.yml    # Dashboard provider config
│   │   └── alerting/            # (if alerting lab)
│   │       ├── rules.yml
│   │       ├── contact-points.yml
│   │       └── notification-policies.yml
│   └── dashboards/
│       └── *.json               # Pre-built dashboards
├── prometheus/
│   ├── prometheus.yml           # Scrape config
│   ├── alert-rules.yml          # (if alerting lab)
│   └── recording-rules.yml      # (if SLO lab)
├── alertmanager/                 # (if using Alertmanager)
│   └── alertmanager.yml
└── [service dirs]/               # Only if modifying service code
    └── ...
```

## Conventions to Follow

| Convention | Rule |
|-----------|------|
| Docker Compose extension | `.yaml` (consistent with groups 01-06) |
| Lab ID format | `LabGG-NN` (e.g., Lab07-01) |
| Docker image naming | `bomb0069/observability-*:lab-GG-NN` (only if new images needed) |
| Grafana port | 3000 |
| Prometheus port | 9090 |
| Alertmanager port | 9093 |
| OTLP gRPC/HTTP | 4317/4318 |
| README language | Thai primary, English for technical terms, use emojis |
| README sections | Overview → Architecture → Components → Quick Start → Configuration → Examples → Troubleshooting |
| Grafana credentials | admin/admin with anonymous viewer enabled |
| Reuse existing images | Prefer `bomb0069/observability-*:lab-XX-YY` from earlier labs when service code unchanged |
| k6 execution | `docker run --rm -i grafana/k6 run - <scripts/load.js` |

## Dependencies Between Features

```
07-01 (Alertmanager basics)
  └─→ 07-02 (Grafana Alerting) — can be built independently
  └─→ 07-03 (Advanced routing) — depends on 07-01 concepts

08-01 (SLI/SLO intro)
  └─→ 08-02 (Burn rate alerts) — depends on 08-01 recording rules

09-01 (Exemplars)
09-02 (Full correlation) — can reference 09-01 but builds its own stack
  └─→ 09-03 (Service map) — subset of 09-02

10-01 (Golden signals) — independent
10-02 (Dashboards as code) — independent
```

## Estimated Scope per Feature

| Feature | New Files | Reuse from | Complexity |
|---------|-----------|------------|------------|
| 07-01 | ~8 | Lab03-01 | Low |
| 07-02 | ~10 | Lab05-01 | Medium |
| 07-03 | ~8 | Lab07-01 | Medium |
| 08-01 | ~10 | Lab03-01 | Medium |
| 08-02 | ~8 | Lab08-01 | Medium |
| 09-01 | ~10 | Lab04-01 + Lab03-01 | Medium |
| 09-02 | ~12 | Lab06-02 | High |
| 09-03 | ~8 | Lab09-02 | Medium |
| 10-01 | ~8 | Lab03-01 | Low-Medium |
| 10-02 | ~12 | New (Jsonnet) | Medium |

## How to Use This Plan

**For AI Agents:**
1. Pick the next unimplemented feature in priority order
2. Read the referenced "Reuse from" lab for patterns and conventions
3. Follow the "What to build" checklist — each item is a file or config to create
4. Follow the Lab Structure Template and Conventions table
5. Write README.md in Thai with English technical terms (match existing lab READMEs style)
6. Test with `docker-compose up -d` and verify all services start correctly

**For Developers:**
1. Each feature can be implemented as a standalone PR
2. Features within the same group share context but can be reviewed independently
3. Start with 07-01 as it's the simplest and most impactful
4. Use existing Docker images — only build new images if service code changes are required
