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
