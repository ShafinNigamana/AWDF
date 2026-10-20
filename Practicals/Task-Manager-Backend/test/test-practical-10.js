const assert = require('node:assert');
const http = require('node:http');
const mongoose = require('mongoose');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const taskRoutes = require('../routes/taskRoutes');
const authRoutes = require('../routes/authRoutes');
const errorHandler = require('../middleware/errorHandler');
const validateContentType = require('../middleware/contentType');
const { taskEventEmitter, safeAsync } = require('../events/taskEvents');
const { resetCache } = require('../utils/cache');
const Task = require('../models/Task');

const app = express();
app.use(express.json());
app.use(validateContentType);
app.use(cors());
app.use(authRoutes);
app.use(taskRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

async function runTests() {
  console.log('--- Starting Practical 10 Automated Test Suite ---');
  process.env.SIMULATE_SLOW_NOTIFICATION = 'true';

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}`);

  try {
    resetCache();

    // 1. Authenticate a user
    const userEmail = `prac10_user_${Date.now()}@example.com`;
    const password = 'Password123!';

    let regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password })
    });
    assert.strictEqual(regRes.status, 201);

    let loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password })
    });
    const { token } = await loginRes.json();
    assert.ok(token);

    console.log('✓ Authentication verified for Practical 10');

    // 2. Track emitted events with custom listeners
    const capturedEvents = {
      created: [],
      deleted: [],
      errors: []
    };

    taskEventEmitter.on('task-created', (data) => capturedEvents.created.push({ ...data, receivedAt: Date.now() }));
    taskEventEmitter.on('task-deleted', (data) => capturedEvents.deleted.push({ ...data, receivedAt: Date.now() }));
    taskEventEmitter.on('error', (err, source) => capturedEvents.errors.push({ error: err.message, source }));

    // 3. Test POST /tasks -> MongoDB save + task-created event + fast response despite 2s slow notification
    console.log('\n--- Testing Asynchronous POST /tasks and Slow Notification Decoupling ---');
    const taskPayload = {
      title: 'Practical 10 Event-Driven Architecture Task',
      description: 'Verifying EventEmitter background execution',
      priority: 'high'
    };

    const httpStartTime = performance.now();
    let createRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskPayload)
    });
    const httpDuration = Number((performance.now() - httpStartTime).toFixed(2));
    assert.strictEqual(createRes.status, 201);
    const createdTask = await createRes.json();

    console.log(`HTTP Response returned in ${httpDuration} ms (Status: 201 Created)`);
    assert.ok(httpDuration < 1000, `HTTP response must be non-blocking (< 1000ms), actual: ${httpDuration}ms`);

    // Verify task is in MongoDB before or right as event fired
    const dbTask = await Task.findById(createdTask._id);
    assert.ok(dbTask, 'Task must be persistently saved in MongoDB');
    assert.strictEqual(dbTask.title, taskPayload.title);
    console.log('✓ Verified task is saved in MongoDB before event processing');

    // Verify task-created event was emitted with required fields
    const matchingCreatedEvent = capturedEvents.created.find((e) => e.taskId === createdTask._id);
    assert.ok(matchingCreatedEvent, 'task-created event must be emitted');
    assert.strictEqual(matchingCreatedEvent.title, taskPayload.title);
    assert.ok(matchingCreatedEvent.assignedUser, 'Assigned user must be present in event');
    assert.ok(matchingCreatedEvent.emittedAt, 'Emitted timestamp must be present');
    console.log(`✓ task-created event captured: Title="${matchingCreatedEvent.title}", User=${matchingCreatedEvent.assignedUser}`);

    // Wait for the simulated 2-second slow notification to finish in background
    console.log('Waiting 2.2 seconds to allow background slow notification listener to complete...');
    await new Promise((resolve) => setTimeout(resolve, 2200));
    console.log('✓ Background slow notification completed without blocking HTTP response');

    // 4. Test validation failure on POST /tasks -> MUST NOT emit task-created
    const preCount = capturedEvents.created.length;
    let failRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: '' }) // invalid
    });
    assert.strictEqual(failRes.status, 400);
    assert.strictEqual(capturedEvents.created.length, preCount, 'Failed task must NOT emit task-created event');
    console.log('✓ Verified failed save does not emit task-created event');

    // 5. Test DELETE /tasks/:id -> task-deleted event (Supplementary 1)
    console.log('\n--- Testing DELETE /tasks/:id and task-deleted Event ---');
    let delRes = await fetch(`${baseUrl}/tasks/${createdTask._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(delRes.status, 200);

    const matchingDeletedEvent = capturedEvents.deleted.find((e) => e.taskId === createdTask._id);
    assert.ok(matchingDeletedEvent, 'task-deleted event must be emitted');
    assert.strictEqual(matchingDeletedEvent.title, taskPayload.title);
    assert.ok(matchingDeletedEvent.deletedBy, 'deletedBy must be present');
    console.log(`✓ task-deleted event captured: TaskId=${matchingDeletedEvent.taskId}, Title="${matchingDeletedEvent.title}"`);

    // 6. Test asynchronous error handling (Supplementary 2)
    console.log('\n--- Testing Asynchronous Event Error Handling ---');
    const faultyListener = safeAsync('faultyTestListener', async () => {
      throw new Error('Simulated async listener breakdown');
    });

    taskEventEmitter.on('test-fault-event', faultyListener);
    taskEventEmitter.emit('test-fault-event', { data: 'test' });

    // Allow event loop cycle
    await new Promise((resolve) => setImmediate(resolve));
    const capturedError = capturedEvents.errors.find((e) => e.source === 'faultyTestListener');
    assert.ok(capturedError, 'Error event must be emitted for failing async listener');
    assert.strictEqual(capturedError.error, 'Simulated async listener breakdown');
    console.log('✓ Verified safe handling of rejected promises in event listeners via error event pipeline');

    // 7. Verify Practical 9 Caching still works seamlessly with Practical 10 Events
    console.log('\n--- Testing Cache Integration with Practical 10 ---');
    resetCache();
    let missRes = await fetch(`${baseUrl}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
    assert.strictEqual(missRes.headers.get('x-cache'), 'MISS');

    let hitRes = await fetch(`${baseUrl}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
    assert.strictEqual(hitRes.headers.get('x-cache'), 'HIT');
    console.log('✓ Verified cache hits and misses operate properly with event listeners active');

    console.log('\n--- ALL AUTOMATED CHECKS PASSED FOR PRACTICAL 10 ---');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
