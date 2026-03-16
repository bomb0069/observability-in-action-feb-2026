# OpenTelemetry Tracing with LGTM Stack (Lab14)

Lab14 ต่อยอดจาก Lab01 โดยเปลี่ยนจาก **Prometheus + Grafana** เป็น **LGTM Stack (Loki, Grafana, Tempo, Mimir)** เพื่อรับ **distributed tracing** จาก Spring Boot application ผ่าน OpenTelemetry Protocol (OTLP)

## Stack Components

- **user-service** – Spring Boot 3 service with OpenTelemetry instrumentation
- **user-db** – PostgreSQL 16 database
- **lgtm** – `grafana/otel-lgtm` all-in-one stack รวม:
  - **Grafana** – Visualization and dashboards (port 3000)
  - **Tempo** – Distributed tracing backend
  - **Loki** – Log aggregation
  - **Mimir** – Metrics storage (Prometheus-compatible)
  - **OTLP Receiver** – Accepts traces, metrics, and logs (ports 4317/4318)

## What's New in Lab14

### เปลี่ยนจาก Lab01:

- ❌ ลบ standalone Prometheus และ Grafana
- ✅ เพิ่ม LGTM stack (all-in-one observability)
- ✅ เพิ่ม **OpenTelemetry Java Agent** สำหรับ auto-instrumentation
- ✅ Configure OTLP exporter ผ่าน environment variables เท่านั้น
- ✅ **ไม่ต้องแก้ code** หรือเพิ่ม dependencies!

### Key Features:

- **Zero-Code Instrumentation** – ใช้ Java Agent ไม่ต้องแก้ code
- **Distributed Tracing** – ดู request flow ผ่าน services
- **Auto-instrumentation** – HTTP requests, database queries, JPA operations
- **Trace Sampling** – 100% sampling สำหรับ development
- **Unified Observability** – Metrics + Traces + Logs ใน platform เดียว

## Run the Lab

```bash
# เริ่ม environment
docker compose up -d --build

# ตรวจสอบว่า services ทำงานปกติ
docker compose ps

# ติดตาม logs (optional)
docker compose logs -f user-service

# ส่ง HTTP requests เพื่อสร้าง traces
curl http://localhost:8080/api/v1/users/1
curl http://localhost:8080/api/v1/users
curl http://localhost:8080/api/v1/users/2

# Load testing ด้วย k6 (optional)
docker run --rm -i grafana/k6 run - <scripts/load.js

# ปิด environment
docker compose down -v
```

### Endpoints

- **Grafana UI**: http://localhost:3000 (login `admin` / `admin`)
- **Spring Boot API**: http://localhost:8080/api/v1/users
- **Actuator Metrics**: http://localhost:8080/actuator/prometheus
- **Health Check**: http://localhost:8080/actuator/health
- **OTLP gRPC Receiver**: localhost:4317
- **OTLP HTTP Receiver**: localhost:4318

## OpenTelemetry Configuration

### Java Agent Approach (Zero-Code Instrumentation)

Lab14 ใช้ **OpenTelemetry Java Agent** ซึ่งเป็น bytecode instrumentation ที่ทำงานโดยไม่ต้องแก้ code:

```dockerfile
# Dockerfile
COPY agent/opentelemetry-javaagent.jar opentelemetry-javaagent.jar
ENTRYPOINT ["java","-javaagent:opentelemetry-javaagent.jar", "-jar","app.jar"]
```

### Environment Variables (docker-compose.yaml)

การ configure ทั้งหมดทำผ่าน environment variables:

```yaml
environment:
  # Service identification
  OTEL_SERVICE_NAME: user-service
  OTEL_RESOURCE_ATTRIBUTES: service.name=user-service

  # OTLP Exporter configuration
  OTEL_EXPORTER_OTLP_ENDPOINT: http://lgtm:4317
  OTEL_EXPORTER_OTLP_PROTOCOL: grpc

  # Signal exporters
  OTEL_TRACES_EXPORTER: otlp
  OTEL_METRICS_EXPORTER: otlp
  OTEL_LOGS_EXPORTER: otlp
```

### ทำไมไม่ต้องใส่ในcoทำ application.yaml?

Environment variables มี **precedence สูงกว่า** application.yaml อยู่แล้ว ดังนั้น:

- ✅ Configure ที่เดียวใน docker-compose.yaml
- ❌ ไม่ต้อง duplicate ใน application.yaml
- ✅ แก้ไขได้ง่าย ไม่ต้อง rebuild image

### ทำไมไม่ต้องใส่ใน pom.xml?

Java Agent ทำ **bytecode instrumentation** ตอน runtime:

- ✅ ไม่ต้องเพิ่ม OpenTelemetry dependencies
- ✅ ไม่ต้อง compile-time instrumentation
- ✅ ไม่ต้องแก้ code เลย
- ✅ เก็บเฉพาะ Micrometer/Actuator สำหรับ metrics

## Viewing Traces in Grafana

### 1. Access Grafana

เปิด browser ที่ http://localhost:3000

### 2. Navigate to Explore

- คลิก **Explore** icon (🔍) ใน left sidebar
- เลือก data source: **Tempo**

### 3. Query Traces

**Option 1: Search by Service**

- Service Name: `user-service`
- คลิก **Run Query**

**Option 2: Search by Operation**

- Operation: `GET /api/v1/users/{id}`
- คลิก **Run Query**

**Option 3: TraceQL Query**

```
{ service.name="user-service" && http.method="GET" }
```

### 4. Analyze Trace Details

เมื่อคลิกที่ trace จะเห็น:

- **Timeline view** – ระยะเวลาของแต่ละ span
- **Span details** – Attributes, events, errors
- **Service graph** – ความสัมพันธ์ระหว่าง services
- **Database queries** – SQL statements และ execution time

## What Gets Traced

OpenTelemetry Java Agent จะ auto-instrument โดยอัตโนมัติ:

### HTTP Requests

- **All incoming HTTP requests** (Spring MVC, Spring WebFlux)
- **Span name**: `GET /api/v1/users/{id}`
- **Attributes**:
  - `http.method`: GET, POST, PUT, DELETE
  - `http.url`: Full request URL
  - `http.status_code`: 200, 404, 500, etc.
  - `http.route`: URL pattern with path parameters

### Database Operations (JDBC)

- **All SQL queries** (PostgreSQL, MySQL, etc.)
- **Span name**: `SELECT users`, `INSERT orders`
- **Attributes**:
  - `db.system`: postgresql
  - `db.name`: user
  - `db.statement`: Full SQL query
  - `db.operation`: SELECT, INSERT, UPDATE, DELETE
  - `db.sql.table`: table name

### JPA/Hibernate Operations

- **Entity operations** (findById, save, delete)
- **Transaction boundaries**
- **Span name**: Based on entity operation
- **Lazy loading queries**

### HTTP Client Requests

- **RestTemplate**, **WebClient**, **HttpClient**
- Outgoing HTTP calls to other services
- Automatic trace context propagation

### Other Auto-Instrumented Libraries:

- Spring Data JPA
- Spring Scheduling (@Async, @Scheduled)
- Kafka, RabbitMQ messaging
- Redis, MongoDB
- gRPC calls

**ไม่ต้องแก้ code อะไรเลย!** Java Agent จะ detect และ instrument ทุกอย่างอัตโนมัติ

## Understanding Traces

### Trace Structure

```
Trace (Request ID: abc123)
├─ HTTP GET /api/v1/users/1
│  ├─ JPA findById
│  │  └─ SQL SELECT FROM users WHERE id=?
│  └─ Response serialization
```

### Key Metrics from Traces

- **Latency** – Total request time
- **Duration** – Time spent in each span
- **Error rate** – Failed requests (status code 5xx)
- **Throughput** – Requests per second

### Trace Attributes

Traces มี attributes ที่มีประโยชน์:

- `service.name` – Service identifier
- `http.method`, `http.route` – HTTP details
- `db.statement` – SQL queries
- `error` – Error flag (true/false)
- `exception.message` – Error details

## Example Scenarios

### Scenario 1: Normal Request Flow

```bash
# ส่ง request
curl http://localhost:8080/api/v1/users/1

# ใน Grafana Explore (Tempo):
# จะเห็น trace มี 2-3 spans:
# 1. HTTP GET /api/v1/users/{id} (~50ms)
# 2. JPA findById (~20ms)
# 3. SQL SELECT (~15ms)
```

### Scenario 2: Slow Database Query

```bash
# ส่ง request ที่ get all users
curl http://localhost:8080/api/v1/users

# ใน trace จะเห็น:
# 1. HTTP GET /api/v1/users (~200ms)
# 2. JPA findAll (~150ms)
# 3. SQL SELECT * FROM users (~140ms) <- slow!
```

### Scenario 3: Error Tracing

```bash
# ส่ง request ที่ user ไม่มีอยู่
curl http://localhost:8080/api/v1/users/999

# ใน trace จะเห็น:
# 1. HTTP GET /api/v1/users/{id}
# 2. error=true, http.status_code=404
# 3. exception.message="User not found"
```

## Load Testing with Traces

```bash
# รัน k6 load test
docker run --rm -i grafana/k6 run - <scripts/load.js

# ใน Grafana:
# 1. เปิด Explore → Tempo
# 2. Search with time range: Last 5 minutes
# 3. Service: user-service
# 4. Sort by: Duration (descending)
# 5. วิเคราะห์ slowest traces
```

## Trace Analysis Tips

### 1. Identify Bottlenecks

- เรียง traces ตาม duration
- ดู spans ที่ใช้เวลานานที่สุด
- มักจะเป็น database queries หรือ external API calls

### 2. Monitor Error Rate

```
{ service.name="user-service" && error=true }
```

### 3. Find Slow Queries

```
{ service.name="user-service" && span.kindJava Agent (zero-code) |
| **Dependencies** | Micrometer | Micrometer (no OTel deps needed) |
| **Configuration** | application.yaml | Environment variables |
| **Code Changes** | None | Nonestgresql" }
```

### 4. Compare Request Patterns

- เปรียบเทียบ traces ของ endpoints ต่างๆ
- ดูว่า endpoint ไหนช้ากว่า
- วิเคราะห์สาเหตุ (database, serialization, business logic)

## Differences from Lab01

| Feature             | Lab01                 | Lab14                      |
| ------------------- | --------------------- | -------------------------- |
| **Metrics**         | Prometheus standalone | Mimir (in LGTM)            |
| **Visualization**   | Grafana standalone    | Grafana (in LGTM)          |
| **Tracing**         | ❌ None               | ✅ Tempo                   |
| **Logs**            | ❌ None               | ✅ Loki                    |
| **Protocol**        | Prometheus scrape     | OTLP push                  |
| **Instrumentation** | Micrometer only       | Micrometer + OpenTelemetry |
| **Data Sources**    | 1 (Prometheus)        | 3 (Tempo, Loki, Mimir)     |

## Benefits of LGTM Stack

1. **Single Pane of Glass** – All observability signals in one place
2. **Correlation** – Link traces → logs → metrics
3. **Simplified Setup** – One container vs multiple
4. **OTLP Standard** – Vendor-neutral instrumentation
5. **Production Ready** – Based on Grafana Cloud architecture

## Next Steps

After Lab14, explore:

- **Lab15** (coming soon) – Multi-service tracing with service mesh
- **Lab16** (coming soon) – Custom spans and trace context propagation
- **Lab17** (coming soon) – Trace-based alerting and SLOs

## Troubleshooting

### Traces ไม่แสดงใน Grafana

1. ตรวจสอบว่า LGTM container ทำงาน:

   ```bash
   docker compose logs lgtm
   ```

2. ตรวจสอบว่า user-service ส่ง traces:

   ```bash
   docker compose logs user-service | grep -i otel
   ```

3. ตรวจสอบว่า Tempo data source configured:
   - Grafana → Configuration → Data Sources
   - ควรมี "Tempo" data source

### Dependencies ดาวน์โหลดไม่สำเร็จ

````bash
# Rebuild with clean
doc

**Note**: Lab14 ไม่ได้ใช้ OpenTelemetry dependencies ใน pom.xml แล้ว ใช้ Java Agent แทน ซึ่ง download มาไว้ใน `agent/` folder แล้ว

### Java Agent ไม่ทำงาน

ตรวจสอบว่า Java Agent ถูก load:
```bash
docker compose logs user-service | grep -i "opentelemetry"
# ควรเห็น: "OpenTelemetry Javaagent"
````

ถ้าไม่เห็น ตรวจสอบ:

1. File `agent/opentelemetry-javaagent.jar` มีอยู่หรือไม่
2. Dockerfile COPY และ ENTRYPOINT ถูกต้องker compose down
   docker compose build --no-cache user-service
   docker compose up -d

````

### Port conflicts

ถ้า port 3000 หรือ 8080 ถูกใช้งานอยู่:
```bash
# แก้ไข docker-compose.yaml
# เปลี่ยน "3000:3000" เป็น "3001:3000"
# เปลี่ยน "8080:8080" เป็น "8081:8080"
````

## Resources

- [OpenTelemetry Java Instrumentation](https://opentelemetry.io/docs/instrumentation/java/)
- [Grafana Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [OTLP Specification](https://opentelemetry.io/docs/reference/specification/protocol/)
- [Spring Boot + OpenTelemetry](https://spring.io/blog/2022/10/12/observability-with-spring-boot-3)
