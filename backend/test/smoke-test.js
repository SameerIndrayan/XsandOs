/**
 * Minimal smoke test script
 * Tests that the server starts and responds to health check
 * 
 * Run with: node test/smoke-test.js
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runSmokeTest() {
  console.log('Running smoke tests...\n');

  try {
    // Test health endpoint
    console.log('1. Testing /health endpoint...');
    const healthResponse = await makeRequest('/health');
    if (healthResponse.status === 200) {
      console.log('   ✅ Health check passed');
    } else {
      console.log(`   ❌ Health check failed: ${healthResponse.status}`);
      process.exit(1);
    }

    // Test 404 handling
    console.log('2. Testing 404 handling...');
    const notFoundResponse = await makeRequest('/nonexistent');
    if (notFoundResponse.status === 404) {
      console.log('   ✅ 404 handling works');
    } else {
      console.log(`   ❌ 404 handling failed: ${notFoundResponse.status}`);
      process.exit(1);
    }

    console.log('\n✅ All smoke tests passed!');
  } catch (error) {
    console.error('\n❌ Smoke test failed:', error.message);
    console.error('   Make sure the server is running: npm run dev');
    process.exit(1);
  }
}

runSmokeTest();
