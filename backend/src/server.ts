import 'dotenv/config';
import { createApp } from './app';

/**
 * Server entry point
 */

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Mock Mode: ${process.env.MOCK_MODE === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📤 Upload limit: 200MB`);
});
