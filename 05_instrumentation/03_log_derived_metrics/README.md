# Lab05-03: Log-Derived Metrics & Function Execution Timing

## แนวคิด (Concept)

Lab นี้สาธิตการ **สร้าง Metrics จาก Logs** (Log-Derived Metrics) โดยใช้ LogQL ของ Loki ร่วมกับการเปรียบเทียบระหว่าง:

1. **Manual Timing ใน Structured JSON Logs** — บันทึก `function`, `event` (start/end), `duration_ms` ลงใน log
2. **Custom OpenTelemetry Spans** — สร้าง span ด้วยมือสำหรับฟังก์ชันเดียวกัน เพื่อเปรียบเทียบค่าที่ได้

ใช้ Grafana Dashboard แสดงผล metrics ที่ derive จาก logs เช่น request rate, P95 latency, error rate

## สถาปัตยกรรม (Architecture)

```
                    ┌─────────────┐
                    │   k6 Load   │
                    │    Test     │
                    └──────┬──────┘
                           │ HTTP :8080
                    ┌──────▼──────┐
                    │ user-service│ (Spring Boot / Java)
                    │   :8080     │
                    └──┬──────┬───┘
                       │      │
            HTTP :8001 │      │ HTTP :8000
                       │      │
              ┌────────▼┐  ┌──▼──────────┐
              │  point-  │  │   store-    │
              │ service  │  │  service    │
              │  :8001   │  │   :8000     │
              └────┬─────┘  └──────┬──────┘
                   │               │
            ┌──────▼───────────────▼──────┐
            │        MySQL (db)           │
            │   point_db + store DB       │
            └─────────────────────────────┘

    All services ──OTLP──▶ lgtm (Grafana + Loki + Tempo + Prometheus)
                            :3000 (Grafana)
                            :4317 (OTLP gRPC)
```

## Quick Start

```bash
cd 05_instrumentation/03_log_derived_metrics

# Start all services
docker-compose up -d

# Wait for services to be ready (~30s)
# Test the API
curl http://localhost:8080/api/v1/users/1

# Check structured JSON logs
docker-compose logs user-service | head -20
docker-compose logs point-service | head -20
docker-compose logs store-service | head -20

# Run load test
docker run --rm -i grafana/k6 run - <scripts/load.js

# Open Grafana dashboard
open http://localhost:3000
# Dashboard: "Log-Derived Metrics" (auto-provisioned)

# Stop
docker-compose down
```

## Structured JSON Logs

แต่ละ service จะ log ข้อมูลในรูปแบบ JSON ที่มี field มาตรฐาน:

```json
{"function":"getUserById","event":"start","user_id":1}
{"function":"getUserById","event":"end","duration_ms":42,"user_id":1}
```

| Field | Description |
|-------|-------------|
| `function` | ชื่อฟังก์ชันที่ทำงาน |
| `event` | `start` หรือ `end` |
| `duration_ms` | เวลาที่ใช้ (มิลลิวินาที) — มีเฉพาะ event=end |
| `error` | ข้อความ error (ถ้ามี) |

## LogQL Queries สำคัญ

### Request Rate by Function
```logql
sum(count_over_time({service_name=~".+"} | json | event="end" [$__interval])) by (function)
```

### P95 Duration by Function
```logql
quantile_over_time(0.95, {service_name=~".+"} | json | event="end" | unwrap duration_ms [$__interval]) by (function)
```

### Average Duration by Function
```logql
avg_over_time({service_name=~".+"} | json | event="end" | unwrap duration_ms [$__interval]) by (function)
```

### Error Rate by Service
```logql
sum(count_over_time({service_name=~".+"} | json | level="ERROR" [$__interval])) by (service_name)
```

### Max Duration by Function
```logql
max_over_time({service_name=~".+"} | json | event="end" | unwrap duration_ms [5m]) by (function)
```

## Dashboard Panels

| Panel | Type | Description |
|-------|------|-------------|
| Request Rate by Function | timeseries | จำนวน request ต่อวินาทีแยกตาม function |
| P95 Duration by Function | timeseries | Percentile 95 ของ duration แยกตาม function |
| Avg Duration by Function | timeseries | ค่าเฉลี่ย duration แยกตาม function |
| Error Rate by Service | timeseries | จำนวน error แยกตาม service |
| Max Duration by Function | gauge | ค่า duration สูงสุดในช่วง 5 นาที |
| Duration Heatmap | heatmap | การกระจายของ duration |
| Function Call Flow | logs | Log entries ที่มี function field |

## การเปรียบเทียบ: Manual Timing Logs vs OTel Custom Spans

| แง่มุม | Manual Timing Logs | OTel Custom Spans |
|--------|-------------------|-------------------|
| ข้อมูลที่เก็บ | duration_ms ใน log message | span duration ใน Tempo |
| การ query | LogQL (Loki) | TraceQL (Tempo) |
| Overhead | ต่ำ (แค่ log) | ปานกลาง (span context) |
| ความยืดหยุ่น | สูง — ใส่ field อะไรก็ได้ | ต้องตาม OTel spec |
| Dashboard | ต้องใช้ unwrap/quantile_over_time | มี built-in metrics |
| Context propagation | ไม่มี | มี (parent-child spans) |

เปิด Grafana Explore → Tempo เพื่อดู custom spans ที่สร้างขึ้นเอง เปรียบเทียบค่า duration กับค่าที่ log ไว้

## Services

| Service | Port | Language | Database |
|---------|------|----------|----------|
| user-service | 8080 | Java (Spring Boot) | PostgreSQL |
| point-service | 8001 | TypeScript (Express) | MySQL |
| store-service | 8000 | Go (Gin) | MySQL |
| Grafana | 3000 | - | - |
| OTLP gRPC | 4317 | - | - |
