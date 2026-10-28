const express = require('express');
const { register, login, verifyOtp, forgotPassword, resetPassword, verifyDoctorCredentials } = require('../controllers/authController');
const router = express.Router();

const { protect } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-doctor', verifyDoctorCredentials);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/profile', protect, require('../controllers/authController').updateProfile);

module.exports = router;
