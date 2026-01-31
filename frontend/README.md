# X&Os Frontend

React + TypeScript frontend for the Football Play Annotation System.

## Features

- **Video Player** with canvas overlay for annotations
- **Player Highlights** - 3D elliptical markers around players
- **Movement Arrows** with labels showing routes and directions
- **Terminology Boxes** with definitions for football terms
- **Voice Q&A** - Ask questions about the play using speech recognition
- **Text-to-Speech** - AI responses are read aloud
- **Responsive Design** with modern UI

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── AnnotationCanvas/  # Canvas overlay for rendering annotations
│   │   ├── VideoPlayer/       # HTML5 video player with controls
│   │   └── VoiceQA/           # Voice Q&A component
│   ├── hooks/
│   │   ├── useAnnotationFrames.ts
│   │   ├── useCanvasResize.ts
│   │   ├── useSpeechRecognition.ts
│   │   └── useTextToSpeech.ts
│   ├── renderers/             # Canvas rendering functions
│   ├── data/                  # Mock data and backend response handlers
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Utility functions
├── public/
│   └── test.mp4               # Test video file
└── index.html
```

## Tech Stack

- React 18
- TypeScript
- Vite
- Canvas API
- Web Speech API

## Integration with Backend

The frontend transforms backend Gemini API responses into the annotation format:

```typescript
import { transformBackendData } from './utils/transformBackendData';
import { backendTestData } from './data/backendTestData';

const annotations = transformBackendData(backendTestData);
```

## Keyboard Shortcuts

- `Space` or `K` - Play/Pause
- `J` or `←` - Skip back 5 seconds
- `L` or `→` - Skip forward 5 seconds
- `↑`/`↓` - Volume up/down
- `M` - Mute/Unmute
- `F` - Fullscreen
- `A` - Toggle annotations
