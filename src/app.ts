import express, { Express, Request, Response, NextFunction } from 'express';
import { initGemini } from './services/gemini';
import annotateRouter from './routes/annotate';
import { ensureDir } from './utils/fs';

/**
 * Express application setup
 * 
 * Design decisions:
 * - Centralized app configuration separate from server entry
 * - Middleware for JSON parsing and error handling
 * - Environment-based configuration
 * - Initializes Gemini service on startup
 */

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Initialize Gemini service
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const mockMode = process.env.MOCK_MODE === '1' || process.env.MOCK_MODE === 'true';

  if (!mockMode && !geminiApiKey) {
    console.warn('WARNING: GEMINI_API_KEY not set. Set MOCK_MODE=1 to use mock data.');
  }

  initGemini(geminiApiKey, geminiModel, mockMode);

  if (mockMode) {
    console.log('🔧 Running in MOCK_MODE - Gemini API calls will be bypassed');
  } else {
    console.log(`✅ Gemini service initialized with model: ${geminiModel}`);
  }

  // Ensure temp directories exist
  const tempDirs = [
    process.env.UPLOAD_DIR || './tmp/uploads',
    process.env.FRAME_OUTPUT_DIR || './tmp/frames',
  ];

  Promise.all(tempDirs.map((dir) => ensureDir(dir))).catch((err) => {
    console.error('Failed to create temp directories:', err);
  });

  // API routes
  app.use('/api', annotateRouter);

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  return app;
}
