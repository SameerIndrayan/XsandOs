# Testing Guide

Your backend is ready to test! Here's how to test it right now:

## ✅ Server Status

The server should be running on `http://localhost:3000`

## Quick Tests

### 1. Health Check
```bash
curl http://localhost:3000/health
```
**Expected:** `{"status":"ok","timestamp":"..."}`

### 2. Test Error Handling (No File)
```bash
curl -X POST http://localhost:3000/api/annotate
```
**Expected:** `{"error":"Missing video file",...}` (HTTP 400)

### 3. Test with a Real Video File

If you have a video file (MP4, MOV, AVI, etc.):

```bash
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@/path/to/your/video.mp4"
```

**Expected Response:**
```json
{
  "videoMeta": {
    "durationSec": 45.5,
    "fps": 30,
    "width": 1920,
    "height": 1080
  },
  "frames": [
    {
      "timestamp": 0.5,
      "players": [
        {
          "id": "player_1",
          "x": 150,
          "y": 200,
          "label": "QB",
          "highlight": true
        }
      ],
      "annotations": [
        {
          "type": "arrow",
          "from": [100, 150],
          "to": [300, 200]
        }
      ]
    }
  ]
}
```

### 4. Test with Custom Frame Interval

Extract frames every 1 second instead of 0.5:
```bash
curl -X POST 'http://localhost:3000/api/annotate?intervalSec=1.0' \
  -F "video=@/path/to/your/video.mp4"
```

### 5. Test with Prompt Context

Add context for Gemini analysis:
```bash
curl -X POST 'http://localhost:3000/api/annotate?promptContext=Analyze this football play' \
  -F "video=@/path/to/your/video.mp4"
```

## Mock Mode Testing

Since `MOCK_MODE=1` is enabled in your `.env`, the API will:
- ✅ Skip Gemini API calls (no API key needed)
- ✅ Return deterministic mock annotations
- ✅ Process videos and extract frames normally
- ✅ Perfect for testing the API contract

## Using a Test Video

If you don't have a football video, you can:

1. **Download a sample video:**
   ```bash
   # Example: Download a short test video
   curl -o test-video.mp4 "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"
   ```

2. **Use any video file you have** - the backend will process it

3. **Test with a very short video** (few seconds) for faster testing

## Testing with HTTPie (Alternative to curl)

If you have `httpie` installed:
```bash
http POST localhost:3000/api/annotate video@/path/to/video.mp4
```

## Testing with Postman

1. Create a new POST request to `http://localhost:3000/api/annotate`
2. Go to Body → form-data
3. Add key: `video` (type: File)
4. Select your video file
5. Send!

## Expected Behavior

- ✅ **With video file:** Returns full annotation response
- ✅ **Without file:** Returns 400 error with helpful message
- ✅ **Invalid file type:** Returns 400 error
- ✅ **Large files:** May take time, but will process (up to 500MB default)

## Troubleshooting

**Server not running?**
```bash
npm run dev
```

**Port already in use?**
Change `PORT=3001` in `.env`

**FFmpeg not found?**
```bash
brew install ffmpeg  # macOS
ffmpeg -version      # Verify
```

**Want to see logs?**
The server logs to console - check your terminal where `npm run dev` is running
