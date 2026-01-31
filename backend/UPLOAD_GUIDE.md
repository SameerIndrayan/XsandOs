# How to Upload Videos to the Backend

## Endpoint
**POST** `http://localhost:3000/api/annotate`

## Upload Method

The backend accepts **multipart/form-data** uploads with the field name `"video"`.

---

## Option 1: Using curl (Command Line)

### Basic Upload
```bash
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@/path/to/your/video.mp4"
```

### With Custom Frame Interval
```bash
curl -X POST "http://localhost:3000/api/annotate?intervalSec=1.0" \
  -F "video=@/path/to/your/video.mp4"
```

### With Prompt Context
```bash
curl -X POST "http://localhost:3000/api/annotate?promptContext=Analyze this football play" \
  -F "video=@/path/to/your/video.mp4"
```

### Pretty Print JSON Response
```bash
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@/path/to/your/video.mp4" | jq .
```

**Example with actual file:**
```bash
# If your video is in Downloads folder
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@~/Downloads/my-football-video.mp4"

# If your video is in current directory
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@./test-video.mp4"
```

---

## Option 2: Using a Test Script

I'll create a simple upload script for you!

---

## Option 3: Using Postman

1. Open Postman
2. Create new POST request
3. URL: `http://localhost:3000/api/annotate`
4. Go to **Body** tab
5. Select **form-data**
6. Add key: `video` (change type from "Text" to **"File"**)
7. Click "Select Files" and choose your video
8. Click **Send**

---

## Option 4: Using JavaScript/Frontend

```javascript
const formData = new FormData();
formData.append('video', videoFile); // videoFile is a File object

const response = await fetch('http://localhost:3000/api/annotate', {
  method: 'POST',
  body: formData,
});

const annotations = await response.json();
console.log(annotations);
```

---

## Where to Put Your Video File

You can upload from **anywhere** on your computer! Just use the full path:

```bash
# From Downloads
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@~/Downloads/video.mp4"

# From Desktop
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@~/Desktop/video.mp4"

# From current directory
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@./video.mp4"

# Absolute path
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@/Users/sameerindrayan/Videos/football.mp4"
```

---

## Supported Video Formats

- `.mp4`
- `.mov`
- `.avi`
- `.mkv`
- `.webm`
- `.m4v`

---

## What Happens After Upload

1. ✅ Video is saved to `./tmp/uploads/` (temporary)
2. ✅ Frames are extracted to `./tmp/frames/` (temporary)
3. ✅ Each frame is analyzed by Gemini Vision API
4. ✅ Response is returned with annotations
5. ✅ Temporary files are cleaned up automatically

---

## Quick Test

**Don't have a video?** Let me help you test with a sample or create a test script!
