require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const logger = require('./middleware/logger');
const validateContentType = require('./middleware/contentType');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(logger);
app.use(express.json());
app.use(validateContentType);
app.use(taskRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
