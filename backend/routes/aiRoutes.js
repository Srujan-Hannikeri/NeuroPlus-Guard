const express = require('express');
const { chatWithAI } = require('../controllers/aiController');
const upload = require('../middlewares/uploadMiddleware');
const router = express.Router();

router.post('/chat', chatWithAI);

module.exports = router;
