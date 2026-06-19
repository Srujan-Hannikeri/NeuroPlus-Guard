const express = require('express');
const { requestAppointment, updateAppointmentStatus, getAppointments, updateAppointmentFee, payAppointmentFee, rescheduleAppointment } = require('../controllers/appointmentController');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();
router.put('/:id/reschedule', protect, rescheduleAppointment);
router.post('/request', protect, requestAppointment);
router.put('/:id/status', protect, updateAppointmentStatus);
router.put('/:id/fee', protect, updateAppointmentFee);
router.put('/:id/pay', protect, payAppointmentFee);
router.get('/me', protect, getAppointments);
router.get('/', protect, getAppointments);

module.exports = router;
