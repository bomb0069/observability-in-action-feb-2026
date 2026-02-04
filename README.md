# Observability in Action - February 2026

Lab series สำหรับการเรียนรู้ ELK Stack (Elasticsearch, Logstash, Kibana) และ LGTM Stack (Loki, Grafana, Tempo, Mimir) เพื่อศึกษา Observability แบบครบถ้วน

## Prerequisites

- Docker
- Docker Compose

## Quick Start

แต่ละ lab มี README.md พร้อม instructions การใช้งานแบบละเอียด

```bash
# เข้าไปใน lab ที่ต้องการ
cd lab03  # หรือ lab04, lab05, lab06, lab07, lab08

# Start services
docker-compose up -d

# ตรวจสอบ logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Lab Progression

Labs ออกแบบให้เรียนรู้แบบ progressive:

1. **Lab03**: เริ่มต้นกับ basic ELK stack
2. **Lab04**: เพิ่ม visualizations และ dashboards
3. **Lab05**: เพิ่ม multiple applications กับ different log formats
4. **Lab06**: เพิ่ม automatic setup capabilities
5. **Lab07**: รวม applications ใน unified dashboard (separate visualizations)
6. **Lab08**: รวม applications ใน unified visualizations (same charts with split series)

## Labs Overview

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
