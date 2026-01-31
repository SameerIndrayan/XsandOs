# XsandOs Backend

Backend service for video annotation using Gemini Vision API. Accepts football video uploads, extracts sampled frames, and returns JSON annotations with player positions and educational annotations.

## Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **ffmpeg** - Required for video processing
  ```bash
  # macOS (Homebrew)
  brew install ffmpeg
  
  # Verify installation
  ffmpeg -version
  ```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   - `GEMINI_API_KEY` - Your Google Gemini API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))
   - `MOCK_MODE=1` - Set to 1 to bypass Gemini API and use mock data (useful for frontend integration)

3. **Build the project:**
   ```bash
   npm run build
   ```

## Running

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

### POST /api/annotate

Upload a video file for annotation.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `video` (file): Video file to process
  - Query params (optional):
    - `intervalSec`: Frame extraction interval in seconds (default: 0.5)
    - `promptContext`: Additional context string for Gemini analysis

**Response:**
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
        },
        {
          "type": "textbox",
          "x": 200,
          "y": 100,
          "term": "Route",
          "definition": "Receiver running pattern"
        },
        {
          "type": "circle",
          "x": 400,
          "y": 300,
          "r": 50,
          "label": "Zone"
        }
      ]
    }
  ]
}
```

## Example Usage

### Using curl:

```bash
curl -X POST http://localhost:3000/api/annotate \
  -F "video=@path/to/your/video.mp4" \
  -F "intervalSec=0.5" \
  -F "promptContext=Analyze this football play"
```

### Using JavaScript (fetch):

```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('intervalSec', '0.5');

const response = await fetch('http://localhost:3000/api/annotate', {
  method: 'POST',
  body: formData,
});

const annotations = await response.json();
console.log(annotations);
```

## Mock Mode

Set `MOCK_MODE=1` in your `.env` file to bypass Gemini API calls. The service will return deterministic mock annotations, useful for:
- Frontend development without API costs
- Testing the API contract
- Development when API keys aren't available

## Project Structure

```
src/
  ├── server.ts          # Server entry point
  ├── app.ts             # Express app setup
  ├── routes/
  │   └── annotate.ts    # Annotation endpoint handler
  ├── services/
  │   ├── ffmpeg.ts      # Frame extraction service
  │   ├── gemini.ts      # Gemini Vision API integration
  │   └── format.ts      # Response formatting and validation
  ├── schema/
  │   └── annotation.ts  # Zod schemas and TypeScript types
  └── utils/
      └── fs.ts          # File system utilities
```

## Configuration

Environment variables (see `.env.example`):

- `PORT` - Server port (default: 3000)
- `GEMINI_API_KEY` - Google Gemini API key (required unless MOCK_MODE=1)
- `GEMINI_MODEL` - Gemini model to use (default: gemini-1.5-pro-vision-latest)
- `MOCK_MODE` - Set to 1 to use mock data (default: 0)
- `FRAME_INTERVAL_SEC` - Seconds between extracted frames (default: 0.5)
- `MAX_FILE_SIZE_MB` - Maximum upload size in MB (default: 500)
- `UPLOAD_DIR` - Directory for uploaded videos (default: ./tmp/uploads)
- `FRAME_OUTPUT_DIR` - Directory for extracted frames (default: ./tmp/frames)

## Testing

Run the smoke test:
```bash
npm test
```

This tests that the server is running and responds to basic requests.

## Error Handling

The API returns structured error responses:

```json
{
  "error": "Processing failed",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing file, invalid format)
- `500` - Server error (processing failure)

## Notes

- Temporary files are automatically cleaned up after processing
- Large video files may take time to process
- Frame extraction uses high-quality JPEG encoding
- The service processes frames sequentially to avoid rate limits
- All responses are validated against Zod schemas before returning

## License

MIT
