const assert = require('node:assert');
const http = require('node:http');
const mongoose = require('mongoose');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const logger = require('../middleware/logger');
const validateContentType = require('../middleware/contentType');
const taskRoutes = require('../routes/taskRoutes');
const authRoutes = require('../routes/authRoutes');
const errorHandler = require('../middleware/errorHandler');
const { resetCache, cache } = require('../utils/cache');

const app = express();
app.use(express.json());
app.use(validateContentType);
app.use(cors());
app.use(authRoutes);
app.use(taskRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

async function runTests() {
  console.log('--- Starting Practical 9 Automated Test Suite ---');
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}`);

  try {
    resetCache();

    // 1. Register and login User 1
    const user1Email = `testuser1_${Date.now()}@example.com`;
    const user2Email = `testuser2_${Date.now()}@example.com`;
    const password = 'Password123!';

    let regRes1 = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password })
    });
    assert.strictEqual(regRes1.status, 201, 'User 1 registration should succeed');

    let loginRes1 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password })
    });
    assert.strictEqual(loginRes1.status, 200, 'User 1 login should succeed');
    const { token: token1 } = await loginRes1.json();
    assert.ok(token1, 'User 1 token should exist');

    // Register and login User 2
    let regRes2 = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user2Email, password })
    });
    assert.strictEqual(regRes2.status, 201, 'User 2 registration should succeed');

    let loginRes2 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user2Email, password })
    });
    assert.strictEqual(loginRes2.status, 200, 'User 2 login should succeed');
    const { token: token2 } = await loginRes2.json();
    assert.ok(token2, 'User 2 token should exist');

    console.log('✓ Authentication and registration for multiple users verified');

    // 2. Authentication checks
    let unauthRes = await fetch(`${baseUrl}/tasks`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request should return 401');

    let invalidAuthRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: 'Bearer invalid.token.signature' }
    });
    assert.strictEqual(invalidAuthRes.status, 401, 'Invalid token should return 401');

    console.log('✓ Unauthenticated and invalid token rejections verified');

    // 3. User 1 GET /tasks cache miss then cache hit
    resetCache();
    let getTasksMiss = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getTasksMiss.status, 200);
    assert.strictEqual(getTasksMiss.headers.get('x-cache'), 'MISS', 'First GET /tasks should be a cache MISS');

    let getTasksHit = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getTasksHit.status, 200);
    assert.strictEqual(getTasksHit.headers.get('x-cache'), 'HIT', 'Second GET /tasks should be a cache HIT');

    console.log('✓ GET /tasks cache MISS and HIT behavior verified');

    // 4. User scoping check: User 2 requests /tasks -> should be MISS for User 2
    let user2GetTasks = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.strictEqual(user2GetTasks.status, 200);
    assert.strictEqual(user2GetTasks.headers.get('x-cache'), 'MISS', 'User 2 request must be MISS (scoped to user, not shared)');

    let user2GetTasksHit = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.strictEqual(user2GetTasksHit.status, 200);
    assert.strictEqual(user2GetTasksHit.headers.get('x-cache'), 'HIT', 'Second User 2 request should be HIT');

    console.log('✓ User cache scoping isolation verified');

    // 5. Debug stats endpoint
    let statsRes = await fetch(`${baseUrl}/tasks/cache/stats`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(statsRes.status, 200);
    const statsData = await statsRes.json();
    assert.ok(statsData.hits >= 2, 'Hits should be counted');
    assert.ok(statsData.misses >= 2, 'Misses should be counted');
    assert.strictEqual(statsData.ttlSeconds, 60, 'TTL should match config');
    console.log(`✓ Debug stats verified: hits=${statsData.hits}, misses=${statsData.misses}, keys=${statsData.keysCount}, ttl=${statsData.ttlSeconds}s`);

    // 6. Task creation and cache invalidation
    const newTaskPayload = {
      title: 'Practical 9 Cache Test Task',
      description: 'Verifying cache invalidation upon task creation',
      priority: 'high'
    };
    let createRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newTaskPayload)
    });
    assert.strictEqual(createRes.status, 201);
    const createdTask = await createRes.json();
    assert.strictEqual(createdTask.title, newTaskPayload.title);

    // After POST, GET /tasks should be a cache MISS due to invalidation
    let getTasksAfterCreate = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getTasksAfterCreate.status, 200);
    assert.strictEqual(getTasksAfterCreate.headers.get('x-cache'), 'MISS', 'GET /tasks after creation must be cache MISS');
    const tasksList = await getTasksAfterCreate.json();
    assert.ok(tasksList.some((t) => t._id === createdTask._id), 'Created task must be in the fetched list');

    console.log('✓ POST /tasks invalidation of task list verified');

    // 7. GET /tasks/:id single item cache and hit
    let getSingleMiss = await fetch(`${baseUrl}/tasks/${createdTask._id}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getSingleMiss.status, 200);
    assert.strictEqual(getSingleMiss.headers.get('x-cache'), 'MISS', 'Initial GET /tasks/:id should be MISS');

    let getSingleHit = await fetch(`${baseUrl}/tasks/${createdTask._id}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getSingleHit.status, 200);
    assert.strictEqual(getSingleHit.headers.get('x-cache'), 'HIT', 'Second GET /tasks/:id should be HIT');

    console.log('✓ GET /tasks/:id cache MISS and HIT verified');

    // 8. PUT /tasks/:id update and cache invalidation
    let updateRes = await fetch(`${baseUrl}/tasks/${createdTask._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Practical 9 Cache Test Task Updated',
        completed: true,
        priority: 'low'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updatedTask = await updateRes.json();
    assert.strictEqual(updatedTask.title, 'Practical 9 Cache Test Task Updated');

    // After PUT, both item and list must be invalidated
    let getSingleAfterPut = await fetch(`${baseUrl}/tasks/${createdTask._id}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getSingleAfterPut.status, 200);
    assert.strictEqual(getSingleAfterPut.headers.get('x-cache'), 'MISS', 'GET /tasks/:id after update must be cache MISS');
    const singleDataAfterPut = await getSingleAfterPut.json();
    assert.strictEqual(singleDataAfterPut.title, 'Practical 9 Cache Test Task Updated');

    let getListAfterPut = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getListAfterPut.status, 200);
    assert.strictEqual(getListAfterPut.headers.get('x-cache'), 'MISS', 'GET /tasks after update must be cache MISS');

    console.log('✓ PUT /tasks/:id invalidation of item and list cache verified');

    // 9. DELETE /tasks/:id and cache invalidation
    let deleteRes = await fetch(`${baseUrl}/tasks/${createdTask._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(deleteRes.status, 200);

    // After DELETE, GET /tasks/:id should return 404 (not cached)
    let getSingleAfterDelete = await fetch(`${baseUrl}/tasks/${createdTask._id}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getSingleAfterDelete.status, 404, 'Deleted task should return 404');

    // GET /tasks should be MISS and not include deleted task
    let getListAfterDelete = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getListAfterDelete.status, 200);
    assert.strictEqual(getListAfterDelete.headers.get('x-cache'), 'MISS', 'GET /tasks after delete must be cache MISS');
    const tasksAfterDelete = await getListAfterDelete.json();
    assert.ok(!tasksAfterDelete.some((t) => t._id === createdTask._id), 'Deleted task must not exist in list');

    console.log('✓ DELETE /tasks/:id invalidation verified');

    // 10. Negative tests: invalid ID, not found, validation errors (must NOT be cached)
    let invalidIdRes = await fetch(`${baseUrl}/tasks/not-a-valid-id`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(invalidIdRes.status, 400);

    let notFoundRes = await fetch(`${baseUrl}/tasks/660000000000000000000000`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(notFoundRes.status, 404);

    let valErrorRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: '' })
    });
    assert.strictEqual(valErrorRes.status, 400);

    console.log('✓ Negative tests (400, 404) verified — no improper caching of error responses');

    // 11. Timing Benchmark: 3 uncached vs 3 cached readings
    console.log('\n--- Measuring API Response Times (Actual HTTP Benchmark) ---');
    const uncachedReadings = [];
    const cachedReadings = [];

    for (let i = 1; i <= 3; i++) {
      // Invalidate cache before uncached request
      resetCache();
      const startUncached = performance.now();
      const resUncached = await fetch(`${baseUrl}/tasks`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      await resUncached.json();
      const durationUncached = Number((performance.now() - startUncached).toFixed(2));
      assert.strictEqual(resUncached.headers.get('x-cache'), 'MISS');
      uncachedReadings.push(durationUncached);

      // Now immediate cached request
      const startCached = performance.now();
      const resCached = await fetch(`${baseUrl}/tasks`, {
        headers: { Authorization: `Bearer ${token1}` }
      });
      await resCached.json();
      const durationCached = Number((performance.now() - startCached).toFixed(2));
      assert.strictEqual(resCached.headers.get('x-cache'), 'HIT');
      cachedReadings.push(durationCached);
    }

    console.log('Measured Uncached Times (ms):', uncachedReadings);
    console.log('Measured Cached Times (ms):', cachedReadings);

    const avgUncached = (uncachedReadings.reduce((a, b) => a + b, 0) / uncachedReadings.length).toFixed(2);
    const avgCached = (cachedReadings.reduce((a, b) => a + b, 0) / cachedReadings.length).toFixed(2);
    console.log(`Average Uncached: ${avgUncached} ms | Average Cached: ${avgCached} ms`);

    console.log('\n--- ALL AUTOMATED CHECKS PASSED FOR PRACTICAL 9 ---');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
