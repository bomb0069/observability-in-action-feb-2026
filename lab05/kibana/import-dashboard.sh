#!/bin/bash

# Wait for Kibana to be ready
echo "Waiting for Kibana to be ready..."
until curl -s http://kibana:5601/api/status | grep -q '"level":"available"'; do
  echo "Kibana is not ready yet. Waiting..."
  sleep 5
done

echo "Kibana is ready! Waiting additional 10 seconds for stability..."
sleep 10

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
echo "Dashboard is ready!"
echo "Open: http://localhost:5601/app/dashboards"
echo "Dashboard: Apache Logs Overview"
echo "======================================"
