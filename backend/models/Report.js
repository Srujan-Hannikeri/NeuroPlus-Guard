const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileUrl: { type: String, required: true }, // Placeholder for S3 or local path
  fileType: { type: String },
  fileName: { type: String },
  reportTitle: { type: String },
  category: { type: String },
  notes: { type: String },
  aiSummary: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
