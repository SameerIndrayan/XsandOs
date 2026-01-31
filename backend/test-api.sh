#!/bin/bash

# Quick API test script
# Tests the /api/annotate endpoint with a sample request

BASE_URL="http://localhost:3000"

echo "🧪 Testing XsandOs Backend API"
echo "================================"
echo ""

# Test 1: Health check
echo "1️⃣  Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
  echo "   ✅ Health check passed"
  echo "   Response: $BODY"
else
  echo "   ❌ Health check failed (HTTP $HTTP_CODE)"
  echo "   Make sure the server is running: npm run dev"
  exit 1
fi

echo ""

# Test 2: Check if we can test /api/annotate
echo "2️⃣  Testing /api/annotate endpoint..."
echo "   Note: This requires a video file"
echo ""
echo "   To test with a video file, run:"
echo "   curl -X POST $BASE_URL/api/annotate -F 'video=@path/to/your/video.mp4'"
echo ""
echo "   Or use the test endpoint without a file to see error handling:"
NO_FILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/annotate")
NO_FILE_HTTP=$(echo "$NO_FILE_RESPONSE" | tail -n1)
NO_FILE_BODY=$(echo "$NO_FILE_RESPONSE" | head -n-1)

if [ "$NO_FILE_HTTP" == "400" ]; then
  echo "   ✅ Error handling works (expected 400 for missing file)"
  echo "   Response: $NO_FILE_BODY"
else
  echo "   ⚠️  Unexpected response (HTTP $NO_FILE_HTTP)"
  echo "   Response: $NO_FILE_BODY"
fi

echo ""
echo "✅ Basic API tests complete!"
echo ""
echo "💡 Tips:"
echo "   - Make sure MOCK_MODE=1 in .env to test without Gemini API key"
echo "   - The server should be running: npm run dev"
echo "   - Test with a real video: curl -X POST $BASE_URL/api/annotate -F 'video=@your-video.mp4'"
