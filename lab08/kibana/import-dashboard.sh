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
echo "Waiting for data in Elasticsearch unified index..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  UNIFIED_COUNT=$(curl -s "http://elasticsearch:9200/unified-logs-*/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  
  if [ ! -z "$UNIFIED_COUNT" ] && [ "$UNIFIED_COUNT" -gt 0 ]; then
    echo "✓ Data found in unified index (docs: $UNIFIED_COUNT)"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for data... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

# Create unified index pattern for all logs
echo "Creating unified index pattern: unified-logs-*"
curl -X POST "http://kibana:5601/api/saved_objects/index-pattern/unified-logs-star" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "unified-logs-*",
      "timeFieldName": "@timestamp"
    }
  }' -s | grep -o '"id":"unified-logs-star"' && echo " ✓ Index pattern created" || echo " ⚠ Index pattern may already exist"

# Set default index pattern
echo "Setting unified-logs-* as default index pattern..."
curl -X POST "http://kibana:5601/api/kibana/settings" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "changes": {
      "defaultIndex": "unified-logs-star"
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
echo "Index pattern created:"
echo "  - unified-logs-* (All logs with app field)"
echo ""
echo "Dashboard ready:"
echo "  - Unified Multi-App Logs Dashboard"
echo ""
echo "Open Kibana: http://localhost:5601"
echo "======================================"
