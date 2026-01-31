#!/bin/bash

# Test script for VisionAgents integration

VIDEO_FILE="./videos/football-clip.mp4"
OUTPUT_FILE="./test-visionagents-output.json"

if [ ! -f "$VIDEO_FILE" ]; then
  echo "❌ Video file not found: $VIDEO_FILE"
  exit 1
fi

echo "🧪 Testing VisionAgents Integration"
echo "=================================="
echo ""
echo "📤 Uploading: $VIDEO_FILE"
echo "⏳ This will take 1-2 minutes..."
echo ""
echo "💡 Tip: Open another terminal and run 'tail -f server.log' to see progress"
echo ""

# Make the request
curl -X POST http://localhost:3000/api/analyze \
  -F "video=@$VIDEO_FILE" \
  -o "$OUTPUT_FILE" \
  -w "\n\n⏱️  Total time: %{time_total}s\n"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Analysis complete!"
  echo ""
  echo "📊 Results Summary:"
  
  if command -v jq &> /dev/null; then
    echo ""
    jq '{
      video_duration,
      video_url,
      play_summary,
      total_frames: (.frames | length),
      frames_with_players: ([.frames[] | select(.players | length > 0)] | length),
      first_frame_players: .frames[0].players | length,
      sample_frame: .frames[0]
    }' "$OUTPUT_FILE"
    
    echo ""
    echo "📄 Full response saved to: $OUTPUT_FILE"
    echo "💡 View full response: cat $OUTPUT_FILE | jq ."
  else
    echo "   Full response saved to: $OUTPUT_FILE"
    echo "   Install jq for pretty formatting: brew install jq"
  fi
else
  echo "❌ Request failed"
  exit 1
fi
