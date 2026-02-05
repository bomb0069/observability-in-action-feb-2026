# Spring Boot Metrics Quickstart (Lab01)

Lab01 เป็นสำเนาจาก Lab11 สำหรับคนที่อยากลอง start service แล้วเห็น Application Metrics อย่างรวดเร็ว โดยให้ Prometheus เก็บ Micrometer metrics จาก Spring Boot `user-service` แล้วแสดงผลบน Grafana dashboard ที่ยึดโครงมาจาก Grafana Lab ID **14430**.

## Stack Components

- **user-service** – Spring Boot 3 service (Micrometer + Actuator `/actuator/prometheus`).
- **user-db** – PostgreSQL 16 สำหรับเก็บข้อมูล user service.
- **prometheus** – Scrape metrics ทุก 5 วินาทีจาก `user-service:8080`.
- **grafana** – Provisioned datasource + dashboard เพื่อ visualize metrics.

## Run the Lab

```bash
docker compose up -d

# ติดตาม logs (optional)
docker compose logs -f user-service

# ปิด environment
docker compose down -v

# ส่งโหลดทดสอบ (optional)
docker run --rm -i grafana/k6 run - <scripts/load.js
```

### Endpoints

- Prometheus UI: http://localhost:9090
- Grafana UI: http://localhost:3000 (login `admin` / `admin` หรือใช้ anonymous viewer)
- Spring Boot app: http://localhost:8080 (actuator metrics: `/actuator/prometheus`)

## Prometheus Configuration

ไฟล์ `prometheus/prometheus.yml` ถูกเตรียมไว้ให้แล้วและใช้ job เดียวชื่อ `user-service`:

```yaml
scrape_configs:
  - job_name: "user-service"
    metrics_path: "/actuator/prometheus"
    scrape_interval: 5s
    static_configs:
      - targets: ["user-service:8080"]
```

เมื่อคอนเทนเนอร์ `user-service` ทำงานใน Docker network เดียวกัน Prometheus จะดึง metric ด้วย hostname ตรง ๆ ไม่ต้องพึ่ง `host.docker.internal` อีกต่อไป

## Grafana Dashboard (ID 14430 Inspired)

Grafana ถูกตั้งค่า provisioning ไว้ใน `grafana/provisioning`:

- **Datasource**: `Prometheus` (UID `prometheus`) ชี้ไปยัง `http://prometheus:9090`
- **Dashboard**: `Spring Boot Metrics (Lab01)` (ไฟล์ `grafana/dashboards/spring-boot-metrics.json`)

เนื้อหา dashboard อ้างอิง panel สำคัญจาก Grafana Lab ID 14430 เช่น:

- Requests per second split ตาม HTTP status
- Avg latency (p50/p95 equivalent ด้วยการคำนวณ rate ของ sum/count)
- 5xx error percentage indicator
- CPU usage, Heap utilization gauge, และ live thread count

เปิด Grafana แล้วไปที่ **Dashboards → Spring Boot Metrics (Lab01)** เพื่อสำรวจ metrics ได้ทันที ไม่ต้อง import ด้วยมือ
