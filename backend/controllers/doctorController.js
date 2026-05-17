const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Report = require('../models/Report');

exports.getDoctors = async (req, res) => {
  try {
    const { specialization } = req.query;
    // Return all doctors for now to ensure visibility
    let query = { role: 'Doctor' };
    if (specialization) query.specialization = specialization;

    const doctors = await User.find(query).select('-password');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDoctorDashboard = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    // Total Patients: Unique patients who have had an appointment
    const appointments = await Appointment.find({ doctor: doctorId });
    const patientIds = [...new Set(appointments.map(a => a.patient.toString()))];
    
    const pendingRequests = await Appointment.countDocuments({ doctor: doctorId, status: 'Pending' });
    const consultedPatients = await Appointment.countDocuments({ doctor: doctorId, status: 'Completed' });
    
    const recentReports = await Report.find({ doctor: doctorId }).sort('-createdAt').limit(5).populate('patient', 'name');

    res.json({
      totalPatients: patientIds.length,
      pendingRequests,
      consultedPatients,
      recentReports
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { upiId, qrCodeBase64 } = req.body;
    let updateData = { upiId };
    
    if (qrCodeBase64) {
      updateData.upiQrCode = qrCodeBase64;
    }

    const doctor = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
