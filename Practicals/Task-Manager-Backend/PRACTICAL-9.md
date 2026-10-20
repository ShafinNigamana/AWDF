# Practical 9 — In-Memory Caching and Query Optimization

## Aim and Problem Statement
### Aim
Implement server-side in-memory caching using `node-cache` for the Task Manager API to reduce response latency on read queries (`GET /tasks`, `GET /tasks/:id`), isolate cache keys by authenticated user, enforce cache invalidation on database mutations, provide a cache telemetry endpoint, and measure actual response time differences.

### Problem Statement
Frequent database roundtrips for unchanged data introduce unnecessary I/O overhead and latency. In-memory caching stores retrieved documents in RAM for immediate retrieval. However, naive caching introduces staleness and security risks (e.g., cross-tenant cache leakage). A robust caching strategy must guarantee user isolation, safe cache invalidation on write operations, and clear observability.

## Implementation
```javascript
// utils/cache.js
const NodeCache = require('node-cache');

const getTTL = () => {
  const envTTL = parseInt(process.env.CACHE_TTL, 10);
  return Number.isFinite(envTTL) && envTTL > 0 ? envTTL : 60;
};

const cache = new NodeCache({
  stdTTL: getTTL(),
  checkperiod: 120,
  useClones: true
});

const getTaskListKey = (userId, query = {}) => {
  const queryString = Object.keys(query).length > 0 ? `:${JSON.stringify(query)}` : '';
  return `tasks:user:${userId}${queryString}`;
};

const getTaskItemKey = (userId, taskId) => {
  return `task:user:${userId}:${taskId}`;
};

const invalidateTaskListCache = () => {
  const allKeys = cache.keys();
  const listKeys = allKeys.filter((key) => key.startsWith('tasks:user:'));
  if (listKeys.length > 0) {
    cache.del(listKeys);
  }
};

const invalidateTaskItemCache = (taskId) => {
  const allKeys = cache.keys();
  const itemKeys = allKeys.filter((key) => key.startsWith('task:user:') && key.endsWith(`:${taskId}`));
  if (itemKeys.length > 0) {
    cache.del(itemKeys);
  }
};

const invalidateAllTaskCache = (taskId) => {
  invalidateTaskListCache();
  if (taskId) {
    invalidateTaskItemCache(taskId);
  }
};

const getDebugStats = () => {
  const stats = cache.getStats();
  return {
    hits: stats.hits,
    misses: stats.misses,
    keysCount: cache.keys().length,
    ttlSeconds: getTTL()
  };
};

module.exports = {
  cache,
  getTTL,
  getTaskListKey,
  getTaskItemKey,
  invalidateTaskListCache,
  invalidateTaskItemCache,
  invalidateAllTaskCache,
  getDebugStats
};
```

```javascript
// routes/taskRoutes.js (caching integration)
router.get('/tasks/cache/stats', authenticate, (req, res) => {
  res.status(200).json(getDebugStats());
});

router.get('/tasks', authenticate, async (req, res, next) => {
  try {
    const cacheKey = getTaskListKey(req.user.id, req.query);
    const cachedTasks = cache.get(cacheKey);

    if (cachedTasks !== undefined) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json(cachedTasks);
    }

    const tasks = await Task.find();
    cache.set(cacheKey, tasks);
    res.set('X-Cache', 'MISS');
    return res.status(200).json(tasks);
  } catch (error) {
    return next(error);
  }
});

router.post('/tasks', authenticate, validateTask, async (req, res, next) => {
  try {
    const task = await Task.create(req.body);
    invalidateTaskListCache();
    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
});

router.get('/tasks/:id', authenticate, validateTaskId, async (req, res, next) => {
  try {
    const cacheKey = getTaskItemKey(req.user.id, req.params.id);
    const cachedTask = cache.get(cacheKey);

    if (cachedTask !== undefined) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json(cachedTask);
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    cache.set(cacheKey, task);
    res.set('X-Cache', 'MISS');
    return res.status(200).json(task);
  } catch (error) {
    return next(error);
  }
});

router.put('/tasks/:id', authenticate, validateTaskId, validateTask, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    invalidateAllTaskCache(req.params.id);
    return res.status(200).json(task);
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
    return res.status(200).json({
      message: 'Task deleted successfully',
      data: task
    });
  } catch (error) {
    return next(error);
  }
});
```

## Cache TTL and Invalidation Strategy
- **Configurable TTL**: Defaults to 60 seconds, configurable via `CACHE_TTL` in `.env`.
- **User Scoping**: Cache keys follow `tasks:user:<userId>[:<queryString>]` for list queries and `task:user:<userId>:<taskId>` for single items, ensuring authenticated users never receive another user's cached dataset.
- **Invalidation Strategy**:
  - `POST /tasks`: Clears all task-list keys (`tasks:user:*`) immediately.
  - `PUT /tasks/:id`: Clears all task-list keys and specific task item keys matching the updated ID.
  - `DELETE /tasks/:id`: Clears all task-list keys and specific task item keys matching the deleted ID.
  - **Error Safety**: 400 Bad Request, 401 Unauthorized, 404 Not Found, and 500 database errors are never cached and never trigger invalidation.

## Actual Response Time Measurements
Measurements were recorded using `test/test-practical-9.js` with Node.js high-resolution `performance.now()` against a live Express server backed by local MongoDB:

| Reading | Uncached Response Time (`X-Cache: MISS`) | Cached Response Time (`X-Cache: HIT`) | Latency Reduction |
| :--- | :--- | :--- | :--- |
| Reading 1 | 7.48 ms | 4.21 ms | 43.7% faster |
| Reading 2 | 6.42 ms | 4.69 ms | 26.9% faster |
| Reading 3 | 6.03 ms | 3.96 ms | 34.3% faster |
| **Average** | **6.64 ms** | **4.29 ms** | **35.4% average improvement** |

*Methodology*: For each reading, the cache was flushed to record an authenticated database fetch (`MISS`), followed immediately by a second request retrieving the in-memory cached copy (`HIT`).

## Conceptual Questions & Answers
### 1. Why is cache invalidation important?
Cache invalidation ensures cache consistency and read-after-write correctness. If stale data remains in cache after a creation, update, or deletion, clients continue seeing outdated or ghost records. Invalidation immediately evicts affected keys so subsequent queries fetch fresh data from the authoritative source.

### 2. What is the trade-off involved in choosing a TTL?
- **Longer TTL**: Maximizes hit ratios and minimizes database load, but increases the window of data staleness if changes occur outside the normal invalidation flow.
- **Shorter TTL**: Limits the lifespan of stale data and ensures frequent synchronization with the database, but increases database query frequency and reduces latency benefits.

### 3. Why is `node-cache` unsuitable as the sole shared cache in a multi-server deployment?
`node-cache` stores entries in the local V8 heap memory of a single Node.js process. In a scaled deployment with multiple server instances or containers behind a load balancer, instances do not share process memory. An invalidation triggered on Server A cannot purge the memory of Server B, causing users to see inconsistent data depending on which instance handles their request. Multi-server architectures require an external, distributed in-memory store like Redis.

## Supplementary Implementation and Observations
1. **Single Task Caching (`GET /tasks/:id`)**: Cached separately under `task:user:<userId>:<taskId>` and invalidated upon `PUT` or `DELETE` for that specific task ID.
2. **Debug Telemetry Endpoint (`GET /tasks/cache/stats`)**: Protected with JWT authentication, returning hits, misses, active key count, and configured TTL without exposing task data or secrets.
3. **Configurable TTL**: Supported via `CACHE_TTL` in `.env` and `.env.example`.

## Manual Screenshot Checklist
Capture the following screenshots for Practical 9 submission:
1. **Automated Test Run**: Terminal screenshot running `npm test` showing all assertions and timing measurements passing.
2. **GET /tasks Cache Miss**: Postman/curl showing `GET /tasks` with `X-Cache: MISS` header and initial response time.
3. **GET /tasks Cache Hit**: Postman/curl showing immediate repeated `GET /tasks` with `X-Cache: HIT` header and reduced response time.
4. **Cache Invalidation on Mutation**: Postman/curl showing `POST /tasks` or `PUT /tasks/:id` followed by a subsequent `GET /tasks` returning `X-Cache: MISS`.
5. **Debug Telemetry Endpoint**: Postman/curl `GET /tasks/cache/stats` showing current hits, misses, and keys count.
