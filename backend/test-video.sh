#!/bin/bash

# Test video upload and save output to file

VIDEO_FILE="./videos/football-clip.mp4"
OUTPUT_FILE="./test-output.json"

if [ ! -f "$VIDEO_FILE" ]; then
  echo "❌ Video file not found: $VIDEO_FILE"
  exit 1
fi

echo "📤 Uploading $VIDEO_FILE..."
echo "⏳ Processing (this may take 1-2 minutes for 43 frames)..."
echo ""

# Upload and save to file
curl -s -X POST "http://localhost:3000/api/annotate" \
  -F "video=@$VIDEO_FILE" > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Response saved to: $OUTPUT_FILE"
  echo ""
  echo "📊 Summary:"
  
  # Show summary using jq if available
  if command -v jq &> /dev/null; then
    echo ""
    echo "Video Metadata:"
    jq '.videoMeta' "$OUTPUT_FILE"
    echo ""
    echo "Total Frames: $(jq '.frames | length' "$OUTPUT_FILE")"
    echo ""
    echo "First Frame Sample:"
    jq '.frames[0]' "$OUTPUT_FILE"
    echo ""
    echo "💡 View full output: cat $OUTPUT_FILE | jq ."
    echo "💡 View in terminal: cat $OUTPUT_FILE"
  else
    echo "   Full response saved to: $OUTPUT_FILE"
    echo "   Install jq for pretty formatting: brew install jq"
    echo ""
    echo "First 500 characters:"
    head -c 500 "$OUTPUT_FILE"
    echo "..."
  fi
else
  echo "❌ Upload failed"
  exit 1
fi
