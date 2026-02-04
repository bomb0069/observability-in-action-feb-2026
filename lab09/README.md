# Lab09 - Grafana Visualizations for Apache Combined Logs with LGTM Stack

Lab สำหรับสร้าง visualizations และ dashboards บน Grafana เพื่อวิเคราะห์ Apache combined format logs โดยใช้ LGTM Stack (Loki, Grafana, Tempo, Mimir)

## Architecture

```
Flog (Fake Log Generator)
  → Logs to file
    → Promtail (reads file and ships to Loki)
      → Loki (stores and queries logs)
        → Grafana (visualizes and analyzes logs)
```

## Components

- **Flog**: Fake log generator ที่สร้าง Apache combined format logs
- **Promtail**: Log collector ที่อ่าน log files และส่งไปยัง Loki พร้อม parse Apache log format
- **Loki**: Log aggregation system สำหรับเก็บและ query logs อย่างมีประสิทธิภาพ
- **Grafana**: Visualization platform สำหรับสร้าง charts, graphs และ dashboards

## LGTM Stack vs ELK Stack

| Component      | LGTM Stack          | ELK Stack     | Purpose                  |
| -------------- | ------------------- | ------------- | ------------------------ |
| Log Collection | Promtail            | Filebeat      | อ่านและส่ง logs          |
| Log Processing | Promtail (pipeline) | Logstash      | Parse และ transform logs |
| Log Storage    | Loki                | Elasticsearch | เก็บ logs                |
| Visualization  | Grafana             | Kibana        | แสดงผลและวิเคราะห์       |

**Key Differences:**

- **Loki**: Index เฉพาะ labels ไม่ index ทั้ง log content → ใช้ resources น้อยกว่า
- **Elasticsearch**: Full-text indexing → Search ได้ดีกว่าแต่ใช้ resources มากกว่า
- **Promtail**: Parse logs ด้วย pipeline stages (regex, json, etc.)
- **Logstash**: Parse logs ด้วย grok patterns และ filters

## Lab Objectives

1. ทำความเข้าใจ LGTM Stack architecture
2. Configure Promtail เพื่อ parse Apache combined log format
3. Query logs ด้วย LogQL (Loki Query Language)
4. สร้าง Visualizations ที่เหมาะสมกับ Apache combined logs:
   - HTTP status code distribution (Pie chart)
   - Total requests (Gauge)
   - Top requesting IPs (Bar chart)
   - Traffic over time (Time series)
   - HTTP methods distribution (Time series)
   - Raw log viewer
   - Top request URIs (Table)
5. Auto-provision Grafana datasource และ dashboard
6. ตั้งค่า auto-refresh สำหรับ real-time monitoring

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
NAME         IMAGE                       STATUS
flog         mingrammer/flog            Up
loki         grafana/loki:2.9.3         Up
promtail     grafana/promtail:2.9.3     Up
grafana      grafana/grafana:10.2.3     Up
```

3. View logs to monitor data flow:

```bash
# Watch flog generating logs
docker-compose logs -f flog

# Watch promtail shipping logs
docker-compose logs -f promtail

# Watch Loki receiving logs
docker-compose logs -f loki
```

4. Access Grafana:

- URL: http://localhost:3000
- **No login required** (anonymous authentication enabled)
- Dashboard จะถูก auto-provisioned พร้อมใช้งานทันที

## Explore the Dashboard

Dashboard ชื่อ **"Apache Combined Logs - LGTM Stack"** ประกอบด้วย visualizations:

### 1. HTTP Status Code Distribution (Pie Chart)

แสดงสัดส่วนของ HTTP status codes (200, 404, 500, etc.)

**LogQL Query:**

```
sum by (status) (count_over_time({app="flog"} | regexp "..." [$__interval]))
```

### 2. Total Requests (Gauge)

แสดงจำนวน requests ทั้งหมดในช่วงเวลาที่เลือก

**LogQL Query:**

```
sum(count_over_time({app="flog"} [$__interval]))
```

### 3. Top 10 Requesting IPs (Bar Chart)

แสดง IP addresses ที่ส่ง requests มามากที่สุด 10 อันดับ

**LogQL Query:**

```
topk(10, sum by (remote_ip) (count_over_time({app="flog"} | regexp "..." [$__interval])))
```

### 4. Traffic Over Time (Time Series)

แสดงปริมาณ traffic ตามช่วงเวลา

**LogQL Query:**

```
sum(count_over_time({app="flog"} [$__interval]))
```

### 5. HTTP Methods Over Time (Time Series)

แสดงการกระจายของ HTTP methods (GET, POST, etc.) ตามเวลา

**LogQL Query:**

```
sum by (method) (count_over_time({app="flog"} | regexp "..." [$__interval]))
```

### 6. Apache Access Logs (Logs Panel)

แสดง raw logs สำหรับตรวจสอบรายละเอียด

**LogQL Query:**

```
{app="flog"}
```

### 7. Top 10 Request URIs (Table)

แสดง URLs/endpoints ที่ถูกเรียกมากที่สุด 10 อันดับ

**LogQL Query:**

```
topk(10, sum by (request_uri) (count_over_time({app="flog"} | regexp "..." [$__interval])))
```

## Understanding LogQL

LogQL คือ query language ของ Loki (คล้าย PromQL ของ Prometheus)

**Basic Query Structure:**

```
{label="value"} | parser | filter | metrics
```

**Examples:**

1. Filter by label:

```
{app="flog"}
```

2. Parse with regex:

```
{app="flog"} | regexp "(?P<status>\\d{3})"
```

3. Count logs:

```
count_over_time({app="flog"} [5m])
```

4. Aggregate by label:

```
sum by (status) (count_over_time({app="flog"} [5m]))
```

## Promtail Pipeline Stages

Promtail ใช้ pipeline stages เพื่อ parse และ transform logs:

### 1. Regex Stage

Extract fields จาก log line:

```yaml
- regex:
    expression: '^(?P<remote_ip>[\w\.]+) - ...'
```

### 2. Timestamp Stage

Parse timestamp จาก log:

```yaml
- timestamp:
    source: timestamp
    format: 02/Jan/2006:15:04:05 -0700
```

### 3. Labels Stage

สร้าง labels จาก extracted fields:

```yaml
- labels:
    remote_ip:
    method:
    status:
```

### 4. Output Stage

กำหนด output format:

```yaml
- output:
    source: message
```

## Verify Services

### Check Loki is receiving logs:

```bash
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={app="flog"}' | jq
```

### Check Loki labels:

```bash
curl -s "http://localhost:3100/loki/api/v1/labels" | jq
```

### Check Promtail targets:

```bash
curl -s "http://localhost:9080/targets" | jq
```

## Configuration Files

### docker-compose.yml

Defines 4 services:

- flog: Log generator
- loki: Log aggregation system
- promtail: Log collector
- grafana: Visualization

### loki/loki-config.yml

Loki configuration:

- Storage: filesystem (for lab purposes)
- Schema: v11 with boltdb-shipper
- Limits: ingestion rate and retention

### promtail/promtail-config.yml

Promtail configuration:

- Scrape config: file paths and labels
- Pipeline stages: regex parsing for Apache logs
- Client: Loki push endpoint

### grafana/provisioning/

Auto-provisioning configuration:

- datasources/loki.yml: Loki datasource
- dashboards/dashboard.yml: Dashboard provider
- dashboards/apache-logs.json: Dashboard definition

## Troubleshooting

### No data in Grafana?

1. Check if Flog is generating logs:

```bash
docker-compose logs flog
ls -lh logs/
```

2. Check if Promtail is reading logs:

```bash
docker-compose logs promtail | grep "total_bytes_processed"
```

3. Check if Loki is receiving data:

```bash
curl -s "http://localhost:3100/loki/api/v1/labels" | jq
```

4. Check Grafana datasource:

- Go to Configuration → Data Sources
- Click on "Loki"
- Click "Test" button

### Services not starting?

1. Check Docker logs:

```bash
docker-compose logs
```

2. Verify ports are not in use:

```bash
lsof -i :3000  # Grafana
lsof -i :3100  # Loki
```

3. Clean up and restart:

```bash
docker-compose down -v
docker-compose up -d
```

## Advanced: Custom Queries

Try these queries in Grafana Explore (http://localhost:3000/explore):

### 1. Error Logs Only (5xx status codes)

```
{app="flog"} | regexp "(?P<status>5\\d{2})"
```

### 2. GET Requests

```
{app="flog"} | regexp "\"GET "
```

### 3. Large Responses (>10KB)

```
{app="flog"} | regexp "(?P<bytes>\\d+)" | bytes > 10000
```

### 4. Rate of Requests (per second)

```
rate({app="flog"} [1m])
```

### 5. Bytes Transferred Over Time

```
sum(rate({app="flog"} | regexp "(?P<bytes_sent>\\d+)" | unwrap bytes_sent [5m]))
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

1. **Compare with Lab04** (ELK Stack):
   - Resource usage: `docker stats`
   - Query performance
   - Storage requirements

2. **Explore Loki Features**:
   - Log aggregation
   - Label-based indexing
   - LogQL advanced queries

3. **Add More Components**:
   - Tempo for distributed tracing
   - Mimir for metrics
   - Complete LGTM stack

4. **Multi-Application Setup**:
   - Add more log sources
   - Different log formats
   - Label-based filtering

## Key Takeaways

✅ **LGTM Stack** เหมาะกับการเก็บ logs ในปริมาณมาก ด้วย label-based indexing

✅ **Promtail** มี pipeline stages ที่ยืดหยุ่นสำหรับ parse logs

✅ **LogQL** เป็น query language ที่ powerful สำหรับ query และ aggregate logs

✅ **Grafana** รองรับทั้ง logs, metrics, และ traces ใน platform เดียวกัน

✅ **Auto-provisioning** ทำให้ setup และ deployment ง่ายขึ้น

## References

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Documentation](https://grafana.com/docs/loki/latest/clients/promtail/)
- [LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
