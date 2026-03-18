# Lab: Continuous Profiling with Grafana Pyroscope

## Overview

Continuous Profiling คือ "เสาหลักที่ 4" ของ Observability (ต่อจาก Logs, Metrics, Traces) ช่วยให้เราเห็น **CPU usage, memory allocation** และ resource consumption ของ application ในระดับ function-level ผ่าน **flame graph**

ใน lab นี้เราจะเพิ่ม **Grafana Pyroscope** SDK เข้าไปใน microservices ทั้ง 3 ตัว เพื่อส่ง profiling data ไปยัง Pyroscope server แล้วดูผลผ่าน Grafana

## Architecture

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ user-service │   │ store-service │   │ point-service│
│  (Java)      │   │  (Go)        │   │  (Node.js)   │
│  + pyroscope │   │  + pyroscope │   │  + pyroscope │
│    agent     │   │    SDK       │   │    SDK       │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────┬───────┴──────────────────┘
                  │ profiles
                  ▼
          ┌──────────────┐
          │  Pyroscope   │
          │  :4040       │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │   Grafana    │
          │   :3000      │
          └──────────────┘
```

## Services

| Service | Language | Profiling Method | Port |
|---------|----------|-----------------|------|
| user-service | Java (Spring Boot) | Pyroscope Java agent (`-javaagent:pyroscope.jar`) | 8080 |
| store-service | Go (Gin) | Pyroscope Go SDK (`github.com/grafana/pyroscope-go`) | 8000 |
| point-service | Node.js (Express) | Pyroscope Node.js SDK (`@pyroscope/nodejs`) | 8001 |

## Profile Types

### Java (user-service)
- **CPU** — itimer-based CPU profiling
- **Alloc** — memory allocation profiling
- **Lock** — lock contention profiling

### Go (store-service)
- **CPU** — goroutine CPU time
- **Alloc Objects/Space** — heap allocation count and size
- **Inuse Objects/Space** — current heap usage

### Node.js (point-service)
- **CPU** — wall-clock CPU profiling
- **Heap** — memory allocation profiling

## Getting Started

### 1. Start ทุก services

```bash
docker compose up -d --build
```

### 2. ทดสอบ services

```bash
# user-service
curl http://localhost:8080/api/v1/users/1

# store-service
curl http://localhost:8000/api/v1/product

# point-service
curl http://localhost:8001/api/v1/points
```

### 3. สร้าง traffic ด้วย k6

```bash
docker run --rm -i grafana/k6 run - <scripts/load.js
```

### 4. ดู Flame Graph ใน Grafana

1. เปิด Grafana: http://localhost:3000
2. ไปที่ **Explore**
3. เลือก datasource **Pyroscope**
4. เลือก application (เช่น `user-service`)
5. เลือก profile type (เช่น `cpu`)
6. จะเห็น **Flame Graph** แสดง function ที่ใช้ CPU มากที่สุด

## Flame Graph อ่านอย่างไร

- **แกนนอน (X-axis)**: สัดส่วน resource usage (กว้างกว่า = ใช้ resource มากกว่า)
- **แกนตั้ง (Y-axis)**: call stack depth (ล่างสุด = root, บนสุด = leaf function)
- **สี**: ไม่มีความหมายพิเศษ — ใช้แยก function ให้เห็นชัด
- **คลิกที่ block**: zoom เข้าไปดู subtree ของ function นั้น

## Pyroscope UI

นอกจาก Grafana แล้ว สามารถเข้า Pyroscope UI ได้โดยตรงที่ http://localhost:4040

## Stop

```bash
docker compose down
```
