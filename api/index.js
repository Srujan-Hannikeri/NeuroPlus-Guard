require('dotenv').config();

// Fallback environment variables for Vercel deployment
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb+srv://srujanhannikeri_db_user:srujan0513@cluster0.lrakyrl.mongodb.net/neuroplus?retryWrites=true&w=majority';
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
const http = require('http');
const connectDB = require('../backend/config/db');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Route files
const authRoutes = require('../backend/routes/authRoutes');
const doctorRoutes = require('../backend/routes/doctorRoutes');
const appointmentRoutes = require('../backend/routes/appointmentRoutes');
const reportRoutes = require('../backend/routes/reportRoutes');
const aiRoutes = require('../backend/routes/aiRoutes');
const prescriptionRoutes = require('../backend/routes/prescriptionRoutes');
const communicationRoutes = require('../backend/routes/communicationRoutes');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors()); // Handle preflight requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(process.env.VERCEL ? '/tmp/uploads' : 'uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/communication', communicationRoutes);

// Health check — visit /api/health on Vercel to diagnose DB connection
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const state = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    database: stateMap[state] || 'unknown',
    mongo_uri_set: !!process.env.MONGO_URI,
    jwt_secret_set: !!process.env.JWT_SECRET,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => res.send('NeuroPlus Guard API is running...'));

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
