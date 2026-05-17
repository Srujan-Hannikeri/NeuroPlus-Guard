const express = require('express');
const { requestAppointment, updateAppointmentStatus, getAppointments, updateAppointmentFee, payAppointmentFee } = require('../controllers/appointmentController');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/request', protect, requestAppointment);
router.put('/:id/status', protect, updateAppointmentStatus);
router.put('/:id/fee', protect, updateAppointmentFee);
router.put('/:id/pay', protect, payAppointmentFee);
router.get('/', protect, getAppointments);

module.exports = router;
