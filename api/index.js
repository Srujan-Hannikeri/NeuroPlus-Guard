require('dotenv').config();

// Fallback and validation for database environment variables
const correctMongoUri = 'mongodb+srv://srujanhannikeri_db_user:srujan0513@cluster0.lrakyrl.mongodb.net/neuroplus?retryWrites=true&w=majority';

// On Vercel, always force the correct connection string to prevent environment variable configuration issues.
// Locally, allow using the value from the local .env file.
if (process.env.VERCEL || !process.env.MONGO_URI) {
  process.env.MONGO_URI = correctMongoUri;
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'neuroplusguardsecret123';
}
if (!process.env.JWT_EXPIRES_IN) {
  process.env.JWT_EXPIRES_IN = '30d';
}
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'AIzaSyCzlrZwPbdj0Je9U_83nW4fL6qfkmK5xK4';
}

const express = require('express');
const cors = require('cors');
const connectDB = require('../backend/config/db');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

let routesLoaded = false;
let routeLoadError = null;

// Pre-load all route modules to catch import errors early
let authRoutes, doctorRoutes, appointmentRoutes, reportRoutes, aiRoutes, prescriptionRoutes, communicationRoutes;
try {
  authRoutes = require('../backend/routes/authRoutes');
  doctorRoutes = require('../backend/routes/doctorRoutes');
  appointmentRoutes = require('../backend/routes/appointmentRoutes');
  reportRoutes = require('../backend/routes/reportRoutes');
  aiRoutes = require('../backend/routes/aiRoutes');
  prescriptionRoutes = require('../backend/routes/prescriptionRoutes');
  communicationRoutes = require('../backend/routes/communicationRoutes');
  routesLoaded = true;
} catch (err) {
  routeLoadError = err.message;
  console.error('Failed to load route modules:', err);
}

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('/*any', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(process.env.VERCEL ? '/tmp/uploads' : 'uploads'));

// Health check BEFORE database middleware — always accessible for diagnostics
app.get('/api/health', async (req, res) => {
  const mongoose = connectDB.mongoose || require('mongoose');
  let dbError = null;
  
  // Try connecting if not connected
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      dbError = err.message;
    }
  }
  
  const state = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  
  res.json({
    version: '1.0.3',
    status: state === 1 ? 'healthy' : 'unhealthy',
    database: stateMap[state] || 'unknown',
    dbError: dbError,
    routesLoaded: routesLoaded,
    routeLoadError: routeLoadError,
    env: {
      mongo_uri_set: !!process.env.MONGO_URI,
      mongo_uri_preview: process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 30) + '...' : 'NOT SET',
      mongo_uri_secure: (() => {
        if (!process.env.MONGO_URI) return 'NOT SET';
        try {
          const urlObj = new URL(process.env.MONGO_URI);
          urlObj.password = '***';
          return urlObj.toString();
        } catch (e) {
          return 'MALFORMED: ' + process.env.MONGO_URI.replace(/\/\/([^:]+):([^@\s/]+)/, '//***:***');
        }
      })(),
      jwt_secret_set: !!process.env.JWT_SECRET,
      node_env: process.env.NODE_ENV || 'not set',
      vercel: !!process.env.VERCEL,
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => res.send('NeuroPlus Guard API is running...'));

// Database connection middleware — ensures DB is ready before any API route
app.use('/api', async (req, res, next) => {
  // Skip for health check (already handled above)
  if (req.path === '/health') return next();
  
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Routes — only mount if they loaded successfully
if (routesLoaded) {
  app.use('/api/auth', authRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);
  app.use('/api/communication', communicationRoutes);
} else {
  // If routes failed to load, return the error for any API request
  app.use('/api', (req, res) => {
    res.status(500).json({ 
      message: 'Server failed to initialize routes', 
      error: routeLoadError 
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  const http = require('http');
  const server = http.createServer(app);
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
