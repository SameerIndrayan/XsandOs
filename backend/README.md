# Football Annotation System - Backend

Node.js + TypeScript Express server for football video annotation with Gemini Vision API integration.

## Prerequisites

- **Node.js 20+**
- **npm** or **yarn**

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   - Set `MOCK_MODE=1` for deterministic mock output (default)
   - Set `MOCK_MODE=0` to attempt Gemini analysis (currently returns mock with error field)

3. **Build:**
   ```bash
   npm run build
   ```

## Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:3000` (or port specified in `.env`).

## API

### POST /api/analyze

Analyzes a football video and returns annotations with temporally consistent player IDs, both offense and defense.

**Supports two input methods:**

#### 1. File Upload (multipart/form-data)

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "video=@path/to/video.mp4"
```

#### 2. Video URL (JSON body)

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://example.com/video.mp4"}'
```

**Response:**
```json
{
  "video_duration": 12.5,
  "video_url": "http://localhost:3000/uploads/video_1234567890_abc123.mp4",
  "play_summary": "The offense runs a play-action pass with the quarterback rolling right. The wide receiver runs a deep post route while the cornerback maintains tight coverage.",
  "frames": [
    {
      "timestamp": 0,
      "players": [
        {
          "id": "qb1",
          "x": 25.5,
          "y": 35.2,
          "label": "QB",
          "highlight": true,
          "color": "#FFD700"
        },
        {
          "id": "wr1",
          "x": 60.3,
          "y": 50.1,
          "label": "WR",
          "highlight": true,
          "color": "#FFD700"
        },
        {
          "id": "cb1",
          "x": 65.0,
          "y": 48.0,
          "label": "CB",
          "highlight": false,
          "color": "#FFFFFF"
        }
      ],
      "arrows": [
        {
          "from": [25.5, 35.2],
          "to": [60.3, 50.1],
          "color": "#FF0000",
          "label": "Pass Route"
        }
      ],
      "terminology": [
        {
          "x": 50.0,
          "y": 10.0,
          "term": "Play-Action",
          "definition": "A fake handoff followed by a pass"
        }
      ]
    }
  ],
  "error": {
    "message": "VisionAgents not implemented",
    "details": { ... }
  }
}
```

**Note:** The `error` field is optional and only present when Gemini fails and falls back to mock output.

## Coordinate System

**All coordinates are percentage-based (0-100):**
- `x`: Horizontal position (0 = left edge, 100 = right edge)
- `y`: Vertical position (0 = top edge, 100 = bottom edge)

This ensures annotations work regardless of video resolution.

## Configuration

### Mock Mode

When `MOCK_MODE=1`:
- Returns deterministic mock annotations
- No API calls
- Fast response for testing

### VisionAgents Integration

When `VISIONAGENTS_ENABLED=1`:
- Extracts frames from uploaded video using FFmpeg
- Sends frames to VisionAgents API for analysis
- Returns temporally consistent annotations with both offense and defense
- Includes play summary (2-3 sentences)
- Falls back to mock output with error field if analysis fails

When `VISIONAGENTS_ENABLED=0`:
- Returns mock output with "not implemented" warning
- No API calls made

### Environment Variables

- `MOCK_MODE` - Set to `1` to use mock data (default: `1`)
- `VISIONAGENTS_ENABLED` - Set to `1` to enable VisionAgents analysis (default: `0`)
- `VISIONAGENTS_API_KEY` - Your VisionAgents API key
- `VISIONAGENTS_API_URL` - VisionAgents API endpoint (default: `https://api.visionagents.ai/v1/analyze`)
- `FRAME_INTERVAL_SEC` - Seconds between extracted frames (default: `0.5`)
- `UPLOAD_DIR` - Directory for uploaded videos (default: `./uploads`)

## Project Structure

```
src/
  ├── server.ts              # Entry point
  ├── app.ts                 # Express app setup
  ├── routes/
  │   └── analyze.ts         # POST /api/analyze handler
  ├── schema/
  │   └── contract.ts        # Zod schemas and TypeScript types
  ├── services/
  │   ├── mock.ts            # Mock annotation generator
  │   ├── video.ts           # Video duration extraction (stub)
  │   └── gemini.ts          # Gemini integration (stub)
  └── utils/
      ├── hex.ts             # Hex color utilities
      ├── percent.ts         # Percentage coordinate utilities
      └── fs.ts              # File system utilities
```

## Validation

All responses are validated with Zod schemas before returning. If validation fails, the server returns a 500 error with a clear message.

## Error Handling

- **400**: Missing video input (no file or video_url)
- **500**: Validation failure or internal error
- **Error field**: Included in response when Gemini fails (fallback to mock)

## Development

- Uses `ts-node-dev` for hot reload in development
- TypeScript strict mode enabled
- All coordinates validated to be 0-100 range
- Hex colors validated with regex

## License

MIT
