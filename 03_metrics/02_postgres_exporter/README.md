# Database + Application Metrics (Lab12)

Lab12 ต่อยอดจาก Lab11 โดยเพิ่ม **Postgres exporter** เพื่อติดตาม database health ควบคู่กับ Spring Boot Micrometer metrics ทำให้ Grafana มองเห็นทั้ง application และ database layer ใน dashboard เดียวกัน

## Stack Components

- **user-service** – Spring Boot 3 service (Micrometer + Actuator `/actuator/prometheus`).
- **user-db** – PostgreSQL 16 พร้อม seed data
- **postgres-exporter** – `quay.io/prometheuscommunity/postgres-exporter` expose metrics บนพอร์ต `9187`
- **prometheus** – Scrape `user-service:8080` และ `postgres-exporter:9187`
- **grafana** – Provisioned datasource + 2 dashboards (Spring Boot + Postgres)

## Run the Lab

```bash
docker compose up -d

# ติดตาม logs (optional)
docker compose logs -f user-service

# ส่งโหลดทดสอบ HTTP เพื่อตรวจ metrics ฝั่งแอป (optional)
docker run --rm -i grafana/k6 run - <scripts/load.js

# ปิด environment
docker compose down -v
```

### Endpoints

- Prometheus UI: http://localhost:9090
- Grafana UI: http://localhost:3000 (login `admin` / `admin` หรือ anonymous viewer)
- Spring Boot app: http://localhost:8080 (Actuator metrics: `/actuator/prometheus`)
- Postgres exporter: http://localhost:9187/metrics

## Prometheus Configuration

ไฟล์ `prometheus/prometheus.yml` มีสอง jobs หลัก:

```yaml
scrape_configs:
  - job_name: "user-service"
    metrics_path: "/actuator/prometheus"
    scrape_interval: 5s
    static_configs:
      - targets: ["user-service:8080"]

  - job_name: "postgres-exporter"
    scrape_interval: 10s
    static_configs:
      - targets: ["postgres-exporter:9187"]
```

## Grafana Dashboards

Provisioning อยู่ใน `grafana/provisioning` และจะโหลดอัตโนมัติเมื่อ Grafana start:

1. **Spring Boot Metrics (Lab11)** – อ้างอิง Grafana Lab ID 14430 แสดง RPS, latency, error %, heap ฯลฯ (ไฟล์ `spring-boot-metrics.json`).
2. **Postgres Metrics (Lab12)** – dashboard ใหม่ (ไฟล์ `postgres-metrics.json`) ครอบคลุม exporter status, active connections, TPS, cache hit ratio, DB size และ deadlocks ใน 5 นาทีล่าสุด

เปิด Grafana แล้วไปที่ **Dashboards → Spring Boot Metrics (Lab11)** หรือ **Dashboards → Postgres Metrics (Lab12)** เพื่อเริ่มสำรวจข้อมูล
