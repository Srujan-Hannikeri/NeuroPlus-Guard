const express = require('express');
const { getDoctors, getDoctorDashboard, updateProfile } = require('../controllers/doctorController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const router = express.Router();

router.get('/', getDoctors);
router.get('/dashboard', protect, authorize('Doctor'), getDoctorDashboard);
router.put('/profile', protect, authorize('Doctor'), updateProfile);

module.exports = router;
