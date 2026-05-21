const Appointment = require('../models/Appointment');

exports.requestAppointment = async (req, res) => {
  try {
    const { doctorId, notes, isEmergency } = req.body;
    
    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      notes,
      isEmergency,
      status: 'Pending'
    });
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, scheduledAt, meetingLink } = req.body;
    
    const appointment = await Appointment.findOne({ _id: id, doctor: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found or unauthorized' });

    if (status === 'Accepted') {
      if (!scheduledAt) return res.status(400).json({ message: 'A scheduled date and time is required to accept an appointment.' });
      
      const scheduledDate = new Date(scheduledAt);
      if (appointment.isEmergency) {
        const timeDiff = scheduledDate.getTime() - Date.now();
        const hoursDiff = timeDiff / (1000 * 3600);
        if (hoursDiff > 24) {
          return res.status(400).json({ message: 'Emergency appointments must be scheduled within 24 hours.' });
        }
      }
      appointment.scheduledAt = scheduledDate;
    }

    appointment.status = status;
    if (meetingLink) appointment.meetingLink = meetingLink;
    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const isDoctor = req.user.role === 'Doctor';
    const query = isDoctor ? { doctor: req.user._id } : { patient: req.user._id };
    
    // Sort by updatedAt descending
    let appointments = await Appointment.find(query)
      .populate('patient', 'name profilePic')
      .populate('doctor', 'name specialization upiQrCode upiId profilePic')
      .sort({ updatedAt: -1 });
    
    if (!isDoctor) {
      appointments = appointments.filter(appt => appt.doctor && appt.doctor._id);
    }

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAppointmentFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { feeAmount } = req.body;
    
    const appointment = await Appointment.findOne({ _id: id, doctor: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found or unauthorized' });

    appointment.feeAmount = feeAmount;
    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.payAppointmentFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    // Patient marks fee as paid
    const appointment = await Appointment.findOne({ _id: id, patient: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found or unauthorized' });

    const paymentAmount = Number(amount) || 0;
    appointment.amountPaid += paymentAmount;

    if (appointment.amountPaid >= appointment.feeAmount) {
      appointment.feeStatus = 'Paid';
    } else if (appointment.amountPaid > 0) {
      appointment.feeStatus = 'Partial';
    }

    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
