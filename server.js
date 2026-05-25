const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load env variables
dotenv.config();

const connectDB = require('./src/config/db');

const app = express();

// Body Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS
app.use(cors());
// Database Connection Middleware for API Routes
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mount API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/transactions', require('./src/routes/transactionRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for Page routing: route non-API paths to corresponding frontend HTML files if they exist, or index.html
app.use((req, res) => {
  // If request is for an API endpoint that doesn't exist, return 404
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
  }
  // Otherwise serve index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Export the Express API for Vercel
module.exports = app;
