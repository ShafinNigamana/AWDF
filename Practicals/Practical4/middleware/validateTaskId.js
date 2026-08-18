const validateTaskId = (req, res, next) => {
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId) || taskId < 1) {
    return res.status(400).json({
      error: 'Invalid task ID'
    });
  }

  req.params.id = String(taskId);
  next();
};

module.exports = validateTaskId;
