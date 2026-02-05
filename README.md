# Observability in Action - February 2026

Lab series สำหรับการเรียนรู้ ELK Stack (Elasticsearch, Logstash, Kibana) และ LGTM Stack (Loki, Grafana, Tempo, Mimir) เพื่อศึกษา Observability แบบครบถ้วน

## Prerequisites

- Docker
- Docker Compose

## Quick Start

แต่ละ lab มี README.md พร้อม instructions การใช้งานแบบละเอียด

```bash
# เข้าไปใน lab ที่ต้องการ
cd lab00  # หรือ lab03-lab10 (Logs) / lab01, lab11+ (Metrics)

# Start services
docker-compose up -d

# ตรวจสอบ logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Lab Progression

Labs ออกแบบให้เรียนรู้แบบ progressive:

**Warm-up Utilities:**

0. **Lab00**: Pre-pull images ที่ใช้ในทุก lab (logs + metrics) เพื่อลดเวลารอ
1. **Lab01**: Spring Boot metrics quickstart (Prometheus + Grafana dashboard แบบสำเร็จรูป)

**Logs Track (Labs 03-10):**

1. **Lab03**: เริ่มต้นกับ basic ELK stack
2. **Lab04**: เพิ่ม visualizations และ dashboards
3. **Lab05**: เพิ่ม multiple applications กับ different log formats
4. **Lab06**: เพิ่ม automatic setup capabilities
5. **Lab07**: รวม applications ใน unified dashboard (separate visualizations)
6. **Lab08**: รวม applications ใน unified visualizations (same charts with split series)
7. **Lab09**: Grafana visualizations with LGTM stack (Loki + Grafana + Promtail)
8. **Lab10**: Unified multi-application logs with LGTM stack (split series)

**Metrics Track (Labs 11+):**

9. **Lab11**: Spring Boot Micrometer metrics with Prometheus + Grafana dashboarding
10. **Lab12**: Postgres exporter + database dashboards alongside application metrics
11. **Lab13**: Node exporter + infrastructure dashboards to correlate system resources

## Labs Overview

### [Lab00 - Image Warm-Up for ELK, LGTM & Metrics Labs](lab00/)

Lab สำหรับ pre-pull container images ทั้งหมดที่ใช้ใน labs 03-13 (logs + metrics) ช่วยให้ตอนเริ่ม lab จริงไม่ต้องรอ docker ดึง image ใหม่

**Key Features:**

- ดึง images หลักทั้งหมด: mingrammer/flog, Elasticsearch/Logstash/Kibana/Filebeat 8.11, curlimages/curl, grafana/promtail, grafana/loki, grafana/grafana, prom/prometheus, postgres:16.3, quay.io/prometheuscommunity/postgres-exporter:v0.15.0, prom/node-exporter:v1.8.1, grafana/k6:0.49.0
- ใช้ `docker compose pull` ครั้งเดียวเพื่อลดเวลารอในห้องเรียนหรือ workshop
- ปรับ container_name ให้ไม่ชนกับ labs อื่น (prefix lab00-)
- README สั้น ๆ บอกขั้นตอนและรายการ images ที่เกี่ยวข้อง

---

## Logs Track (Labs 03-10)

โฟกัสการเก็บและวิเคราะห์ **logs** โดยไล่จาก ELK (Labs 03-08) ไปจนถึง LGTM (Labs 09-10)

### [Lab03 - ELK Stack with Filebeat and Flog](lab03/)

Lab พื้นฐานสำหรับทดสอบการเก็บ log จาก application ผ่าน Filebeat, Logstash ไปยัง Elasticsearch และแสดงผลที่ Kibana

**Key Features:**

- ELK Stack พื้นฐาน (Elasticsearch, Logstash, Kibana)
- Flog (Fake Log Generator) สร้าง Apache combined format logs
- Filebeat อ่าน log files และส่งไปยัง Logstash
- Logstash parse และ transform logs
- Kibana สำหรับ visualize logs

---

### [Lab04 - Kibana Visualizations for Apache Combined Logs](lab04/)

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

### [Lab05 - Multi-Application Log Collection and Visualization](lab05/)

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

### [Lab06 - Auto-Setup Kibana Index Patterns for Multi-Application Logs](lab06/)

Lab สำหรับทดสอบการเก็บ logs จาก multiple applications พร้อม **automatic Kibana index pattern creation**

**Key Features:**

- ✨ Automatic Kibana Setup
- Index patterns สร้างอัตโนมัติเมื่อ start services
- ไม่ต้อง manual configuration ใน Kibana UI
- Dashboard พร้อมใช้งานทันที
- Logstash heap size เพิ่มเป็น 512MB (แก้ไข OutOfMemoryError)

---

### [Lab07 - Unified Dashboard for Multi-Application Logs](lab07/)

Lab สำหรับแสดง logs จาก multiple applications (flog และ flog2) ใน **dashboard เดียวกัน** พร้อม comparison visualizations

**Key Features:**

- ✨ Unified Dashboard แสดงข้อมูลจากทั้ง 2 applications
- 14 visualizations (7 สำหรับ flog + 7 สำหรับ flog2)
- เปรียบเทียบ log volume และ patterns จาก 2 sources
- Automatic index pattern creation และ dashboard import
- Side-by-side visualization comparison

---

### [Lab08 - Unified Visualizations with ECS Normalization](lab08/)

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

### [Lab09 - Grafana Visualizations for Apache Combined Logs with LGTM Stack](lab09/)

Lab สำหรับสร้าง visualizations และ dashboards บน Grafana เพื่อวิเคราะห์ Apache combined format logs โดยใช้ LGTM Stack (Loki, Grafana, Tempo, Mimir)

**Key Features:**

- ✨ LGTM Stack (Loki + Grafana + Promtail)
- Promtail parse Apache logs ด้วย pipeline stages (regex)
- Loki: Label-based indexing (ใช้ resources น้อยกว่า Elasticsearch)
- LogQL: Query language สำหรับ query และ aggregate logs
- 7 visualizations เทียบเคียง Lab04 (ELK Stack)
- Auto-provisioned Grafana datasource และ dashboard
- Anonymous authentication (ไม่ต้อง login)
- Timezone support: Asia/Bangkok (UTC+7)
- เหมาะสำหรับเปรียบเทียบ LGTM vs ELK Stack

---

### [Lab10 - Unified Multi-Application Logs with LGTM Stack](lab10/)

Lab สำหรับรวม logs จาก multiple applications (Apache และ JSON format) และแสดงใน **visualizations เดียวกัน** บน Grafana โดยใช้ LGTM Stack พร้อม split series aggregation

**Key Features:**

- ✨ Unified Visualizations with LGTM Stack
- รองรับ 2 applications พร้อมกัน:
  - Flog: Apache combined format (1 log/sec)
  - Flog2: JSON format (2 logs/sec)
- Promtail parse ทั้ง 2 formats ด้วย pipeline stages (regex + JSON)
- Field normalization: remote_ip, method, status ใช้ common names
- รวมข้อมูลจากทั้ง 2 apps ใน **panel เดียวกัน** พร้อม split series
- 7 unified visualizations (เทียบเคียง Lab08 แต่ใช้ LGTM Stack)
- LogQL queries: `sum by (app)` สำหรับ split series aggregation
- เหมาะสำหรับเปรียบเทียบ LGTM vs ELK ในแบบ multi-application

---

## Metrics Track (Labs 01 & 11+)

ต่อยอดจาก log pipeline มาสู่ **metrics observability** เริ่มด้วย Lab01 ซึ่งเป็น quickstart stack ก่อนจะลงลึกกับ Lab11-Lab13 ที่เพิ่มฐานข้อมูลและ infrastructure metrics

### [Lab01 - Spring Boot Metrics Quickstart](lab01/)

**Key Features:**

- Spring Boot `user-service` + PostgreSQL backend พร้อม Micrometer actuator endpoint `/actuator/prometheus`
- Prometheus scrape ทุก 5 วินาทีและ Grafana provisioning datasource UID `prometheus`
- Dashboard พร้อมใช้ (`Spring Boot Metrics (Lab01)`) สร้างจาก Grafana Lab ID 14430
- มีสคริปต์ `grafana/k6` load test เพื่อกระตุ้น throughput / error / latency metrics

### [Lab11 - Spring Boot Metrics with Prometheus & Grafana](lab11/)

**Key Features:**

- Spring Boot `user-service` + PostgreSQL backend พร้อม Micrometer/Actuator endpoint `/actuator/prometheus`
- Prometheus scrape job (5s) เก็บ metrics โดยตรงจากคอนเทนเนอร์ `user-service`
- Grafana provisioning ครบชุด (datasource UID `prometheus` + dashboard ดัดแปลงจาก Grafana Lab ID 14430)
- Metrics panels ครอบคลุม throughput, latency, error %, CPU, heap usage, live threads ฯลฯ
- Built-in load test: `docker run --rm -i grafana/k6 run - <scripts/load.js` เพื่อกระตุ้น metric spikes แล้วสังเกตผลบน Grafana

### [Lab12 - Postgres Exporter + Database Dashboards](lab12/)

**Key Features:**

- เพิ่ม `postgres-exporter` เพื่อดึง metrics จากฐานข้อมูล `user-db`
- Prometheus เก็บข้อมูลจากทั้ง Spring Boot actuator และ exporter ใน config เดียว
- Grafana provisioning เพิ่ม dashboard อีกใบ (`postgres-metrics.json`) ครอบคลุม active connections, TPS, cache hit ratio, DB size และ deadlocks
- Dashboard JSON ผูกกับ datasource UID `prometheus` ที่ provision ไว้อยู่แล้ว ไม่ต้องเลือก datasource ซ้ำใน UI
- ยังคงใช้ load script (`docker run --rm -i grafana/k6 run - <scripts/load.js`) เพื่อกระตุ้นทั้ง application และ database metrics
- เหมาะสำหรับสาธิต full-stack observability (app + database layer)

### [Lab13 - Node Exporter + Infrastructure Metrics](lab13/)

**Key Features:**

- เพิ่ม `prom/node-exporter` เพื่อเก็บ CPU, memory, system load และ filesystem stats ของ container host
- Prometheus scrape node exporter ควบคู่กับ Spring Boot และ Postgres exporters ใน environment เดียว
- Grafana provisioning เพิ่ม dashboard ที่ยิง PromQL สำเร็จรูป (เช่น CPU %, memory utilization, load averages)
- สาธิตมุมมอง "triangulate" ปัญหา: load script → app metrics → database metrics → infrastructure metrics
- ใช้สคริปต์ k6 เดิมในการสร้างภาระงานเพื่อให้เห็นความสัมพันธ์ของแต่ละเลเยอร์

> Lab13+ (coming soon) จะต่อยอดเรื่อง alerting, recording rules, exemplars และ multi-signal incident workflows
