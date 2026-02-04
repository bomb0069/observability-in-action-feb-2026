#!/bin/bash

# Wait for Kibana to be ready
echo "Waiting for Kibana to be ready..."
until curl -s http://kibana:5601/api/status | grep -q '"level":"available"'; do
  echo "Kibana is not ready yet. Waiting..."
  sleep 5
done

echo "Kibana is ready! Waiting additional 10 seconds for stability..."
sleep 10

# Wait for Elasticsearch indices to have data
echo "Waiting for data in Elasticsearch indices..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  FLOG_COUNT=$(curl -s "http://elasticsearch:9200/flog-logs-*/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  FLOG2_COUNT=$(curl -s "http://elasticsearch:9200/flog2-logs-*/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  
  if [ ! -z "$FLOG_COUNT" ] && [ "$FLOG_COUNT" -gt 0 ] && [ ! -z "$FLOG2_COUNT" ] && [ "$FLOG2_COUNT" -gt 0 ]; then
    echo "✓ Data found in both indices (flog: $FLOG_COUNT, flog2: $FLOG2_COUNT)"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for data... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

# Create index pattern for flog-logs-*
echo "Creating index pattern: flog-logs-*"
curl -X POST "http://kibana:5601/api/saved_objects/index-pattern/flog-logs-star" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "flog-logs-*",
      "timeFieldName": "@timestamp"
    }
  }' -s | grep -o '"id":"flog-logs-star"' && echo " ✓ Index pattern created" || echo " ⚠ Index pattern may already exist"

# Create index pattern for flog2-logs-*
echo "Creating index pattern: flog2-logs-*"
curl -X POST "http://kibana:5601/api/saved_objects/index-pattern/flog2-logs-star" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "flog2-logs-*",
      "timeFieldName": "@timestamp"
    }
  }' -s | grep -o '"id":"flog2-logs-star"' && echo " ✓ Index pattern created" || echo " ⚠ Index pattern may already exist"

# Set default index pattern
echo "Setting flog-logs-* as default index pattern..."
curl -X POST "http://kibana:5601/api/kibana/settings" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "changes": {
      "defaultIndex": "flog-logs-star"
    }
  }' -s > /dev/null

echo ""

# Import saved objects
echo "Importing Kibana saved objects..."
response=$(curl -X POST "http://kibana:5601/api/saved_objects/_import?overwrite=true" \
  -H "kbn-xsrf: true" \
  --form file=@/usr/share/kibana/config/saved_objects.ndjson \
  -w "\n%{http_code}" -s)

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "✓ Successfully imported saved objects!"
  echo "$response_body" | grep -o '"success":true'
else
  echo "✗ Failed to import saved objects. HTTP Status: $http_code"
  echo "Response: $response_body"
  exit 1
fi

echo ""
echo "======================================"
echo "Setup complete!"
echo "Index patterns created:"
echo "  - flog-logs-* (Apache logs)"
echo "  - flog2-logs-* (JSON logs)"
echo ""
echo "Dashboard ready:"
echo "  - Apache Logs Overview"
echo ""
echo "Open Kibana: http://localhost:5601"
echo "======================================"
