# OpenTelemetry Quick Run (Lab02)

Lab02 เป็น lab สั้น ๆ สำหรับลองรัน OpenTelemetry แบบ end-to-end ก่อนเข้าสู่เนื้อหาเชิงลึก ผู้เรียนจะได้เห็นว่าแอปหลายภาษา (Spring Boot + Go + Node.js) ส่ง telemetry (metrics + traces + logs) ผ่าน OTLP ไปยัง LGTM stack ได้อย่างไร พร้อม Prometheus แยกต่างหากสำหรับดู Micrometer metrics โดยตรง

## Stack Components

- **user-service** – Spring Boot 3 + Micrometer/Actuator `/actuator/prometheus`
- **store-service** – Go service ที่ยิง OTLP ออกมาผ่าน env config
- **point-service** – Node.js service สำหรับจัดการคะแนนลูกค้า
- **user-db** – PostgreSQL 16 สำหรับ user-service
- **db** – MySQL 8 สำหรับ store/point (seed data ใส่ไว้แล้ว)
- **lgtm** – Bundled collector + Loki, Grafana, Tempo, Mimir (เปิดพอร์ต 4317/4318 + 3000)
- **prometheus** – เก็บ Spring Boot metrics เพิ่มเติม (config ที่ `prometheus/prometheus.yml`)

## Run the Lab

```bash
# จากโฟลเดอร์ lab02
docker compose up -d

# ดูสถานะ (optional)
docker compose ps

# ปิด environment
docker compose down -v
```

## Generate Telemetry Traffic

```bash
# Spring Boot user-service
curl http://localhost:8080/api/users

# Store service (Go)
curl http://localhost:8000/products

# Point service (Node.js)
curl -X POST http://localhost:8001/points \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"points":10}'
```

## Explore the Signals

- **Grafana (LGTM bundle)** – http://localhost:3000
  - Dashboards → OpenTelemetry Demo (service map + latency panels)
  - Explore → Tempo data source เพื่อตาม trace แต่ละ request
  - Explore → Loki data source เพื่อดู logs ที่แนบมากับ spans
- **Prometheus UI** – http://localhost:9090 (ลอง query `http_server_requests_seconds_count` จาก `user-service`)
- **OTLP Endpoint** – `lgtm:4317` (gRPC) / `lgtm:4318` (HTTP) ถูก config ใน compose แล้ว

## Clean Up

```bash
docker compose down -v
```

> Lab02 มีเป้าหมายเพื่อให้เห็นภาพรวมการส่ง telemetry ผ่าน OTLP อย่างรวดเร็ว รายละเอียดเชิงลึกและการ customize dashboards จะต่อยอดใน labs ถัดไป
