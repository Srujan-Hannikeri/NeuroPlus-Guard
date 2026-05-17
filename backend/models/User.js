const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Patient', 'Doctor'], required: true },
  isVerified: { type: Boolean, default: false }, // For OTP
  otp: { type: String }, // Temporary storage for OTP
  profilePic: { type: String }, // Base64 image
  
  // Patient Fields
  age: { type: Number },
  bloodGroup: { type: String },

  // Doctor Fields
  specialization: { type: String },
  experience: { type: Number },
  verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Verified' },
  upiId: { type: String },
  upiQrCode: { type: String }, // Path to uploaded QR code image
  verified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
