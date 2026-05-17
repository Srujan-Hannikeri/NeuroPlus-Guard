const express = require('express');
const { uploadReport, getReports } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const router = express.Router();

router.post('/upload', protect, uploadReport);
router.get('/', protect, getReports);
router.put('/:id/summary', protect, require('../controllers/reportController').generateAiSummary);

module.exports = router;
