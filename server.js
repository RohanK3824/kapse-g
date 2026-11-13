require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const customerRoutes = require('./routes/customerRoutes');
const mysqlService = require('./services/mysqlService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', customerRoutes);

// Serve built React frontend in production (dist directory)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for client-side React routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, 'index.html');
    return res.sendFile(indexPath, (err) => {
      if (err) {
        // If dist hasn't been built yet, show helpful info
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head><title>TailorPro - React & MySQL</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>TailorPro Server Running (React + MySQL Backend)</h2>
            <p>API is active at <code>http://localhost:${PORT}/api/customers</code></p>
            <p>Please build the React frontend with <code>npm run build</code> or run Vite in development mode with <code>npm run dev</code>.</p>
          </body>
          </html>
        `);
      }
    });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Start Server
async function startServer() {
  try {
    console.log('Connecting to MySQL database...');
    await mysqlService.initDatabase();

    app.listen(PORT, () => {
      console.log('==================================================');
      console.log(' ✂️  TAILOR SHOP REACT + MYSQL MANAGEMENT SYSTEM  ✂️ ');
      console.log('==================================================');
      console.log(`Backend Server: http://localhost:${PORT}`);
      console.log(`Database Host:  ${mysqlService.DB_CONFIG.host}:${mysqlService.DB_CONFIG.port}`);
      console.log(`Database Name:  ${mysqlService.DB_CONFIG.database}`);
      console.log(`Database User:  ${mysqlService.DB_CONFIG.user}`);
      console.log('==================================================');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
