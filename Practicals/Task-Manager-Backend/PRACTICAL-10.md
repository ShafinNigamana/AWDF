# Practical 10 — Asynchronous Processing with Event-Driven Architecture

## Aim and Problem Statement
### Aim
Implement asynchronous background processing using Node.js's built-in `EventEmitter` to decouple secondary operations (audit logging, notifications) from the primary HTTP request-response cycle on `POST /tasks` and `DELETE /tasks/:id`.

### Problem Statement
Executing auxiliary side-effects (e.g., third-party webhooks, email alerts, complex logging) synchronously inside HTTP route handlers forces clients to wait for all secondary actions to finish before receiving an HTTP response. This inflates API latency and tightly couples core database operations with transient external dependencies. An event-driven architecture allows the server to persist data, send an immediate HTTP response, and execute side-effects asynchronously in the background.

## Implementation
```javascript
// events/taskEvents.js
const { EventEmitter } = require('node:events');

class TaskEventEmitter extends EventEmitter {
  constructor() {
    super({ captureRejections: true });
  }
}

const taskEventEmitter = new TaskEventEmitter();

// Safe wrapper for asynchronous event listeners to prevent unhandled rejections
const safeAsync = (listenerName, asyncFn) => async (...args) => {
  try {
    await asyncFn(...args);
  } catch (error) {
    console.error(`[TaskEvents Error][${listenerName}]: ${error.message}`);
    taskEventEmitter.emit('error', error, listenerName);
  }
};

// Global error listener for event pipeline failures
taskEventEmitter.on('error', (err, source) => {
  console.error(`[TaskEvents Global Error] Pipeline error in "${source || 'anonymous'}": ${err.message}`);
});

// Listener 1: Asynchronous task creation logger
taskEventEmitter.on(
  'task-created',
  safeAsync('taskCreatedLogger', async (eventData) => {
    const handlerExecutionTime = new Date().toISOString();
    console.log(
      `[Event: task-created] TaskId=${eventData.taskId} | Title="${eventData.title}" | AssignedUser=${eventData.assignedUser} | EmittedAt=${eventData.emittedAt} | HandlerExecutedAt=${handlerExecutionTime}`
    );
  })
);

// Listener 2: Asynchronous task deletion logger (Supplementary 1)
taskEventEmitter.on(
  'task-deleted',
  safeAsync('taskDeletedLogger', async (eventData) => {
    const handlerExecutionTime = new Date().toISOString();
    console.log(
      `[Event: task-deleted] TaskId=${eventData.taskId} | Title="${eventData.title}" | DeletedBy=${eventData.deletedBy} | EmittedAt=${eventData.emittedAt} | HandlerExecutedAt=${handlerExecutionTime}`
    );
  })
);

// Listener 3: Simulated 2-second slow notification background handler (Supplementary 3)
taskEventEmitter.on(
  'task-created',
  safeAsync('slowNotificationSimulator', async (eventData) => {
    const shouldSimulate = process.env.SIMULATE_SLOW_NOTIFICATION !== 'false';
    if (!shouldSimulate) return;

    const startTime = new Date().toISOString();
    console.log(`[SlowNotification] Background notification started for "${eventData.title}" at ${startTime} (simulating 2000ms email/webhook)...`);
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const finishTime = new Date().toISOString();
    console.log(`[SlowNotification] Background notification finished for "${eventData.title}" at ${finishTime}`);
  })
);

module.exports = {
  taskEventEmitter,
  safeAsync
};
```

```javascript
// routes/taskRoutes.js (Event emission on POST and DELETE)
router.post('/tasks', authenticate, validateTask, async (req, res, next) => {
  try {
    const task = await Task.create(req.body);
    invalidateTaskListCache();

    const responseTimestamp = new Date().toISOString();
    taskEventEmitter.emit('task-created', {
      taskId: task._id.toString(),
      title: task.title,
      assignedUser: req.user.id,
      emittedAt: responseTimestamp
    });

    console.log(`[HTTP Response] POST /tasks 201 Created sent at ${responseTimestamp} for task "${task.title}"`);
    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
});

router.delete('/tasks/:id', authenticate, validateTaskId, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    invalidateAllTaskCache(req.params.id);

    const responseTimestamp = new Date().toISOString();
    taskEventEmitter.emit('task-deleted', {
      taskId: task._id.toString(),
      title: task.title,
      deletedBy: req.user.id,
      emittedAt: responseTimestamp
    });

    console.log(`[HTTP Response] DELETE /tasks/:id 200 OK sent at ${responseTimestamp} for task "${task.title}"`);
    return res.status(200).json({
      message: 'Task deleted successfully',
      data: task
    });
  } catch (error) {
    return next(error);
  }
});
```

## Actual Event and Timestamp Logs
The following actual logs were captured during the execution of `npm test`:

```text
[Event: task-created] TaskId=6ad48e8827a61424717eda77 | Title="Practical 10 Event-Driven Architecture Task" | AssignedUser=6ad48e8827a61424717eda76 | EmittedAt=2026-10-18T09:16:56.569Z | HandlerExecutedAt=2026-10-18T09:16:56.569Z
[SlowNotification] Background notification started for "Practical 10 Event-Driven Architecture Task" at 2026-10-18T09:16:56.570Z (simulating 2000ms email/webhook)...
[HTTP Response] POST /tasks 201 Created sent at 2026-10-18T09:16:56.569Z for task "Practical 10 Event-Driven Architecture Task"
HTTP Response returned in 14.34 ms (Status: 201 Created)
[SlowNotification] Background notification finished for "Practical 10 Event-Driven Architecture Task" at 2026-10-18T09:16:58.573Z
[Event: task-deleted] TaskId=6ad48e8827a61424717eda77 | Title="Practical 10 Event-Driven Architecture Task" | DeletedBy=6ad48e8827a61424717eda76 | EmittedAt=2026-10-18T09:16:58.809Z | HandlerExecutedAt=2026-10-18T09:16:58.809Z
[HTTP Response] DELETE /tasks/:id 200 OK sent at 2026-10-18T09:16:58.809Z for task "Practical 10 Event-Driven Architecture Task"
```

## Actual HTTP Response Time vs Slow-Handler Observations
- **HTTP Response Time**: 14.34 ms (Status `201 Created` received by caller).
- **Background Slow Handler Start**: `2026-10-18T09:16:56.570Z`
- **Background Slow Handler Completion**: `2026-10-18T09:16:58.573Z` (elapsed: 2003 ms)
- **Observation**: Even though the background notification handler took 2003 ms to complete, the HTTP API responded in 14.34 ms. The client experienced sub-15ms latency because the slow task was offloaded to the Node.js event loop without blocking the HTTP socket response.

## Conceptual Questions & Answers
### 1. Why does the event handler not need to block the HTTP response?
In Node.js's asynchronous architecture, emitting an event simply registers the listener callbacks to be executed in subsequent turns of the event loop. The route handler issues `res.status(201).json(task)`, which formats the response payload, writes headers and bytes to the underlying TCP socket, and finishes the HTTP exchange immediately without awaiting asynchronous completion of background event listener Promises.

### 2. Why would performing a slow notification inline affect response time?
If a 2-second notification (such as dispatching an SMTP email or sending an HTTP webhook) were executed inline using `await sendNotification()`, the route handler would halt execution until that external call resolved. The HTTP response would take over 2000 ms to return to the client. Under concurrent traffic, server connections and memory would become backlogged waiting on third-party I/O.

### 3. Why is `EventEmitter` appropriate for a small lab application but insufficient by itself for a durable, distributed workload involving millions of events per day?
Node.js's built-in `EventEmitter` is an in-memory, process-local publisher/subscriber implementation:
- **No Durability**: If the server crashes, reboots, or runs out of memory, all queued and in-flight events are permanently lost with no recovery mechanism.
- **No Horizontal Scaling**: Events emitted on one server instance cannot be observed or consumed by other server instances across a cluster or Kubernetes pod replica.
- **No Enterprise Guarantees**: It lacks persistent storage, delivery acknowledgments (at-least-once delivery), backpressure handling, message deduplication, and dead-letter queues.
For large-scale, durable distributed workloads handling millions of daily events, dedicated message brokers like Apache Kafka, RabbitMQ, Amazon SQS, or Redis BullMQ are required.

## Supplementary Implementation
1. **`task-deleted` Event**: Emitted upon successful task deletion (`DELETE /tasks/:id`), capturing the task ID, title, deleter ID, and timestamps.
2. **Robust Async Error Handling**: Configured `captureRejections: true` on `TaskEventEmitter`, wrapped async listeners in `safeAsync`, and registered a dedicated `'error'` listener to capture rejected promises without process crashes.
3. **Simulated 2-Second Notification Handler**: Demonstrates complete non-blocking background execution on `POST /tasks`, toggleable via `SIMULATE_SLOW_NOTIFICATION`.

## Manual Screenshot Checklist
Capture the following screenshots for Practical 10 submission:
1. **Automated Test Run**: Terminal screenshot running `npm run test:p10` showing all assertions passing with timestamp logs.
2. **Postman POST /tasks Fast Response**: Postman showing `POST /tasks` returning in ~10-20 ms while the server terminal continues logging the 2s background notification.
3. **Terminal Background Slow Notification Output**: Server logs showing the `[SlowNotification]` start and finish timestamps (~2s apart) after the HTTP response was sent.
4. **Terminal DELETE /tasks/:id Event Output**: Server logs showing `[Event: task-deleted]` with task title and deleter user ID.
5. **Error Pipeline Demonstration**: Terminal showing graceful capture of listener errors via `[TaskEvents Error]` without unhandled promise rejections.
