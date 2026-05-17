require('dotenv').config();
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
app.use(cors());
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

app.get('/', (req, res) => res.send('NeuroPlus Guard API is running...'));

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
