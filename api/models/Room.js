const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: String,
  senderRole: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const iceCandidateSchema = new mongoose.Schema({
  senderId: String,
  candidate: mongoose.Schema.Types.Mixed
});

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  offer: mongoose.Schema.Types.Mixed,
  answer: mongoose.Schema.Types.Mixed,
  iceCandidates: [iceCandidateSchema],
  messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
