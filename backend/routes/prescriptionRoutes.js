const express = require('express');
const { createPrescription, getPrescriptions, updateStatus } = require('../controllers/prescriptionController');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/', protect, createPrescription);
router.get('/', protect, getPrescriptions);
router.put('/:id/status', protect, updateStatus);

module.exports = router;
