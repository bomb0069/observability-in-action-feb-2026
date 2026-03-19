# Lab02-08 - Unified Multi-Application Logs with LGTM Stack

Lab สำหรับรวม logs จาก multiple applications (Apache และ JSON format) และแสดงใน **visualizations เดียวกัน** บน Grafana โดยใช้ LGTM Stack พร้อม split series aggregation

## Architecture

```
Flog (Apache combined format)  ────┐
                                   │
                                   ├──→ Promtail (parse both formats)
                                   │       ↓
Flog2 (JSON format)  ──────────────┘    Loki (unified storage)
                                           ↓
                                        Grafana (unified visualizations)
```

## Components

- **Flog**: Apache combined format logs (1 log/sec)
- **Flog2**: JSON format logs (2 logs/sec)
- **Promtail**: Log collector พร้อม pipeline stages สำหรับ parse ทั้ง 2 formats
- **Loki**: Log aggregation system เก็บ logs จากทั้ง 2 sources
- **Grafana**: Visualization platform แสดง unified visualizations

## Lab Objectives

1. เก็บ logs จาก 2 applications ที่มี format ต่างกัน (Apache + JSON)
2. Parse ทั้ง 2 formats ด้วย Promtail pipeline stages
3. Normalize field names ให้เหมือนกัน (remote_ip, method, status)
4. สร้าง unified visualizations โดยใช้ split series by application
5. เปรียบเทียบ traffic patterns จาก 2 sources ใน panel เดียวกัน
6. ใช้ LogQL queries ที่ยืดหยุ่นสำหรับ filter และ aggregate

## Key Features

✨ **Unified Visualizations**

- รวมข้อมูลจากทั้ง 2 applications ใน **panel เดียวกัน**
- Split series by `app` label (flog และ flog2)
- 7 unified visualizations แทน 14 separate visualizations

🔄 **Field Normalization**

- Apache logs: Parse ด้วย regex pattern
- JSON logs: Parse ด้วย JSON stage
- Normalize เป็น common fields: remote_ip, method, status

📊 **Flexible Querying**

- LogQL queries filter ด้วย labels: `{environment="lab"}`
- Aggregate by app: `sum by (app) (...)`
- Split series: `sum by (app, status) (...)`

⏰ **Timezone Support**

- Grafana แสดงเวลาเป็น Asia/Bangkok (UTC+7)
- Auto-conversion จาก UTC timestamps

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. Start all services:

```bash
docker-compose up -d
```

2. Check services status:

```bash
docker-compose ps
```

Expected output:

```
NAME       IMAGE                       STATUS
flog       mingrammer/flog            Up
flog2      mingrammer/flog            Up
promtail   grafana/promtail:2.9.3     Up
loki       grafana/loki:2.9.3         Up
grafana    grafana/grafana:10.2.3     Up
```

3. View logs to monitor data flow:

```bash
# Watch both log files
tail -f logs/*.log

# Watch promtail processing logs
docker-compose logs -f promtail

# Watch Loki receiving logs
docker-compose logs -f loki
```

4. Access Grafana:

- URL: http://localhost:3000
- **No login required** (anonymous authentication enabled)
- Dashboard: **"Unified Multi-Application Logs - LGTM Stack"**

## Dashboard Visualizations

### 1. HTTP Status Code Distribution (Unified) - Pie Chart

แสดงสัดส่วนของ HTTP status codes จากทั้ง 2 applications

**LogQL Query:**

```
sum by (app, status) (count_over_time({environment="lab"} [$__interval]))
```

**Key Feature:**

- แสดงทั้ง flog และ flog2 ใน pie chart เดียวกัน
- แยกสีตาม app และ status code

---

### 2. Total Requests by Application - Gauge

แสดงจำนวน requests แยกตาม application

**LogQL Query:**

```
sum by (app) (count_over_time({environment="lab"} [$__interval]))
```

**Key Feature:**

- 2 gauges แสดง flog และ flog2 แยกกัน
- เปรียบเทียบ volume ระหว่าง 2 apps (ควรเป็น 1:2)

---

### 3. Traffic Over Time (Unified) - Time Series

แสดงปริมาณ traffic ตามเวลาจากทั้ง 2 applications

**LogQL Query:**

```
sum by (app) (count_over_time({environment="lab"} [$__interval]))
```

**Key Feature:**

- 2 lines บน chart เดียวกัน (flog และ flog2)
- เห็น traffic pattern แบบ real-time
- Legend แสดง mean และ max values

---

### 4. HTTP Methods Over Time (Unified) - Time Series

แสดง HTTP methods (GET, POST, etc.) ตามเวลาแยกตาม application

**LogQL Query:**

```
sum by (app, method) (count_over_time({environment="lab"} [$__interval]))
```

**Key Feature:**

- Multiple lines แสดง method แต่ละตัวจากทั้ง 2 apps
- Format: "flog - GET", "flog2 - POST", etc.
- เปรียบเทียบ method distribution

---

### 5. Top 10 Requesting IPs (Unified) - Bar Chart

แสดง IP addresses ที่ request มามากที่สุด 10 อันดับจากทั้ง 2 apps

**LogQL Query:**

```
topk(10, sum by (app, remote_ip) (count_over_time({environment="lab"} [$__interval])))
```

**Key Feature:**

- Bar chart แสดงทั้ง flog และ flog2
- Format: "flog - 192.168.1.1", "flog2 - 10.0.0.5"
- เรียงตาม count (มากไปน้อย)

---

### 6. Top Status Codes by Application - Table

แสดง status codes ที่เกิดบ่อยที่สุด แยกตาม application

**LogQL Query:**

```
topk(10, sum by (app, status) (count_over_time({environment="lab"} [$__interval])))
```

**Key Feature:**

- Table columns: app, status, count
- เรียงตาม count (มากไปน้อย)
- ดู status code distribution แบบละเอียด

---

### 7. All Application Logs (Unified) - Logs Panel

แสดง raw logs จากทั้ง 2 applications

**LogQL Query:**

```
{environment="lab"}
```

**Key Feature:**

- แสดง logs จากทั้ง flog และ flog2
- Labels แสดงเพื่อแยกแยะ source
- Real-time log streaming

## Promtail Configuration Details

### Apache Log Parsing (flog)

```yaml
pipeline_stages:
  # 1. Parse with regex
  - regex:
      expression: '^(?P<remote_ip>[\w\.]+) - ...'

  # 2. Parse timestamp
  - timestamp:
      source: timestamp
      format: 02/Jan/2006:15:04:05 -0700

  # 3. Create labels
  - labels:
      remote_ip:
      method:
      status:
```

### JSON Log Parsing (flog2)

```yaml
pipeline_stages:
  # 1. Parse JSON
  - json:
      expressions:
        host: host
        method: method
        status: status
        # ... more fields

  # 2. Parse timestamp
  - timestamp:
      source: datetime
      format: 02/Jan/2006:15:04:05 -0700

  # 3. Rename fields for consistency
  - template:
      source: remote_ip
      template: "{{ .host }}"

  # 4. Create labels
  - labels:
      remote_ip:
      method:
      status:
```

## Verify Data Ingestion

### Check Loki labels:

```bash
curl -s "http://localhost:3100/loki/api/v1/labels" | jq
```

Expected labels:

```json
{
  "status": "success",
  "data": [
    "app",
    "environment",
    "job",
    "log_type",
    "method",
    "remote_ip",
    "status"
  ]
}
```

### Check label values:

```bash
# Check apps
curl -s "http://localhost:3100/loki/api/v1/label/app/values" | jq

# Should return: ["flog", "flog2"]
```

### Query logs from specific app:

```bash
# Flog logs
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={app="flog"}' \
  --data-urlencode 'limit=3' | jq

# Flog2 logs
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={app="flog2"}' \
  --data-urlencode 'limit=3' | jq
```

### Count logs per app:

```bash
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query=sum by (app) (count_over_time({environment="lab"} [1m]))' | jq
```

Expected: flog ≈ 60, flog2 ≈ 120 (ratio 1:2)

## LogQL Query Examples

### Basic Queries

1. **Filter by application:**

```
{app="flog"}
{app="flog2"}
```

2. **Filter by multiple labels:**

```
{app="flog", status="200"}
{app="flog2", method="POST"}
```

3. **All logs:**

```
{environment="lab"}
```

### Aggregation Queries

4. **Count logs per app:**

```
sum by (app) (count_over_time({environment="lab"} [5m]))
```

5. **Count by app and status:**

```
sum by (app, status) (count_over_time({environment="lab"} [5m]))
```

6. **Top IPs across all apps:**

```
topk(10, sum by (remote_ip) (count_over_time({environment="lab"} [5m])))
```

7. **Rate of logs per second:**

```
rate({app="flog"} [1m])
rate({app="flog2"} [1m])
```

### Advanced Queries

8. **Error logs only (5xx):**

```
{environment="lab", status=~"5.."}
```

9. **GET requests only:**

```
{environment="lab", method="GET"}
```

10. **Compare traffic between apps:**

```
sum by (app) (rate({environment="lab"} [1m]))
```

## Comparison: Lab02-08 vs Lab02-07

| Feature          | Lab02-07       | Lab02-08                      |
| ---------------- | -------------- | ----------------------------- |
| Applications     | 1 (flog)       | 2 (flog + flog2)              |
| Log Formats      | Apache only    | Apache + JSON                 |
| Visualizations   | 7 (single app) | 7 (unified, multi-app)        |
| Dashboard Type   | Single app     | Unified with split series     |
| Promtail Config  | 1 job          | 2 jobs with different parsers |
| Labels           | app="flog"     | app="flog" or "flog2"         |
| Query Complexity | Simple         | Aggregation by app            |

## Comparison: Lab02-08 vs Lab02-06 (ELK)

| Feature             | Lab02-06 (ELK)                  | Lab02-08 (LGTM)          |
| ------------------- | ------------------------------- | ------------------------ |
| Stack               | Elasticsearch, Logstash, Kibana | Loki, Grafana, Promtail  |
| Log Collection      | Filebeat                        | Promtail                 |
| Log Processing      | Logstash filters                | Promtail pipeline stages |
| Storage             | Elasticsearch (full-text index) | Loki (label-based index) |
| Indexing            | Full log content                | Labels only              |
| Resource Usage      | Higher                          | Lower                    |
| Query Language      | KQL                             | LogQL                    |
| Visualization       | Kibana                          | Grafana                  |
| Field Normalization | Logstash mutate                 | Promtail template        |

**Key Differences:**

- **Loki**: Index เฉพาะ labels → ประหยัด storage และ memory
- **Elasticsearch**: Full-text index → ค้นหาได้ทุกอย่างแต่ใช้ resource มากกว่า
- **Promtail**: Pipeline stages ยืดหยุ่น parse ได้หลาย format
- **LogQL**: Query language คล้าย PromQL เหมาะกับ time series

## Troubleshooting

### No data in Grafana?

1. **Check if both flogs are generating logs:**

```bash
ls -lh logs/
# Should see: access.log and app.log
```

2. **Check log content:**

```bash
# Apache format (flog)
tail -3 logs/access.log

# JSON format (flog2)
tail -3 logs/app.log
```

3. **Check Promtail is reading both files:**

```bash
docker-compose logs promtail | grep "Adding target"
# Should see 2 targets: access.log and app.log
```

4. **Check Loki has both apps:**

```bash
curl -s "http://localhost:3100/loki/api/v1/label/app/values" | jq
# Should return: ["flog", "flog2"]
```

5. **Check label cardinality:**

```bash
curl -s "http://localhost:3100/loki/api/v1/labels" | jq
# Should include: app, method, remote_ip, status
```

### Logs from one app missing?

1. **Check Promtail logs for errors:**

```bash
docker-compose logs promtail | grep -i error
```

2. **Verify file paths:**

```bash
docker exec promtail ls -la /logs/
```

3. **Test LogQL query for each app:**

```bash
# Flog
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={app="flog"}' \
  --data-urlencode 'limit=1' | jq '.data.result | length'

# Flog2
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={app="flog2"}' \
  --data-urlencode 'limit=1' | jq '.data.result | length'
```

### Visualization not splitting by app?

Check LogQL query includes `by (app)`:

```
# Correct:
sum by (app) (count_over_time({environment="lab"} [5m]))

# Wrong (aggregates all):
sum(count_over_time({environment="lab"} [5m]))
```

## Clean Up

Stop and remove all containers:

```bash
docker-compose down
```

Remove volumes and generated logs:

```bash
docker-compose down -v
rm -rf logs/
```

## Next Steps

After completing this lab, you can:

1. **Compare with Lab02-06** (ELK Stack):
   - Resource usage: `docker stats`
   - Query performance
   - Storage requirements
   - Feature differences

2. **Experiment with Queries**:
   - Try different LogQL patterns
   - Add more filters and aggregations
   - Create custom visualizations

3. **Add More Applications**:
   - Add flog3, flog4, etc.
   - Different log formats (syslog, nginx, etc.)
   - Real application logs

4. **Explore Advanced Features**:
   - Alerting with Loki
   - LogQL pattern matching
   - Log sampling
   - Retention policies

## Key Takeaways

✅ **Unified Visualizations** รวมข้อมูลจากหลาย sources ใน panel เดียวกัน

✅ **Promtail Pipeline Stages** ยืดหยุ่น parse ได้หลาย format (regex, JSON, etc.)

✅ **Field Normalization** ทำให้ query และ visualize ได้ง่าย

✅ **LogQL Split Series** ใช้ `sum by (app)` แยก series ตาม application

✅ **Label-Based Indexing** ประหยัด resource กว่า full-text indexing

✅ **LGTM Stack** เหมาะสำหรับ cloud-native และ high-volume logs

## References

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Pipeline Stages](https://grafana.com/docs/loki/latest/clients/promtail/stages/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
