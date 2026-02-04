# Log04 - Kibana Visualizations for Apache Combined Logs

Lab สำหรับสร้าง visualizations และ dashboards บน Kibana เพื่อวิเคราะห์ Apache combined format logs

## Architecture

```
Flog (Fake Log Generator)
  → Logs to file
    → Filebeat (reads file)
      → Logstash (processes logs with grok, geoip, useragent)
        → Elasticsearch (stores logs)
          → Kibana (visualizes and analyzes logs)
```

## Components

- **Flog**: Fake log generator ที่สร้าง Apache combined format logs
- **Filebeat**: Log shipper ที่อ่าน log files และส่งไปยัง Logstash
- **Logstash**: Log processor ที่ parse logs ด้วย grok patterns และเพิ่ม GeoIP, User Agent data
- **Elasticsearch**: Search and analytics engine สำหรับเก็บ logs
- **Kibana**: Visualization platform สำหรับสร้าง charts, graphs และ dashboards

## Lab Objectives

1. สร้าง Index Pattern สำหรับ Apache logs
2. Explore logs ใน Discover view
3. สร้าง Visualizations ที่เหมาะสมกับ Apache combined logs:
   - HTTP status code distribution (Pie chart)
   - Top requesting IPs (Bar chart)
   - Traffic over time (Line chart)
   - Geographic distribution (Map)
   - Top URLs/endpoints (Table)
   - Browser/User agent distribution
   - Response size analysis
4. สร้าง Dashboard รวม visualizations ทั้งหมด
5. ตั้งค่า auto-refresh สำหรับ real-time monitoring

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
# Watch flog generating logs
docker-compose logs -f flog

# Watch filebeat shipping logs
docker-compose logs -f filebeat
```

4. Access Kibana:

- URL: http://localhost:5601
- Wait 2-3 minutes for all services to be ready
- Follow the configuration steps below to set up dashboard

## Configure Kibana Dashboard

### Step 1: Create Index Pattern

1. Open Kibana at http://localhost:5601
2. Go to: **Management → Stack Management → Index Patterns**
3. Click **"Create index pattern"**
4. Index pattern name: `flog-logs-*`
5. Time field: `@timestamp`
6. Click **"Create index pattern"**

### Step 2: Import Pre-built Dashboard (Recommended)

มี dashboard พร้อมใช้งานที่สร้างไว้แล้ว:

1. Go to: **Management → Stack Management → Saved Objects**
2. Click **"Import"**
3. Select file: `kibana/saved_objects.ndjson`
4. Click **"Import"**
5. Go to: **Analytics → Dashboard**
6. Open **"Apache Logs Overview"** dashboard

Dashboard จะมี visualizations ทั้งหมด 7 ชิ้น:

- HTTP Status Codes (Pie chart)
- Top 10 IPs (Bar chart)
- Traffic Over Time (Line chart)
- Top URLs (Table)
- Browser Distribution (Donut chart)
- Average Response Size (Area chart)
- HTTP Methods (Horizontal bar)

### Step 3: Manual Configuration (Alternative)

If you want to create additional visualizations or customize existing ones:

### Explore Index Pattern

1. Open Kibana at http://localhost:5601
2. Go to: **Management → Stack Management → Index Patterns**
3. Select `flog-logs-*` to view all available fields

### Explore Data in Discover

1. Go to: **Analytics → Discover**
2. Select the `flog-logs-*` index pattern
3. Explore the parsed fields:
   - `clientip`: Source IP address
   - `response`: HTTP status code
   - `bytes`: Response size
   - `request`: HTTP request method and path
   - `geoip.*`: Geographic information
   - `user_agent.*`: Browser and OS information

### Customize Existing Visualizations

1. Go to: **Analytics → Visualize Library**
2. Click on any visualization to edit
3. Modify aggregations, buckets, or styling
4. Save changes

### Create New Visualizations

For creating additional custom visualizations:

1. Go to: **Analytics → Visualize Library → Create visualization**
2. Choose visualization type (Pie, Bar, Line, Table, Map, etc.)
3. Select `flog-logs-*` index pattern
4. Configure metrics and buckets based on your needs
5. Examples of useful visualizations:
   - Error rate over time: Filter `response >= 400` + Date histogram
   - Geographic heat map: Use `geoip.location` field with Map visualization
   - Request path analysis: Terms aggregation on `request.keyword`
   - Response time percentiles: Use percentile aggregation on `bytes`

## Understanding the Pre-built Dashboard

The **"Apache Logs Overview"** dashboard includes:

### 1. HTTP Status Codes (Pie Chart)

- Shows distribution of HTTP response codes (200, 404, 500, etc.)
- Helps identify error rates at a glance

### 2. Top 10 IPs (Bar Chart)

- Displays most active IP addresses
- Useful for identifying heavy users or potential attackers

### 3. Traffic Over Time (Line Chart)

- Shows request volume trends
- Auto-updates every 10 seconds for real-time monitoring

### 4. Top URLs (Data Table)

- Lists most requested endpoints
- Includes average response size per URL

### 5. Browser Distribution (Donut Chart)

- Visualizes user agent distribution
- Shows which browsers/clients are accessing your service

### 6. Average Response Size (Area Chart)

- Tracks average response size over time
- Helps identify bandwidth usage patterns

### 7. HTTP Methods (Horizontal Bar)

- Shows distribution of HTTP methods (GET, POST, etc.)
- Useful for understanding API usage patterns

## Dashboard Features

- **Auto-refresh**: Updates every 10 seconds automatically
- **Time range**: Default shows last 15 minutes
- **Interactive**: Click on any visualization to filter the entire dashboard
- **Exportable**: Can export dashboard and visualizations for backup

## View Logs in Discover

1. Go to: **Analytics → Discover**
2. Select the `flog-logs-*` index pattern
3. Add useful columns:
   - `@timestamp`
   - `clientip`
   - `response`
   - `request`
   - `bytes`
   - `geoip.country_name`
   - `user_agent.name`

## Verify Data Flow

1. Check Elasticsearch indices:

```bash
curl http://localhost:9200/_cat/indices?v
```

2. Query logs directly:

```bash
curl http://localhost:9200/flog-logs-*/_search?pretty
```

3. Check Flog is generating logs:

```bash
ls -lh logs/
tail -f logs/*.log
```

## Advanced Visualization Tips

### Creating Filters

1. In Dashboard, click **"Add filter"**
2. Create filters for:
   - Error responses: `response >= 400`
   - Specific countries: `geoip.country_name is "United States"`
   - Time ranges: Use time picker

### Using Lens (Modern Visualization)

1. Go to: **Analytics → Visualize Library**
2. Click **"Create visualization"** → **"Lens"**
3. Drag and drop fields to create visualizations quickly
4. Lens provides suggestions based on field types

### Metric Visualizations

Create single metric displays for:

- Total requests count
- Average response time
- Error rate percentage
- Unique visitor count

### TSVB (Time Series Visual Builder)

For advanced time series:

1. Create visualization → **"TSVB"**
2. Multiple series on same chart
3. Annotations and thresholds
4. Math expressions

## Useful Kibana Query Language (KQL) Examples

```
# Find all errors (4xx and 5xx)
response >= 400

# Specific HTTP method
verb: "GET"

# Exclude certain IPs
NOT clientip: "192.168.1.1"

# Large responses
bytes > 50000

# Combine conditions
response >= 500 AND geoip.country_name: "Thailand"
```

## Customization Ideas

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
2. Verify logs are being generated:

```bash
docker-compose logs flog | tail
ls -lh logs/
```

3. Wait a few minutes for logs to flow through the pipeline
4. Check data exists in Discover first

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
