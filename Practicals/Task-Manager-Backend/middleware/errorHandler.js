const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    const titleError = err.errors && err.errors.title;

    return res.status(400).json({
      error: titleError ? 'Title is required' : 'Validation failed'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid task ID'
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON'
    });
  }

  res.status(500).json({
    error: 'Something went wrong'
  });
};

module.exports = errorHandler;
