const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  // If we already have a ready connection, reuse it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: true,
    });
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Don't cache failed connections
    cachedConnection = null;
    throw error;
  }
};

module.exports = connectDB;
