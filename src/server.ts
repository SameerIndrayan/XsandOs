import 'dotenv/config';
import { createApp } from './app';

/**
 * Server entry point
 * 
 * Starts the Express server on the configured port
 */

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📤 Upload limit: ${process.env.MAX_FILE_SIZE_MB || 500}MB`);
  console.log(`🎬 Frame interval: ${process.env.FRAME_INTERVAL_SEC || 0.5}s`);
});
