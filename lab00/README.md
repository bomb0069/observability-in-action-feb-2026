# Lab00: Image Warm-Up

Use this helper lab to pre-pull every container image that appears in labs 03 through 13. Running a single pull up front keeps the later lab startup times short, especially on slow networks.

## Usage

```bash
docker compose pull
```

The command downloads these images:

- `mingrammer/flog`
- `docker.elastic.co/beats/filebeat:8.11.0`
- `docker.elastic.co/logstash/logstash:8.11.0`
- `docker.elastic.co/elasticsearch/elasticsearch:8.11.0`
- `docker.elastic.co/kibana/kibana:8.11.0`
- `curlimages/curl:latest`
- `grafana/promtail:2.9.3`
- `grafana/loki:2.9.3`
- `grafana/grafana:10.2.3`
- `prom/prometheus:latest`
- `postgres:16.3`
- `quay.io/prometheuscommunity/postgres-exporter:v0.15.0`
- `prom/node-exporter:v1.8.1`
- `grafana/k6:0.49.0`

Feel free to rerun the pull command whenever versions change or new labs add more images.
