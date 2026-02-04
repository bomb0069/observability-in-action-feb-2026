# Log03 - ELK Stack with Filebeat and Flog

Lab สำหรับทดสอบการเก็บ log จาก application ผ่าน Filebeat, Logstash ไปยัง Elasticsearch และแสดงผลที่ Kibana

## Architecture

```
Flog (Fake Log Generator)
  → Logs to file
    → Filebeat (reads file)
      → Logstash (processes logs)
        → Elasticsearch (stores logs)
          → Kibana (visualizes logs)
```

## Components

- **Flog**: Fake log generator ที่สร้าง Apache combined format logs
- **Filebeat**: Log shipper ที่อ่าน log files และส่งไปยัง Logstash
- **Logstash**: Log processor ที่ parse และ transform logs
- **Elasticsearch**: Search and analytics engine สำหรับเก็บ logs
- **Kibana**: Visualization platform สำหรับดู logs

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

3. View logs:

```bash
# Flog logs
docker-compose logs -f flog

# Filebeat logs
docker-compose logs -f filebeat

# Logstash logs
docker-compose logs -f logstash
```

4. Access Kibana:

- URL: http://localhost:5601
- Wait 2-3 minutes for all services to be ready

## Configure Kibana

1. Open Kibana at http://localhost:5601

2. Create Index Pattern:
   - Go to: Management → Stack Management → Index Patterns
   - Click "Create index pattern"
   - Index pattern name: `flog-logs-*`
   - Time field: `@timestamp`
   - Click "Create index pattern"

3. View Logs:
   - Go to: Analytics → Discover
   - Select the `flog-logs-*` index pattern
   - You should see logs flowing in

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

## Customization

### Change Flog Output Format

Edit `docker-compose.yml` flog service command:

```yaml
command: -f apache_combined -l -d 1 -s 1
```

Parameters:

- `-f`: format (apache_combined, apache_common, json, rfc3164, rfc5424)
- `-l`: loop mode
- `-d`: delay between logs (seconds)
- `-s`: log rate per second

### Modify Logstash Pipeline

Edit `logstash/pipeline/logstash.conf` to add more filters or change output.

### Adjust Filebeat Configuration

Edit `filebeat/filebeat.yml` to monitor different files or add processors.

## Troubleshooting

### Services not starting

Check logs:

```bash
docker-compose logs
```

### No data in Kibana

1. Verify Elasticsearch is running:

```bash
curl http://localhost:9200
```

2. Check if indices exist:

```bash
curl http://localhost:9200/_cat/indices
```

3. Verify Logstash is receiving data:

```bash
docker-compose logs logstash | grep "Pipeline running"
```

4. Check Filebeat is shipping logs:

```bash
docker-compose logs filebeat
```

### Reset Everything

```bash
# Stop all services
docker-compose down -v

# Remove log files
rm -rf logs/*.log

# Start again
docker-compose up -d
```

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

## Next Steps

1. Add custom log parsing in Logstash
2. Create visualizations in Kibana
3. Set up alerting rules
4. Add more log sources
5. Implement log retention policies
