const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicines: [{
    name: { type: String, required: true },
    numberOfTablets: { type: Number, required: true },
    morning: { type: Boolean, default: false },
    afternoon: { type: Boolean, default: false },
    night: { type: Boolean, default: false },
    durationDays: { type: Number, required: true }
  }],
  history: [{
    date: { type: Date, required: true },
    timeOfDay: { type: String, enum: ['Morning', 'Afternoon', 'Night'], required: true },
    status: { type: String, enum: ['Taken', 'Missed'], required: true }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
