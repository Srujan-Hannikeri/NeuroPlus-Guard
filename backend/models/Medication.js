const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineName: { type: String, required: true },
  dosage: { type: String },
  time: [{ type: String }], // e.g. ["08:00", "20:00"]
  history: [{
    date: { type: Date },
    taken: { type: Boolean, default: false }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Medication', medicationSchema);
