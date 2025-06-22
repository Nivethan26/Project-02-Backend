const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
require("dotenv").config(); // Load .env

// Check required environment variables
// if (!process.env.JWT_SECRET) {
//   console.error('JWT_SECRET is not defined in environment variables');
//   process.exit(1);
// }

// if (!process.env.MONGO_URI) {
//   console.error('MONGO_URI is not defined in environment variables');
//   process.exit(1);
// }

// Set default values for testing
process.env.JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-for-testing';
process.env.MONGO_URI = process.env.MONGO_URI;

const connectDB = require("./config/db");
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const prescriptionRoutes = require('./routes/prescription');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/inventory', inventoryRoutes);  // Admin inventory CRUD operations
app.use('/api/staff/inventory', inventoryRoutes);  // Staff inventory view access
app.use('/api/staff/orders', orderRoutes);  // Staff order operations (including POS)
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);  // Public product routes
app.use('/api/doctor', doctorRoutes);

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8000
  });
});

// Debug route to list all registered routes
app.get('/api/debug/routes', (req, res) => {
  try {
    const routes = [];
    
    // Get all registered routes from the app
    if (app._router && app._router.stack) {
      app._router.stack.forEach(middleware => {
        if (middleware.route) {
          // Direct routes
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods)
          });
        } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
          // Router middleware
          middleware.handle.stack.forEach(handler => {
            if (handler.route) {
              routes.push({
                path: middleware.regexp ? middleware.regexp.source.replace(/\\\//g, '/').replace(/\\/g, '') + handler.route.path : handler.route.path,
                methods: Object.keys(handler.route.methods)
              });
            }
          });
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Registered routes',
      routes: routes,
      totalRoutes: routes.length,
      timestamp: new Date().toISOString(),
      serverStatus: 'running'
    });
  } catch (error) {
    console.error('Error in debug route:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting routes',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Sample route
app.get("/", (req, res) => {
  res.send("Smart Pharmacy API is running...");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});
