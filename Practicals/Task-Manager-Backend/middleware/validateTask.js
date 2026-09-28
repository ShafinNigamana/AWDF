const validateTask = (req, res, next) => {
  const { title, description, completed, priority } = req.body || {};

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Title is required'
    });
  }

  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'Validation failed', message: 'Description must be a string' });
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Validation failed', message: 'Completed must be a boolean' });
  }

  if (priority !== undefined && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({ error: 'Validation failed', message: 'Priority is invalid' });
  }

  return next();
};

module.exports = validateTask;
