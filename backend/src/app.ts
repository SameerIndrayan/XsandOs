import express, { Express, Request, Response, NextFunction } from 'express';
import * as path from 'path';
import analyzeRouter from './routes/analyze';
import { ensureDir } from './utils/fs';

/**
 * Express application setup
 */

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded videos from uploads directory
  const uploadsDir = process.env.UPLOAD_DIR || './tmp/uploads';
  app.use('/uploads', express.static(path.join(__dirname, '..', uploadsDir)));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

      // Ensure temp directories exist
      const tempDirs = [
        process.env.UPLOAD_DIR || './tmp/uploads',
        process.env.FRAME_OUTPUT_DIR || './tmp/frames',
      ];

  Promise.all(tempDirs.map((dir) => ensureDir(dir))).catch((err) => {
    console.error('Failed to create temp directories:', err);
  });

  // API routes
  app.use('/api', analyzeRouter);

  // Error handling
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
