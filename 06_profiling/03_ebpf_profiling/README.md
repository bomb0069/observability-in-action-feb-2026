# Lab: eBPF Zero-Code Profiling with Grafana Alloy

## Overview

Lab นี้แสดง **zero-code continuous profiling** โดยใช้ **Grafana Alloy** กับ **eBPF** เพื่อ profile application โดย **ไม่ต้องเปลี่ยน code หรือเพิ่ม SDK ใดๆ** ใน application

เปรียบเทียบกับ Lab ก่อนหน้า:

| Approach | Lab | ต้องเปลี่ยน Code? | ข้อมูลที่ได้ |
|----------|-----|-------------------|-------------|
| SDK-based | 01_pyroscope_intro | ใช่ — เพิ่ม SDK/agent ในแต่ละ service | CPU, Memory, Lock (ละเอียดสุด) |
| Span Profiles | 02_profiles_and_traces | ใช่ — เพิ่ม SDK + OTel integration | Profiles + Traces linked |
| **eBPF** | **03_ebpf_profiling** | **ไม่** — zero-code | CPU profiling (kernel-level) |

## Architecture

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ user-service │   │ store-service │   │ point-service│
│  (Java)      │   │  (Go)        │   │  (Node.js)   │
│  ไม่มี SDK   │   │  ไม่มี SDK   │   │  ไม่มี SDK   │
└──────────────┘   └──────────────┘   └──────────────┘
       ▲                  ▲                  ▲
       │      eBPF probes (kernel-level)     │
       └──────────┬───────┴──────────────────┘
                  │
          ┌──────────────┐
          │  Alloy       │
          │  (privileged)│
          │  pid: host   │
          └──────┬───────┘
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

## Alloy Configuration

Alloy ใช้ 3 components หลัก:

1. **`discovery.docker`** — ค้นหา containers ที่รันอยู่ผ่าน Docker socket
2. **`discovery.relabel`** — filter เฉพาะ containers ที่สนใจ (user-service, store-service, point-service)
3. **`pyroscope.ebpf`** — attach eBPF probes เข้ากับ process ที่ค้นพบ
4. **`pyroscope.write`** — ส่ง profiling data ไปยัง Pyroscope server

## Requirements

- **Linux kernel 4.9+** (eBPF support)
- **Docker Desktop for Mac**: มีข้อจำกัด — eBPF profiling อาจทำงานไม่สมบูรณ์เนื่องจากรันใน Linux VM
- **Linux host**: ทำงานได้ดีที่สุด

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

### 3. สร้าง traffic

```bash
docker run --rm -i grafana/k6 run - <scripts/load.js
```

### 4. ดู Flame Graph ใน Grafana

1. เปิด Grafana: http://localhost:3000
2. ไปที่ **Explore**
3. เลือก datasource **Pyroscope**
4. เลือก application (เช่น `store-service`)
5. จะเห็น flame graph แสดง CPU usage ในระดับ function

## eBPF vs SDK Profiling

| Feature | eBPF (Alloy) | SDK (Pyroscope) |
|---------|-------------|-----------------|
| Code changes | ไม่ต้อง | ต้องเพิ่ม SDK/agent |
| Profile types | CPU เท่านั้น | CPU, Memory, Lock, Goroutine |
| Overhead | ต่ำมาก | ต่ำ |
| Language support | ทุกภาษา | Java, Go, Node.js, Python, etc. |
| Symbol resolution | ต้องมี debug symbols | ไม่จำเป็น |
| Deployment | ต้องการ privileged access | ไม่ต้องการ |

## Ports

| Port | Service |
|------|---------|
| 3000 | Grafana |
| 4040 | Pyroscope |
| 8080 | user-service |
| 8000 | store-service |
| 8001 | point-service |

## Stop

```bash
docker compose down
```
