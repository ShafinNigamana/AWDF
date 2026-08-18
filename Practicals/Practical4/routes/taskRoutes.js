const express = require('express');
const router = express.Router();
const validateTaskId = require('../middleware/validateTaskId');

const tasks = [
  { id: 1, title: 'Learn Express basics', completed: false },
  { id: 2, title: 'Create task API routes', completed: false }
];

let nextTaskId = 3;

router.get('/tasks', (req, res) => {
  res.status(200).json(tasks);
});

router.post('/tasks', (req, res) => {
  const { title, completed = false } = req.body;

  const newTask = {
    id: nextTaskId,
    title,
    completed
  };

  nextTaskId += 1;
  tasks.push(newTask);

  res.status(201).json(newTask);
});

router.put('/tasks/:id', validateTaskId, (req, res) => {
  const taskId = Number(req.params.id);
  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, completed } = req.body;

  if (title !== undefined) {
    task.title = title;
  }

  if (completed !== undefined) {
    task.completed = completed;
  }

  return res.status(200).json(task);
});

router.delete('/tasks/:id', validateTaskId, (req, res) => {
  const taskId = Number(req.params.id);
  const taskIndex = tasks.findIndex((item) => item.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const [deletedTask] = tasks.splice(taskIndex, 1);

  return res.status(200).json({
    message: 'Task deleted successfully',
    data: deletedTask
  });
});

module.exports = router;
