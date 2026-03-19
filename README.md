# Observability in Action - February 2026

Lab series สำหรับการเรียนรู้ ELK Stack (Elasticsearch, Logstash, Kibana) และ LGTM Stack (Loki, Grafana, Tempo, Mimir) เพื่อศึกษา Observability แบบครบถ้วน

## Prerequisites

- Docker
- Docker Compose

## Quick Start

แต่ละ lab มี README.md พร้อม instructions การใช้งานแบบละเอียด

```bash
# เข้าไปใน lab ที่ต้องการ (ตัวอย่าง)
cd 02_log/01_elk_filebeat_flog

# Start services
docker-compose up -d

# ตรวจสอบ logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Lab Progression

Labs ออกแบบให้เรียนรู้แบบ progressive:

### 00_warmup — Warm-up Utilities

0. **[Lab00-01 - Image Warm-Up](00_warmup/01_image_pull/)**: Pre-pull images ที่ใช้ในทุก lab (logs + metrics) เพื่อลดเวลารอ

### 01_quickstart — Quickstart

1. **[Lab01-01 - Spring Boot Metrics Quickstart](01_quickstart/01_spring_boot_metrics/)**: Spring Boot metrics quickstart (Prometheus + Grafana dashboard แบบสำเร็จรูป)
2. **[Lab01-02 - OpenTelemetry Quick Run](01_quickstart/02_opentelemetry_run/)**: OpenTelemetry quick run (multi-service OTLP pipeline + LGTM bundle)
3. **[Lab01-03 - Beyla Zero-Code Auto-Instrumentation](01_quickstart/03_beyla_zero_code/)**: eBPF auto-instrumentation quickstart with Beyla (zero-code)

### 02_log — Logs Track (Lab02-01 – Lab02-08)

4. **[Lab02-01 - ELK Stack with Filebeat and Flog](02_log/01_elk_filebeat_flog/)**: เริ่มต้นกับ basic ELK stack
5. **[Lab02-02 - Kibana Visualizations](02_log/02_kibana_visualizations/)**: เพิ่ม visualizations และ dashboards
6. **[Lab02-03 - Multi-Application Log Collection](02_log/03_multi_app_collection/)**: เพิ่ม multiple applications กับ different log formats
7. **[Lab02-04 - Auto-Setup Kibana](02_log/04_auto_setup_kibana/)**: เพิ่ม automatic setup capabilities
8. **[Lab02-05 - Unified Dashboard](02_log/05_unified_dashboard/)**: รวม applications ใน unified dashboard (separate visualizations)
9. **[Lab02-06 - Unified ECS Visualizations](02_log/06_unified_ecs/)**: รวม applications ใน unified visualizations (same charts with split series)
10. **[Lab02-07 - Grafana with LGTM Stack](02_log/07_lgtm_grafana/)**: Grafana visualizations with LGTM stack (Loki + Grafana + Promtail)
11. **[Lab02-08 - Unified Multi-App LGTM](02_log/08_lgtm_multi_app/)**: Unified multi-application logs with LGTM stack (split series)

### 03_metrics — Metrics Track (Lab03-01 – Lab03-03)

12. **[Lab03-01 - Spring Boot Prometheus](03_metrics/01_spring_boot_prometheus/)**: Spring Boot Micrometer metrics with Prometheus + Grafana dashboarding
13. **[Lab03-02 - Postgres Exporter](03_metrics/02_postgres_exporter/)**: Postgres exporter + database dashboards alongside application metrics
14. **[Lab03-03 - Node Exporter](03_metrics/03_node_exporter/)**: Node exporter + infrastructure dashboards to correlate system resources

### 04_tracing — Tracing Track (Lab04-01 – Lab04-04)

15. **[Lab04-01 - Distributed Tracing Intro](04_tracing/01_distributed_tracing_intro/)**: OpenTelemetry distributed tracing with LGTM stack (Tempo + auto-instrumentation)
16. **[Lab04-02 - Multi-Service Tracing](04_tracing/02_multi_service_tracing/)**: Multi-service distributed tracing
17. **[Lab04-03 - Multi-Service Expanded](04_tracing/03_multi_service_expanded/)**: Multi-service tracing expanded
18. **[Lab04-04 - Trace Sampling](04_tracing/04_trace_sampling/)**: Trace sampling techniques

### 05_instrumentation — Instrumentation Track (Lab05-01 – Lab05-03)

19. **[Lab05-01 - Full OTLP](05_instrumentation/01_full_otlp/)**: Full OTLP instrumentation (agents + logs)
20. **[Lab05-02 - eBPF Beyla](05_instrumentation/02_ebpf_beyla/)**: eBPF auto-instrumentation with Beyla
21. **[Lab05-03 - Log-Derived Metrics](05_instrumentation/03_log_derived_metrics/)**: Log-derived metrics & function execution timing

### 06_profiling — Profiling Track (Lab06-01 – Lab06-03)

22. **[Lab06-01 - Continuous Profiling with Pyroscope](06_profiling/01_pyroscope_intro/)**: SDK-based continuous profiling with Grafana Pyroscope
23. **[Lab06-02 - Span Profiles](06_profiling/02_profiles_and_traces/)**: Linking traces to profiles with span-level profiling
24. **[Lab06-03 - eBPF Zero-Code Profiling](06_profiling/03_ebpf_profiling/)**: eBPF zero-code profiling with Grafana Alloy

## Labs Overview

### 00_warmup

#### [Lab00-01 - Image Warm-Up for ELK, LGTM & Metrics Labs](00_warmup/01_image_pull/)

Lab สำหรับ pre-pull container images ทั้งหมดที่ใช้ใน Lab02-01–Lab03-03 (logs + metrics) ช่วยให้ตอนเริ่ม lab จริงไม่ต้องรอ docker ดึง image ใหม่

**Key Features:**

- ดึง images หลักทั้งหมด: mingrammer/flog, Elasticsearch/Logstash/Kibana/Filebeat 8.11, curlimages/curl, grafana/promtail, grafana/loki, grafana/grafana, prom/prometheus, postgres:16.3, quay.io/prometheuscommunity/postgres-exporter:v0.15.0, prom/node-exporter:v1.8.1, grafana/k6:0.49.0
- ใช้ `docker compose pull` ครั้งเดียวเพื่อลดเวลารอในห้องเรียนหรือ workshop
- ปรับ container_name ให้ไม่ชนกับ labs อื่น (prefix lab00-)
- README สั้น ๆ บอกขั้นตอนและรายการ images ที่เกี่ยวข้อง

---

### 01_quickstart

#### [Lab01-01 - Spring Boot Metrics Quickstart](01_quickstart/01_spring_boot_metrics/)

**Key Features:**

- Spring Boot `user-service` + PostgreSQL backend พร้อม Micrometer actuator endpoint `/actuator/prometheus`
- Prometheus scrape ทุก 5 วินาทีและ Grafana provisioning datasource UID `prometheus`
- Dashboard พร้อมใช้ (`Spring Boot Metrics (Lab01-01)`) สร้างจาก Grafana Lab ID 14430
- มีสคริปต์ `grafana/k6` load test เพื่อกระตุ้น throughput / error / latency metrics

#### [Lab01-02 - OpenTelemetry Quick Run](01_quickstart/02_opentelemetry_run/)

Lab สำหรับทดลองส่ง OTLP signals จากหลายภาษาไปยัง LGTM stack + Prometheus ภายใน compose เดียว เหมาะกับการ warm-up ก่อนลงรายละเอียดในแต่ละ track

**Key Features:**

- Spring Boot, Go, และ Node.js services พร้อมฐานข้อมูล Postgres/MySQL
- `grafana/otel-lgtm` bundle เปิดพอร์ต 4317/4318 (OTLP) และ Grafana UI (3000)
- Prometheus แยกเพื่อดู Micrometer metrics (`http_server_requests_seconds_count`, ฯลฯ)
- ตัวอย่างคำสั่ง `curl` กระตุ้น traffic เพื่อให้เห็น trace + log + metric ใน Grafana Explore

---

### 02_log — Logs Track

โฟกัสการเก็บและวิเคราะห์ **logs** โดยไล่จาก ELK (Lab02-01–Lab02-06) ไปจนถึง LGTM (Lab02-07–Lab02-08)

#### [Lab02-01 - ELK Stack with Filebeat and Flog](02_log/01_elk_filebeat_flog/)

Lab พื้นฐานสำหรับทดสอบการเก็บ log จาก application ผ่าน Filebeat, Logstash ไปยัง Elasticsearch และแสดงผลที่ Kibana

**Key Features:**

- ELK Stack พื้นฐาน (Elasticsearch, Logstash, Kibana)
- Flog (Fake Log Generator) สร้าง Apache combined format logs
- Filebeat อ่าน log files และส่งไปยัง Logstash
- Logstash parse และ transform logs
- Kibana สำหรับ visualize logs

---

#### [Lab02-02 - Kibana Visualizations for Apache Combined Logs](02_log/02_kibana_visualizations/)

Lab สำหรับสร้าง visualizations และ dashboards บน Kibana เพื่อวิเคราะห์ Apache combined format logs

**Key Features:**

- สร้าง 7 visualizations สำหรับวิเคราะห์ Apache logs
- HTTP status code distribution (Pie chart)
- Top requesting IPs (Bar chart)
- Traffic over time (Line chart)
- GeoIP data visualization
- User Agent parsing และ analysis
- Auto-import dashboard เมื่อ start services

---

#### [Lab02-03 - Multi-Application Log Collection and Visualization](02_log/03_multi_app_collection/)

Lab สำหรับทดสอบการเก็บ logs จาก multiple applications ที่มี format ต่างกัน และแสดงผลรวมกันบน Kibana

**Key Features:**

- รองรับ 2 applications พร้อมกัน:
  - Flog: Apache combined format (1 log/sec)
  - Flog2: JSON format (2 logs/sec)
- Filebeat อ่าน logs จาก 2 sources
- Logstash แยก process ตาม format
- Elasticsearch เก็บใน separate indices (flog-logs-_, flog2-logs-_)
- เปรียบเทียบ log volume ratio (1:2)

---

#### [Lab02-04 - Auto-Setup Kibana Index Patterns for Multi-Application Logs](02_log/04_auto_setup_kibana/)

Lab สำหรับทดสอบการเก็บ logs จาก multiple applications พร้อม **automatic Kibana index pattern creation**

**Key Features:**

- ✨ Automatic Kibana Setup
- Index patterns สร้างอัตโนมัติเมื่อ start services
- ไม่ต้อง manual configuration ใน Kibana UI
- Dashboard พร้อมใช้งานทันที
- Logstash heap size เพิ่มเป็น 512MB (แก้ไข OutOfMemoryError)

---

#### [Lab02-05 - Unified Dashboard for Multi-Application Logs](02_log/05_unified_dashboard/)

Lab สำหรับแสดง logs จาก multiple applications (flog และ flog2) ใน **dashboard เดียวกัน** พร้อม comparison visualizations

**Key Features:**

- ✨ Unified Dashboard แสดงข้อมูลจากทั้ง 2 applications
- 14 visualizations (7 สำหรับ flog + 7 สำหรับ flog2)
- เปรียบเทียบ log volume และ patterns จาก 2 sources
- Automatic index pattern creation และ dashboard import
- Side-by-side visualization comparison

---

#### [Lab02-06 - Unified Visualizations with ECS Normalization](02_log/06_unified_ecs/)

Lab สำหรับแสดง logs จาก multiple applications ใน **visualizations เดียวกัน** โดยใช้ ECS field normalization และ split series aggregation

**Key Features:**

- ✨ True Unified Visualizations
- รวมข้อมูลจากทั้ง 2 applications ใน **กราฟเดียวกัน**
- ใช้ ECS (Elastic Common Schema) ทำให้ field names เหมือนกัน
- Split series by application (app.keyword) สำหรับเปรียบเทียบ
- Single unified index pattern (unified-logs-\*) แทน separate indices
- 7 unified visualizations แทนที่ 14 separate visualizations
- Field normalization: Apache (COMBINEDAPACHELOG) และ JSON logs ใช้ common field names

---

#### [Lab02-07 - Grafana Visualizations for Apache Combined Logs with LGTM Stack](02_log/07_lgtm_grafana/)

Lab สำหรับสร้าง visualizations และ dashboards บน Grafana เพื่อวิเคราะห์ Apache combined format logs โดยใช้ LGTM Stack (Loki, Grafana, Tempo, Mimir)

**Key Features:**

- ✨ LGTM Stack (Loki + Grafana + Promtail)
- Promtail parse Apache logs ด้วย pipeline stages (regex)
- Loki: Label-based indexing (ใช้ resources น้อยกว่า Elasticsearch)
- LogQL: Query language สำหรับ query และ aggregate logs
- 7 visualizations เทียบเคียง Lab02-02 (ELK Stack)
- Auto-provisioned Grafana datasource และ dashboard
- Anonymous authentication (ไม่ต้อง login)
- Timezone support: Asia/Bangkok (UTC+7)
- เหมาะสำหรับเปรียบเทียบ LGTM vs ELK Stack

---

#### [Lab02-08 - Unified Multi-Application Logs with LGTM Stack](02_log/08_lgtm_multi_app/)

Lab สำหรับรวม logs จาก multiple applications (Apache และ JSON format) และแสดงใน **visualizations เดียวกัน** บน Grafana โดยใช้ LGTM Stack พร้อม split series aggregation

**Key Features:**

- ✨ Unified Visualizations with LGTM Stack
- รองรับ 2 applications พร้อมกัน:
  - Flog: Apache combined format (1 log/sec)
  - Flog2: JSON format (2 logs/sec)
- Promtail parse ทั้ง 2 formats ด้วย pipeline stages (regex + JSON)
- Field normalization: remote_ip, method, status ใช้ common names
- รวมข้อมูลจากทั้ง 2 apps ใน **panel เดียวกัน** พร้อม split series
- 7 unified visualizations (เทียบเคียง Lab02-06 แต่ใช้ LGTM Stack)
- LogQL queries: `sum by (app)` สำหรับ split series aggregation
- เหมาะสำหรับเปรียบเทียบ LGTM vs ELK ในแบบ multi-application

---

### 03_metrics — Metrics Track

ต่อยอดจาก log pipeline มาสู่ **metrics observability** เริ่มด้วย Lab01-01–Lab01-02 (quickstart + OpenTelemetry pipeline) ก่อนจะลงลึกกับ Lab03-01–Lab03-03 ที่เพิ่มฐานข้อมูลและ infrastructure metrics

#### [Lab03-01 - Spring Boot Metrics with Prometheus & Grafana](03_metrics/01_spring_boot_prometheus/)

**Key Features:**

- Spring Boot `user-service` + PostgreSQL backend พร้อม Micrometer/Actuator endpoint `/actuator/prometheus`
- Prometheus scrape job (5s) เก็บ metrics โดยตรงจากคอนเทนเนอร์ `user-service`
- Grafana provisioning ครบชุด (datasource UID `prometheus` + dashboard ดัดแปลงจาก Grafana Lab ID 14430)
- Metrics panels ครอบคลุม throughput, latency, error %, CPU, heap usage, live threads ฯลฯ
- Built-in load test: `docker run --rm -i grafana/k6 run - <scripts/load.js` เพื่อกระตุ้น metric spikes แล้วสังเกตผลบน Grafana

#### [Lab03-02 - Postgres Exporter + Database Dashboards](03_metrics/02_postgres_exporter/)

**Key Features:**

- เพิ่ม `postgres-exporter` เพื่อดึง metrics จากฐานข้อมูล `user-db`
- Prometheus เก็บข้อมูลจากทั้ง Spring Boot actuator และ exporter ใน config เดียว
- Grafana provisioning เพิ่ม dashboard อีกใบ (`postgres-metrics.json`) ครอบคลุม active connections, TPS, cache hit ratio, DB size และ deadlocks
- Dashboard JSON ผูกกับ datasource UID `prometheus` ที่ provision ไว้อยู่แล้ว ไม่ต้องเลือก datasource ซ้ำใน UI
- ยังคงใช้ load script (`docker run --rm -i grafana/k6 run - <scripts/load.js`) เพื่อกระตุ้นทั้ง application และ database metrics
- เหมาะสำหรับสาธิต full-stack observability (app + database layer)

#### [Lab03-03 - Node Exporter + Infrastructure Metrics](03_metrics/03_node_exporter/)

**Key Features:**

- เพิ่ม `prom/node-exporter` เพื่อเก็บ CPU, memory, system load และ filesystem stats ของ container host
- Prometheus scrape node exporter ควบคู่กับ Spring Boot และ Postgres exporters ใน environment เดียว
- Grafana provisioning เพิ่ม dashboard ที่ยิง PromQL สำเร็จรูป (เช่น CPU %, memory utilization, load averages)
- สาธิตมุมมอง "triangulate" ปัญหา: load script → app metrics → database metrics → infrastructure metrics
- ใช้สคริปต์ k6 เดิมในการสร้างภาระงานเพื่อให้เห็นความสัมพันธ์ของแต่ละเลเยอร์

---

### 04_tracing — Tracing Track

#### [Lab04-01 - OpenTelemetry Distributed Tracing with LGTM](04_tracing/01_distributed_tracing_intro/)

**Key Features:**

- ✨ เปลี่ยนจาก Prometheus+Grafana เป็น **LGTM Stack** (Loki, Grafana, Tempo, Mimir)
- ✅ เพิ่ม **OpenTelemetry instrumentation** สำหรับ distributed tracing
- Auto-instrument HTTP requests และ database queries
- **Tempo** backend สำหรับเก็บ traces
- OTLP (OpenTelemetry Protocol) สำหรับส่ง traces/metrics/logs
- Grafana Explore ใช้งาน TraceQL เพื่อค้นหาและวิเคราะห์ traces
- Trace sampling 100% สำหรับ development
- ดู request flow, latency breakdown, database query performance
- All-in-one observability: Metrics (Mimir) + Traces (Tempo) + Logs (Loki)
- สาธิตการ correlate ระหว่าง traces กับ metrics และ logs

#### [Lab04-02 - Multi-Service Distributed Tracing](04_tracing/02_multi_service_tracing/)

Multi-service distributed tracing ต่อยอดจาก Lab04-01

#### [Lab04-03 - Multi-Service Tracing Expanded](04_tracing/03_multi_service_expanded/)

Multi-service tracing expanded with additional services and scenarios

#### [Lab04-04 - Trace Sampling Techniques](04_tracing/04_trace_sampling/)

Trace sampling techniques สำหรับ production environments

---

### 05_instrumentation — Instrumentation Track

#### [Lab05-01 - Full OTLP Instrumentation](05_instrumentation/01_full_otlp/)

Full OTLP instrumentation with agents and log correlation

#### [Lab05-02 - eBPF Auto-Instrumentation with Beyla](05_instrumentation/02_ebpf_beyla/)

eBPF-based auto-instrumentation with Beyla (kernel-level, no agents needed in application code)

#### [Lab05-03 - Log-Derived Metrics & Function Timing](05_instrumentation/03_log_derived_metrics/)

Log-derived metrics and function execution timing

---

### 06_profiling — Profiling Track

#### [Lab06-01 - Continuous Profiling with Pyroscope](06_profiling/01_pyroscope_intro/)

SDK-based continuous profiling with Grafana Pyroscope — flame graphs สำหรับ CPU, memory allocation

#### [Lab06-02 - Span Profiles](06_profiling/02_profiles_and_traces/)

Linking traces to profiles — คลิกจาก trace span ไปดู flame graph ของ span นั้นได้โดยตรง

#### [Lab06-03 - eBPF Zero-Code Profiling](06_profiling/03_ebpf_profiling/)

eBPF zero-code profiling with Grafana Alloy — ไม่ต้องเปลี่ยน code หรือเพิ่ม SDK
