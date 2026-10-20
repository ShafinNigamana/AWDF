const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validateTaskId = require('../middleware/validateTaskId');
const validateTask = require('../middleware/validateTask');
const Task = require('../models/Task');
const {
  cache,
  getTaskListKey,
  getTaskItemKey,
  invalidateTaskListCache,
  invalidateAllTaskCache,
  getDebugStats
} = require('../utils/cache');

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

module.exports = router;
