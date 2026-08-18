const express = require('express');
const logger = require('./middleware/logger');
const validateContentType = require('./middleware/contentType');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
