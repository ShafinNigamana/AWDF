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

const resetCache = () => {
  cache.flushAll();
  cache.flushStats();
};

module.exports = {
  cache,
  getTTL,
  getTaskListKey,
  getTaskItemKey,
  invalidateTaskListCache,
  invalidateTaskItemCache,
  invalidateAllTaskCache,
  getDebugStats,
  resetCache
};
