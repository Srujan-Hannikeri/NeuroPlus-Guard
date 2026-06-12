const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: false },
  status: { type: String, enum: ['Pending', 'Accepted', 'Completed', 'Rejected'], default: 'Pending' },
  notes: { type: String },
  isEmergency: { type: Boolean, default: false },
  feeAmount: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  feeStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
  feeHistory: [{
    amount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
    date: { type: Date, default: Date.now }
  }],
  callNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
