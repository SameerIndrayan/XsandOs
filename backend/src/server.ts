import 'dotenv/config';
import { createApp } from './app';

/**
 * Server entry point
 */

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Mock Mode: ${process.env.MOCK_MODE === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📤 Upload limit: 200MB`);
});
