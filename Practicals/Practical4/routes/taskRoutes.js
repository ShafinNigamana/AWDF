const express = require('express');
const router = express.Router();
const validateTaskId = require('../middleware/validateTaskId');
const Task = require('../models/Task');

router.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await Task.find();
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

router.post('/tasks', async (req, res, next) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.get('/tasks/:id', validateTaskId, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json(task);
  } catch (error) {
    return next(error);
  }
});

router.put('/tasks/:id', validateTaskId, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json(task);
  } catch (error) {
    return next(error);
  }
});

router.delete('/tasks/:id', validateTaskId, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json({
      message: 'Task deleted successfully',
      data: task
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
