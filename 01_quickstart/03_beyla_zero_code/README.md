# Beyla Zero-Code Auto-Instrumentation (Lab03)

Lab03 เป็น quickstart สำหรับ **Beyla eBPF** — แสดงให้เห็นว่าแอปเดิม 3 ตัว (Spring Boot + Go + Node.js) สามารถส่ง telemetry ได้ **โดยไม่ต้องเพิ่ม agent หรือ SDK** ใด ๆ เลย Beyla ใช้ eBPF ดักจับ HTTP traffic ในระดับ kernel แล้วส่ง traces + metrics ผ่าน OTLP ไปยัง LGTM stack โดยอัตโนมัติ

> เปรียบเทียบกับ Lab02 ที่ใช้ OpenTelemetry agents/SDKs (Java agent, Go OTel SDK, NestJS OTel SDK) — lab นี้ทำ observability เดียวกันแต่แบบ **zero-code instrumentation**

## Stack Components

- **user-service** – Spring Boot 3 (Java) — ไม่มี `-javaagent`, plain `java -jar`
- **store-service** – Go/Gin — ไม่มี OTel SDK imports, plain Gin server
- **point-service** – Node.js/Express — ไม่มี OTel SDK, plain Express
- **user-db** – PostgreSQL 16 สำหรับ user-service
- **db** – MySQL 8 shared สำหรับ store + point (seed data ใส่ไว้แล้ว)
- **beyla** – Grafana Beyla (eBPF) — privileged container, host PID/network, monitor 3 services
- **lgtm** – Bundled collector + Loki, Grafana, Tempo, Mimir (เปิดพอร์ต 4317/4318 + 3000)

## Architecture

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│ user-service │    │ store-service │    │point-service │
│ (Java:8080)  │    │  (Go:8000)    │    │(Node.js:8001)│
└──────┬───────┘    └──────┬────────┘    └──────┬───────┘
       │                   │                    │
       │ PostgreSQL        │ MySQL              │ MySQL
       ▼                   ▼                    ▼
   [user-db]             [db] ◄────────────── [db]
       │                   │                    │
       └───────────┬───────┴────────────────────┘
                   │
                   │ eBPF instrumentation (kernel-level)
                   │
              ┌────▼─────┐
              │  Beyla   │ ────OTLP────> LGTM Stack
              │  (eBPF)  │               (Tempo/Mimir/Loki)
              └──────────┘
```

## Beyla ทำงานอย่างไร

1. **Process Discovery** — ค้นหา process ตาม port + executable pattern (java, app, node)
2. **eBPF Probes** — attach probes เข้าไปที่ kernel functions และ HTTP libraries
3. **Network Monitoring** — ดักจับ HTTP request/response ในระดับ network layer
4. **Trace Generation** — สร้าง OpenTelemetry traces จาก network calls
5. **Metrics Export** — สร้าง RED metrics (Rate, Errors, Duration) อัตโนมัติ
6. **OTLP Export** — ส่ง traces + metrics ไปยัง LGTM ผ่าน gRPC (localhost:4317)

## Run the Lab

```bash
# จากโฟลเดอร์ lab03
docker compose up -d --build

# ดูสถานะ
docker compose ps

# ดู Beyla logs (ตรวจสอบว่า discover services แล้ว)
docker compose logs beyla
```

## Generate Telemetry Traffic

```bash
# user-service (Spring Boot)
curl http://localhost:8080/api/v1/users/1

# store-service (Go)
curl http://localhost:8000/api/v1/product

# point-service (Node.js)
curl http://localhost:8001/api/v1/points

# Load test (k6)
docker run --rm -i grafana/k6 run - <scripts/load.js
```

## Explore the Signals

- **Grafana** – http://localhost:3000
  - Explore → **Tempo** data source → ดู traces จาก Beyla
    ```traceql
    { resource.service.name = "user-service" }
    ```
  - Explore → **Prometheus/Mimir** data source → ดู HTTP metrics
    ```promql
    sum(rate(http_server_duration_seconds_count[5m])) by (http_target)
    ```
    ```promql
    histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le, http_target))
    ```

## เปรียบเทียบ Lab02 (OTel Agents) vs Lab03 (Beyla eBPF)

| ด้าน | Lab02 (OTel Agents/SDKs) | Lab03 (Beyla eBPF) |
|------|--------------------------|---------------------|
| **Instrumentation** | Java agent, Go SDK, Node.js SDK | ไม่มี — Beyla ดักจับจาก kernel |
| **Code changes** | ต้องเพิ่ม agent/SDK config | ไม่ต้องเปลี่ยน code เลย |
| **Trace detail** | ละเอียด (DB queries, internal spans) | HTTP-level เท่านั้น |
| **Log correlation** | Trace ID inject เข้า logs อัตโนมัติ | ไม่มี log correlation |
| **Language support** | ต้อง agent เฉพาะภาษา | Language-agnostic |
| **Performance impact** | ปานกลาง (bytecode manipulation) | ต่ำ (kernel-level) |
| **Requirements** | ไม่ต้อง privileged | ต้อง privileged + host PID/network |

### ข้อดีของ Beyla

- ไม่ต้องเพิ่ม dependency ใด ๆ ในแอป
- ใช้ได้กับทุกภาษา (Java, Go, Node.js, Python, etc.)
- Instrument แอปที่ deploy ไว้แล้วได้ทันทีโดยไม่ต้อง restart
- Overhead ต่ำเพราะทำงานในระดับ kernel

### ข้อจำกัดของ Beyla

- ไม่สามารถ inject trace ID เข้า application logs ได้
- ไม่เห็น internal spans (DB queries, method calls)
- ต้องใช้ Linux kernel 4.x+ ที่รองรับ eBPF
- ต้อง privileged access (`SYS_ADMIN`, `SYS_PTRACE`, `SYS_RESOURCE`)

## Clean Up

```bash
docker compose down -v
```

> Lab03 มีเป้าหมายเพื่อแสดง zero-code instrumentation ด้วย eBPF — เหมาะสำหรับกรณีที่ไม่สามารถแก้ไข code หรือ deployment ของแอปได้ แต่ยังต้องการ observability ในระดับ HTTP/network
