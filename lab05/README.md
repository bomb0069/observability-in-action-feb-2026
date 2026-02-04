# Lab05 - Multi-Application Log Collection and Visualization

Lab สำหรับทดสอบการเก็บ logs จาก multiple applications ที่มี format ต่างกัน และแสดงผลรวมกันบน Kibana

## Architecture

```
Flog (Apache Combined Format)
  → access.log (1 log/sec)
    ↓
Flog2 (JSON Format)                  → Filebeat (reads both files)
  → app.log (2 logs/sec)                → Logstash (processes different formats)
                                          → Elasticsearch (stores in separate indices)
                                            → Kibana (visualizes both sources)
```

## Components

- **Flog**: Fake log generator ที่สร้าง Apache combined format logs (1 log/second)
- **Flog2**: Fake log generator ที่สร้าง JSON format logs (2 logs/second) - มีปริมาณมากกว่า flog 2 เท่า
- **Filebeat**: Log shipper ที่อ่าน log files จาก 2 sources และส่งไปยัง Logstash
- **Logstash**: Log processor ที่ parse logs ตาม format ที่ต่างกัน
  - Apache logs: ใช้ grok patterns พร้อม GeoIP และ User Agent parsing
  - JSON logs: parse โดย Filebeat แล้วส่งต่อไปยัง Elasticsearch
- **Elasticsearch**: Search and analytics engine สำหรับเก็บ logs ใน 2 indices:
  - `flog-logs-*`: Apache combined format logs
  - `flog2-logs-*`: JSON format logs
- **Kibana**: Visualization platform สำหรับสร้าง charts, graphs และ dashboards

## Lab Objectives

1. เรียนรู้การ collect logs จาก multiple applications พร้อมกัน
2. เข้าใจการแยก log formats ที่แตกต่างกัน (Apache vs JSON)
3. ใช้ Filebeat ในการอ่าน multiple log files และ tag แต่ละ source
4. ใช้ Logstash ในการ process logs แยกตาม format
5. จัดเก็บ logs ใน separate Elasticsearch indices ตาม application
6. สร้าง visualizations และ dashboards สำหรับเปรียบเทียบ logs จาก 2 sources
7. วิเคราะห์ปริมาณ logs ที่แตกต่างกัน (flog2 มีปริมาณมากกว่า flog 2 เท่า)

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

3. View logs to monitor data flow:

```bash
# Watch flog generating Apache logs (1 log/sec)
docker-compose logs -f flog

# Watch flog2 generating JSON logs (2 logs/sec)
docker-compose logs -f flog2

# Watch filebeat shipping logs from both sources
docker-compose logs -f filebeat

# Watch logstash processing logs
docker-compose logs -f logstash
```

4. Access Kibana:

- URL: http://localhost:5601
- Wait 2-3 minutes for all services to be ready
- The pre-built dashboard will be automatically imported

## Verify Data Collection

### Check Elasticsearch Indices

```bash
# Check flog indices (Apache logs)
curl -s "http://localhost:9200/_cat/indices/flog-logs-*?v"

# Check flog2 indices (JSON logs)
curl -s "http://localhost:9200/_cat/indices/flog2-logs-*?v"

# Count documents in each index
curl -s "http://localhost:9200/flog-logs-*/_count" | jq
curl -s "http://localhost:9200/flog2-logs-*/_count" | jq
```

### Expected Results

- **flog-logs-\***: ~60 documents per minute (1 log/second)
- **flog2-logs-\***: ~120 documents per minute (2 logs/second)

After 5 minutes:

- flog-logs: ~300 documents
- flog2-logs: ~600 documents (2x more than flog)

### Sample Data Comparison

Apache log (flog):

```
244.165.230.81 - - [05/Feb/2026:10:15:30 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0..."
```

JSON log (flog2):

```json
{
  "host": "244.165.230.81",
  "user-identifier": "-",
  "datetime": "05/Feb/2026:10:15:30 +0000",
  "method": "GET",
  "request": "/api/products",
  "protocol": "HTTP/1.1",
  "status": 200,
  "size": 5678,
  "referer": "-",
  "user-agent": "Mozilla/5.0..."
}
```

## Configure Kibana Dashboard

### Step 1: Create Index Patterns

1. Open Kibana at http://localhost:5601
2. Go to: **Management → Stack Management → Index Patterns**

**For Apache Logs (flog):** 3. Click **"Create index pattern"** 4. Index pattern name: `flog-logs-*` 5. Time field: `@timestamp` 6. Click **"Create index pattern"**

**For JSON Logs (flog2):** 7. Click **"Create index pattern"** again 8. Index pattern name: `flog2-logs-*` 9. Time field: `@timestamp` 10. Click **"Create index pattern"**

### Step 2: Pre-built Dashboard (Auto-imported)

Dashboard สำหรับ Apache logs จะถูก import อัตโนมัติเมื่อเริ่ม services:

1. Go to: **Analytics → Dashboard**
2. Open **"Apache Logs Overview"** dashboard

Dashboard จะมี visualizations สำหรับ flog (Apache logs):

- HTTP Status Codes (Pie chart)
- Top 10 IPs (Bar chart)
- Traffic Over Time (Line chart)
- Top URLs (Table)
- Browser Distribution (Donut chart)
- Average Response Size (Area chart)
- HTTP Methods (Horizontal bar)

### Step 3: Explore Both Data Sources

**Explore flog (Apache logs):**

1. Go to: **Analytics → Discover**
2. Select `flog-logs-*` index pattern
3. Available fields:
   - `http.response.status_code`: HTTP status codes
   - `source.address`: Client IP addresses
   - `http.request.method`: HTTP methods (GET, POST, etc.)
   - `url.original`: Request URLs
   - `http.response.body.bytes`: Response sizes
   - `user_agent.original`: User agent strings
   - `geoip.*`: Geographic information

**Explore flog2 (JSON logs):**

1. Go to: **Analytics → Discover**
2. Select `flog2-logs-*` index pattern
3. Available fields (already parsed by Filebeat):
   - `host`: Source IP
   - `method`: HTTP method
   - `request`: Request path
   - `protocol`: HTTP protocol version
   - `status`: HTTP status code
   - `size`: Response size
   - `user-agent`: User agent string
   - `log_type`: "json"
   - `app`: "flog2"

### Step 4: Create Visualizations for Comparing Both Sources

**Compare Log Volume:**

1. Go to: **Analytics → Visualize Library → Create visualization**
2. Choose **"Line"** chart
3. Add data series:
   - **Series 1**: Select `flog-logs-*`, Metric: Count, Bucket: Date Histogram on `@timestamp`
   - **Series 2**: Select `flog2-logs-*`, Metric: Count, Bucket: Date Histogram on `@timestamp`
4. Title: "Log Volume Comparison (flog vs flog2)"
5. Save visualization

Expected result: flog2 line should show ~2x volume compared to flog

**Compare HTTP Status Distribution:**

1. Create two separate Pie charts:
   - **Chart 1**: Index pattern `flog-logs-*`, Bucket: Terms on `http.response.status_code`
   - **Chart 2**: Index pattern `flog2-logs-*`, Bucket: Terms on `status`
2. Add both to a new dashboard for side-by-side comparison

### Step 5: Create Multi-Source Dashboard

1. Go to: **Analytics → Dashboard → Create dashboard**
2. Title: "Multi-App Log Monitoring"
3. Add visualizations:
   - Log Volume Comparison (both sources)
   - HTTP Status Codes - flog (Apache logs)
   - HTTP Status Codes - flog2 (JSON logs)
   - Traffic timeline for each source
4. Set auto-refresh: 10 seconds
5. Save dashboard

## Understanding the Data

### Apache Logs (flog) - Structured Format

**Raw log:**

```
244.165.230.81 - - [05/Feb/2026:10:15:30 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0..."
```

**After Logstash processing:**

- Parsed with grok pattern
- Enhanced with GeoIP data (location, country, city)
- User agent parsed (browser, OS, device)
- Stored in ECS format: `http.response.status_code`, `source.address`, etc.

### JSON Logs (flog2) - Semi-Structured Format

**Raw log:**

```json
{
  "host": "244.165.230.81",
  "user-identifier": "-",
  "datetime": "05/Feb/2026:10:15:30 +0000",
  "method": "GET",
  "request": "/api/products",
  "protocol": "HTTP/1.1",
  "status": 200,
  "size": 5678,
  "referer": "-",
  "user-agent": "Mozilla/5.0..."
}
```

**After Filebeat processing:**

- Already in JSON format, parsed automatically
- Fields available as-is: `host`, `method`, `request`, `status`, `size`
- No additional enrichment (no GeoIP, no user agent parsing)
- Tagged with `app: flog2` and `log_type: json`

## Key Differences Between Two Sources

| Aspect          | flog (Apache)                 | flog2 (JSON)                                |
| --------------- | ----------------------------- | ------------------------------------------- |
| **Format**      | Apache Combined Log           | JSON                                        |
| **Log Rate**    | 1 log/second                  | 2 logs/second                               |
| **File**        | `/logs/access.log`            | `/logs/app.log`                             |
| **Processing**  | Logstash grok parsing         | Filebeat JSON parsing                       |
| **Enrichment**  | GeoIP + User Agent            | None                                        |
| **Index**       | `flog-logs-*`                 | `flog2-logs-*`                              |
| **Field Names** | ECS format (http._, source._) | Original JSON fields (host, method, status) |

## Verify Data Flow

### Check Both Applications Are Generating Logs

```bash
# Check log files
ls -lh logs/

# Watch Apache logs (flog)
tail -f logs/access.log

# Watch JSON logs (flog2)
tail -f logs/app.log
```

### Check Elasticsearch Indices

```bash
# List all indices
curl http://localhost:9200/_cat/indices?v

# Count documents in each index
curl -s "http://localhost:9200/flog-logs-*/_count" | jq
curl -s "http://localhost:9200/flog2-logs-*/_count" | jq
```

### Query Sample Documents

```bash
# Get sample from flog (Apache)
curl -s "http://localhost:9200/flog-logs-*/_search?size=1&pretty"

# Get sample from flog2 (JSON)
curl -s "http://localhost:9200/flog2-logs-*/_search?size=1&pretty"
```

## Advanced Usage

### Monitor Log Rate Difference

After running for 5 minutes:

```bash
# Get counts
FLOG_COUNT=$(curl -s "http://localhost:9200/flog-logs-*/_count" | jq .count)
FLOG2_COUNT=$(curl -s "http://localhost:9200/flog2-logs-*/_count" | jq .count)

echo "flog logs: $FLOG_COUNT"
echo "flog2 logs: $FLOG2_COUNT"
echo "flog2/flog ratio: $(echo "scale=2; $FLOG2_COUNT / $FLOG_COUNT" | bc)"
```

Expected ratio: ~2.0 (flog2 produces 2x more logs)

## Useful Kibana Query Language (KQL) Examples

### For flog (Apache logs) - using ECS fields:

```
# Find all errors (4xx and 5xx)
http.response.status_code >= 400

# Specific HTTP method
http.request.method: "GET"

# Exclude certain IPs
NOT source.address: "192.168.1.1"

# Large responses
http.response.body.bytes > 50000

# Combine conditions
http.response.status_code >= 500 AND geoip.country_name: "Thailand"
```

### For flog2 (JSON logs) - using original field names:

```
# Find all errors
status >= 400

# Specific HTTP method
method: "GET"

# Exclude certain hosts
NOT host: "192.168.1.1"

# Large responses
size > 50000

# Combine conditions
status >= 500 AND app: "flog2"
```

## Troubleshooting

### Dashboard not showing up

1. Check if kibana-setup completed successfully:

```bash
docker-compose logs kibana-setup
```

2. If import failed, retry manually:

```bash
docker-compose restart kibana-setup
```

3. Or import manually via Kibana UI:
   - Go to **Management → Stack Management → Saved Objects**
   - Click **"Import"**
   - Select `kibana/saved_objects.ndjson`

### No visualizations showing data

1. Check time range in top-right corner (default is last 15 minutes)
2. Verify both applications are generating logs:

```bash
docker-compose logs flog | tail
docker-compose logs flog2 | tail
ls -lh logs/
tail -f logs/access.log
tail -f logs/app.log
```

3. Wait a few minutes for logs to flow through the pipeline
4. Check data exists in Discover for both index patterns

### flog2 logs not appearing

1. Check if flog2 container is running:

```bash
docker-compose ps flog2
```

2. Verify JSON logs are being created:

```bash
cat logs/app.log
```

3. Check Filebeat is reading both files:

```bash
docker-compose logs filebeat | grep -E "(access.log|app.log)"
```

4. Verify data in Elasticsearch:

```bash
curl -s "http://localhost:9200/flog2-logs-*/_count" | jq
```

### Field not available for visualization

1. Go to **Management → Index Patterns → flog-logs-\***
2. Click **"Refresh field list"**
3. Verify the field exists in the list
4. Check if Logstash is parsing logs correctly:

```bash
docker-compose logs logstash | grep -i error
```

### Services not starting properly

1. Check all services are running:

```bash
docker-compose ps
```

2. View logs for specific service:

```bash
docker-compose logs elasticsearch
docker-compose logs kibana
docker-compose logs logstash
```

3. Restart services if needed:

```bash
docker-compose restart
```

## Exporting and Backing Up

### Export Dashboard

1. Go to **Management → Stack Management → Saved Objects**
2. Select objects to export (dashboard + visualizations)
3. Click **"Export"**
4. Save the NDJSON file as backup

### Re-import Dashboard

1. Go to **Management → Stack Management → Saved Objects**
2. Click **"Import"**
3. Select your NDJSON file
4. Handle conflicts (overwrite or skip)

## Learning Resources

### Kibana Documentation

- [Kibana Guide](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Lens](https://www.elastic.co/guide/en/kibana/current/lens.html)
- [Dashboard](https://www.elastic.co/guide/en/kibana/current/dashboard.html)

### Visualization Best Practices

- Use appropriate chart types for your data
- Keep dashboards focused and uncluttered
- Use consistent colors across visualizations
- Add filters for interactivity
- Set meaningful titles and labels

## Stop Services

```bash
# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

## Ports Used

- 5601: Kibana
- 9200: Elasticsearch HTTP
- 9300: Elasticsearch TCP
- 5044: Logstash Beats input
- 9600: Logstash monitoring

## Summary

This lab demonstrates:

- ✅ Setting up complete ELK stack
- ✅ Parsing Apache combined logs with Logstash
- ✅ Creating various visualization types in Kibana
- ✅ Building interactive dashboards
- ✅ Real-time log monitoring
- ✅ Geographic analysis with GeoIP
- ✅ User agent analysis
- ✅ Traffic pattern analysis

## Next Steps

1. Export dashboard and visualizations
2. Create alerts based on log patterns
3. Implement log retention policies
4. Add more data sources
5. Create custom Logstash filters
6. Explore Machine Learning features in Kibana
