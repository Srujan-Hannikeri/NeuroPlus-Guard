const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');

// Get room state
router.get('/:roomId', protect, async (req, res) => {
  try {
    let room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      room = await Room.create({ roomId: req.params.roomId });
    } else {
      let updated = false;
      room.messages.forEach(msg => {
        if (msg.senderId !== req.user._id.toString() && !msg.seen) {
          msg.seen = true;
          updated = true;
        }
      });
      if (updated) {
        await room.save();
      }
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update SDP Offer or Answer or Clear Signal State
router.post('/:roomId/signal', protect, async (req, res) => {
  try {
    const { offer, answer, candidate, clearSignal } = req.body;
    let room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) room = new Room({ roomId: req.params.roomId });

    if (clearSignal) {
      room.offer = undefined;
      room.answer = undefined;
      room.iceCandidates = [];
    } else {
      if (offer) room.offer = offer;
      if (answer) room.answer = answer;
      if (candidate) {
        room.iceCandidates.push({
          senderId: req.user._id,
          candidate
        });
      }
    }

    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post a chat message
router.post('/:roomId/message', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    room.messages.push({
      senderId: req.user._id,
      senderRole: req.user.role,
      text
    });

    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Heartbeat — called by frontend every 20s to mark user as online
router.post('/heartbeat', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastActive: new Date() });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get list of online user IDs (seen in last 30s)
router.get('/online-users', protect, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30000);
    const onlineUsers = await User.find({ lastActive: { $gte: cutoff } }, '_id');
    const online = onlineUsers.map(u => u._id.toString());
    res.json({ onlineUserIds: online });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
