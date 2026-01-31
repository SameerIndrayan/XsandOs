# XsandOs - Football Video Annotation System

A full-stack application for analyzing football videos with AI-powered player detection and annotations.

## Project Structure

```
XsandOs/
├── backend/          # Node.js + TypeScript Express API
│   ├── src/          # Backend source code
│   ├── test/         # Backend tests
│   └── package.json  # Backend dependencies
│
├── frontend/         # React + TypeScript frontend
│   ├── src/          # Frontend source code
│   └── package.json  # Frontend dependencies
│
└── README.md         # This file
```

## Quick Start

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm run dev
```

Backend runs on: http://localhost:3000

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

## Features

- **Video Upload & Analysis**: Upload football videos and get AI-powered annotations
- **Player Detection**: Automatic detection of offensive and defensive players
- **Play Annotations**: Arrows, terminology, and movement patterns
- **Play Summary**: AI-generated summaries of football plays
- **Interactive Frontend**: React-based UI with video player and annotation overlay

## Tech Stack

**Backend:**
- Node.js + TypeScript
- Express.js
- Google Gemini Vision API
- FFmpeg for frame extraction

**Frontend:**
- React + TypeScript
- Vite
- Canvas API for annotations

## API Endpoints

- `POST /api/analyze` - Analyze a football video
- `GET /health` - Health check

See `backend/README.md` for detailed API documentation.
