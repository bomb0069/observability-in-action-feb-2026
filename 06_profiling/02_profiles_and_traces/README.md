# Lab06-02: Span Profiles — Linking Traces to Profiles

## Overview

Lab นี้รวม **Distributed Tracing** (OpenTelemetry) กับ **Continuous Profiling** (Pyroscope) เข้าด้วยกันผ่าน **Span Profiles** ทำให้สามารถคลิกจาก trace span ไปดู flame graph ของ span นั้นๆ ได้โดยตรง

สิ่งที่ได้เรียนรู้:
- การ link profiles เข้ากับ traces (span-level profiling)
- การใช้ Pyroscope agent ร่วมกับ OpenTelemetry agent ใน Java
- การใช้ `otel-profiling-go` wrapper ใน Go
- การดู "Profiles for this span" ใน Grafana Tempo

## Architecture

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ user-service │   │ store-service │   │ point-service│
│  (Java)      │   │  (Go)        │   │  (NestJS)    │
│  OTel agent  │   │  OTel SDK    │   │  OTel SDK    │
│  + Pyroscope │   │  + Pyroscope │   │  + Pyroscope │
│    agent     │   │    SDK       │   │    SDK       │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ├──── traces ──────┼──────────────────┤
       │                  │                  │
       └──── profiles ────┼──────────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
┌──────────┐      ┌──────────────┐   ┌──────────────┐
│  LGTM    │      │  Pyroscope   │   │  Prometheus  │
│  :3000   │      │  :4040       │   │  :9090       │
│(Tempo)   │      │              │   │              │
└──────────┘      └──────────────┘   └──────────────┘
```

## Span Profiles — วิธีการ Link

### Java (user-service)
Pyroscope Java agent **ตรวจจับ OTel Java agent โดยอัตโนมัติ** และ link profiles เข้ากับ spans ให้เอง ไม่ต้องเขียน code เพิ่ม

```dockerfile
# ใช้ 2 agents พร้อมกัน
ENTRYPOINT ["java", "-javaagent:opentelemetry-javaagent.jar", "-javaagent:pyroscope.jar", "-jar", "app.jar"]
```

### Go (store-service)
ใช้ `otel-profiling-go` wrapper ครอบ TracerProvider:

```go
import otelpyroscope "github.com/grafana/otel-profiling-go"

// Wrap TracerProvider
otel.SetTracerProvider(otelpyroscope.NewTracerProvider(tp))
```

### Node.js (point-service)
เริ่ม Pyroscope ก่อน OTel bootstrap:

```typescript
import Pyroscope from '@pyroscope/nodejs';
Pyroscope.init({ serverAddress: '...', appName: 'point-service' });
Pyroscope.start();
```

## Getting Started

### 1. Start ทุก services

```bash
docker compose up -d --build
```

### 2. ทดสอบ services

```bash
curl http://localhost:8080/api/v1/users/1
curl http://localhost:8000/api/v1/product
curl http://localhost:8001/api/v1/point
```

### 3. สร้าง traffic

```bash
docker run --rm -i grafana/k6 run - <scripts/load.js
```

### 4. ดู Traces + Profiles ใน Grafana

1. เปิด Grafana: http://localhost:3000
2. ไปที่ **Explore** → เลือก datasource **Tempo**
3. ค้นหา trace ที่สนใจ
4. คลิกที่ span → จะเห็น **"Profiles for this span"**
5. คลิกเพื่อดู flame graph ของ span นั้น

### 5. ดู Profiles โดยตรง

1. ไปที่ **Explore** → เลือก datasource **Pyroscope**
2. เลือก application และ profile type
3. ดู flame graph ภาพรวม

## Ports

| Port | Service |
|------|---------|
| 3000 | Grafana |
| 4040 | Pyroscope |
| 8080 | user-service |
| 8000 | store-service |
| 8001 | point-service |
| 9090 | Prometheus |

## Stop

```bash
docker compose down
```
