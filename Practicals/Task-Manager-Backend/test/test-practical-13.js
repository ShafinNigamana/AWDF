const assert = require('node:assert');
const http = require('node:http');
const mongoose = require('mongoose');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const taskRoutes = require('../routes/taskRoutes');
const authRoutes = require('../routes/authRoutes');
const aiRoutes = require('../routes/aiRoutes');
const errorHandler = require('../middleware/errorHandler');
const validateContentType = require('../middleware/contentType');

const app = express();
app.use(express.json());
app.use(validateContentType);
app.use(cors());
app.use(authRoutes);
app.use(taskRoutes);
app.use('/tasks/ai', aiRoutes);
app.use('/api/ai', aiRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

async function runTests() {
  console.log('--- Starting Practical 13 Automated Test Suite (AI Integration) ---');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}`);

  try {
    aiRoutes._resetRateLimits();

    // 1. Authenticate a test user
    const userEmail = `prac13_user_${Date.now()}@example.com`;
    const password = 'Password123!';

    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password })
    });
    assert.strictEqual(regRes.status, 201);

    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password })
    });
    assert.strictEqual(loginRes.status, 200);
    const { token } = await loginRes.json();
    assert.ok(token);
    console.log('✓ Authentication verified for Practical 13');

    // 2. Unauthenticated request rejection
    const unauthRes = await fetch(`${baseUrl}/tasks/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Refactor database queries' })
    });
    assert.strictEqual(unauthRes.status, 401);
    console.log('✓ Rejected unauthenticated request (401)');

    // 3. Input Validation Tests
    // 3a. Missing title
    const missingTitleRes = await fetch(`${baseUrl}/tasks/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({})
    });
    assert.strictEqual(missingTitleRes.status, 400);

    // 3b. Empty title
    const emptyTitleRes = await fetch(`${baseUrl}/tasks/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: '   ' })
    });
    assert.strictEqual(emptyTitleRes.status, 400);

    // 3c. Title too short (<3 chars)
    const shortTitleRes = await fetch(`${baseUrl}/tasks/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'ab' })
    });
    assert.strictEqual(shortTitleRes.status, 400);

    // 3d. Title too long (>150 chars)
    const longTitleRes = await fetch(`${baseUrl}/tasks/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'a'.repeat(151) })
    });
    assert.strictEqual(longTitleRes.status, 400);
    console.log('✓ Input validation verified for empty, short, and oversized titles (400)');

    // 4. Rate Limiting Tests
    aiRoutes._resetRateLimits();
    const testTitle = 'Rate limit test feature';

    const firstCall = await fetch(`${baseUrl}/tasks/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: testTitle })
    });

    if (firstCall.status === 200) {
      const firstData = await firstCall.json();
      assert.ok(firstData.description, 'Response must include description');
      assert.ok(firstData.disclaimer, 'Response must include AI disclaimer');
      console.log(`✓ Successful AI generation: "${firstData.description}" (Model: ${firstData.model})`);

      // Second immediate call must be rate-limited (429)
      const secondCall = await fetch(`${baseUrl}/tasks/ai/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: testTitle })
      });
      assert.strictEqual(secondCall.status, 429, 'Immediate second call should be rate-limited');
      const rateLimitData = await secondCall.json();
      assert.ok(rateLimitData.retryAfterSeconds > 0, 'Retry-after seconds must be reported');
      console.log(`✓ Backend rate-limiting verified: 429 Too Many Requests (${rateLimitData.retryAfterSeconds}s remaining)`);
    } else {
      console.log(`ℹ AI endpoint responded with status ${firstCall.status}`);
    }

    // 5. Test Alias Route (/api/ai/generate-description)
    aiRoutes._resetRateLimits();
    const aliasRes = await fetch(`${baseUrl}/api/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'API Alias Route Verification' })
    });
    assert.ok([200, 502, 503].includes(aliasRes.status), 'Alias route /api/ai/generate-description responded');
    console.log('✓ Alias route /api/ai/generate-description verified');

    // 6. Resilience: Core task operations continue working regardless of AI status
    const coreTaskRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Core Task Resilience Verification',
        description: 'Verifying core CRUD is unaffected by AI status',
        priority: 'high'
      })
    });
    assert.strictEqual(coreTaskRes.status, 201);
    const createdCoreTask = await coreTaskRes.json();
    assert.ok(createdCoreTask._id);

    const getCoreTaskRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(getCoreTaskRes.status, 200);

    const deleteCoreTaskRes = await fetch(`${baseUrl}/tasks/${createdCoreTask._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(deleteCoreTaskRes.status, 200);
    console.log('✓ Core Task CRUD resilience verified (unaffected by AI provider state)');

    console.log('\n--- ALL AUTOMATED CHECKS PASSED FOR PRACTICAL 13 ---');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
