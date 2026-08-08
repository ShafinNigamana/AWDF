const express = require('express');

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} ${new Date().toISOString()}`);
  next();
});

app.use((req, res, next) => {
  if ((req.method === 'POST' || req.method === 'PUT') && !req.is('application/json')) {
    return res.status(500).json({
      success: false,
      message: 'Content-Type must be application/json'
    });
  }

  next();
});

app.use(express.json());

const tasks = [
  { id: 1, title: 'Learn Express basics', completed: false },
  { id: 2, title: 'Create task API routes', completed: false }
];
let nextTaskId = 3;

app.get('/tasks', (req, res) => {
  res.status(200).json({
    success: true,
    data: tasks
  });
});

app.post('/tasks', (req, res) => {
  const task = {
    id: nextTaskId,
    title: req.body.title,
    completed: false
  };

  nextTaskId++;
  tasks.push(task);

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: task
  });
});

app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  task.title = req.body.title;
  task.completed = req.body.completed;

  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: task
  });
});

app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const taskIndex = tasks.findIndex((item) => item.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  const deletedTask = tasks.splice(taskIndex, 1);

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
    data: deletedTask[0]
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
