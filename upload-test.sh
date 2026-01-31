#!/bin/bash

# Simple upload test script
# Usage: ./upload-test.sh /path/to/video.mp4

if [ -z "$1" ]; then
  echo "❌ Error: Please provide a video file path"
  echo ""
  echo "Usage:"
  echo "  ./upload-test.sh /path/to/your/video.mp4"
  echo ""
  echo "Examples:"
  echo "  ./upload-test.sh ~/Downloads/video.mp4"
  echo "  ./upload-test.sh ./test-video.mp4"
  exit 1
fi

VIDEO_PATH="$1"

if [ ! -f "$VIDEO_PATH" ]; then
  echo "❌ Error: File not found: $VIDEO_PATH"
  exit 1
fi

echo "📤 Uploading video: $VIDEO_PATH"
echo "🌐 Endpoint: http://localhost:3000/api/annotate"
echo ""
echo "⏳ Processing... (this may take a while)"
echo ""

# Upload and show response
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/annotate" \
  -F "video=@$VIDEO_PATH")

# Check if jq is available for pretty printing
if command -v jq &> /dev/null; then
  echo "$RESPONSE" | jq .
else
  echo "$RESPONSE"
  echo ""
  echo "💡 Tip: Install 'jq' for pretty JSON output: brew install jq"
fi
