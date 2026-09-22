const mongoose = require('mongoose');

const validateTaskId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      error: 'Invalid task ID'
    });
  }

  next();
};

module.exports = validateTaskId;
