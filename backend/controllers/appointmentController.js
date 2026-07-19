const Appointment = require('../models/Appointment');
const https = require('https');
const Room = require('../models/Room');
const User = require('../models/User');

const verifyPaymentWithGateway = (paymentData) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      gateway: 'MockPay',
      amount: paymentData.amount,
      method: paymentData.method,
      details: paymentData.details,
      timestamp: Date.now()
    });

    const options = {
      hostname: 'httpbin.org',
      port: 443,
      path: '/post',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          // If response is 200, we consider HTTPS transaction recorded.
          // Now, check payment details for business logic validation:
          if (paymentData.method === 'card') {
            const cvv = String(paymentData.details.cvv || '').trim();
            if (cvv === '000' || cvv === '999') {
              return resolve({ success: false, message: 'Card declined by issuing bank (CVV rejected).' });
            }
            const name = String(paymentData.details.cardName || '').toLowerCase();
            if (name.includes('decline') || name.includes('fail')) {
              return resolve({ success: false, message: 'Card declined: Insufficient funds.' });
            }
          } else if (paymentData.method === 'upi') {
            const upiId = String(paymentData.details.upiId || '').toLowerCase().trim();
            if (upiId.includes('fail') || upiId.includes('decline')) {
              return resolve({ success: false, message: 'UPI transaction rejected by bank.' });
            }
          } else if (paymentData.method === 'netbanking') {
            const bank = String(paymentData.details.bank || '').trim();
            if (bank.toLowerCase().includes('fail') || bank.toLowerCase().includes('decline')) {
              return resolve({ success: false, message: 'NetBanking authentication failed.' });
            }
          }
          
          resolve({ success: true, transactionId: 'TXN' + Math.floor(Math.random() * 90000000 + 10000000) });
        } catch (e) {
          resolve({ success: false, message: 'Failed to process gateway response.' });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, message: 'Payment gateway connection timeout: ' + err.message });
    });

    req.write(payload);
    req.end();
  });
};

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

exports.createAppointmentByDoctor = async (req, res) => {
  try {
    if (req.user.role !== 'Doctor') {
      return res.status(403).json({ message: 'Only Doctors can directly create appointments.' });
    }
    const { patientId, notes, scheduledAt, feeAmount } = req.body;
    
    // Convert to local time mimicking the frontend input
    let localDate = null;
    if (scheduledAt) {
      const utcDate = new Date(scheduledAt);
      localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
    }
    
    const appointment = await Appointment.create({
      patient: patientId,
      doctor: req.user._id,
      notes: notes || 'Doctor initiated consultation',
      scheduledAt: localDate,
      feeAmount: feeAmount || 0,
      feeStatus: feeAmount > 0 ? 'Pending' : 'Paid',
      amountPaid: 0,
      status: 'Accepted'
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

    // Convert scheduledAt string (from datetime-local) to a Date preserving the local time
    // datetime-local returns a value like "2026-06-19T20:00" which is interpreted as UTC by new Date().
    // To keep the time as entered by the user (local), we offset it by the client’s timezone offset.
    if (scheduledAt) {
      const utcDate = new Date(scheduledAt);
      const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
      appointment.scheduledAt = localDate;
    }


    // When accepting a pending appointment, ensure a scheduled date is provided
    if (status === 'Accepted' && !appointment.scheduledAt) {
      return res.status(400).json({ message: 'A scheduled date and time is required to accept an appointment.' });
    }

    // Only update status if the client sent a new status value
    if (typeof status !== 'undefined') {
      appointment.status = status;
    }
    if (meetingLink) appointment.meetingLink = meetingLink;
    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// New helper for explicit rescheduling (doctor only)
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    const appointment = await Appointment.findOne({ _id: id, doctor: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found or unauthorized' });
    if (!scheduledAt) return res.status(400).json({ message: 'scheduledAt is required for rescheduling.' });
    const utcDate = new Date(scheduledAt);
    const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
    appointment.scheduledAt = localDate;
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
    
    let appointments = await Appointment.find(query)
      .populate('patient', 'name profilePic')
      .populate('doctor', 'name specialization upiQrCode upiId profilePic');
    
    if (!isDoctor) {
      appointments = appointments.filter(appt => appt.doctor && appt.doctor._id);
    }

    // Sort logically by urgency, status, and dates
    const getGroupValue = (appt) => {
      if (appt.isEmergency && appt.status !== 'Completed' && appt.status !== 'Rejected') return 1;
      if (appt.status === 'Pending') return 2;
      if (appt.status === 'Accepted') return 3;
      if (appt.status === 'Completed') return 4;
      return 5; // Rejected
    };

    appointments.sort((a, b) => {
      const groupA = getGroupValue(a);
      const groupB = getGroupValue(b);
      
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      
      if (groupA === 1 || groupA === 2) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      
      if (groupA === 3) {
        return new Date(a.scheduledAt) - new Date(b.scheduledAt);
      }
      
      if (groupA === 4) {
        return new Date(b.scheduledAt) - new Date(a.scheduledAt);
      }
      
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

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

    const feeVal = Number(feeAmount);
    if (!isNaN(feeVal) && feeVal > 0) {
      appointment.feeAmount = (appointment.feeAmount || 0) + feeVal;
      appointment.feeStatus = appointment.amountPaid >= appointment.feeAmount ? 'Paid' : (appointment.amountPaid > 0 ? 'Partial' : 'Pending');
      
      appointment.feeHistory.push({
        amount: feeVal,
        amountPaid: 0,
        status: 'Pending',
        date: new Date()
      });
    }

    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.payAppointmentFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, feeId, paymentMethod, paymentDetails } = req.body;
    
    if (!paymentMethod || !paymentDetails) {
      return res.status(400).json({ message: 'Payment method and transaction details are required.' });
    }
    
    const gateResult = await verifyPaymentWithGateway({
      amount,
      method: paymentMethod,
      details: paymentDetails
    });
    
    if (!gateResult.success) {
      return res.status(400).json({ message: gateResult.message });
    }
    
    // Patient marks fee as paid
    const appointment = await Appointment.findOne({ _id: id, patient: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found or unauthorized' });

    const paymentAmount = Number(amount) || 0;
    
    if (feeId && appointment.feeHistory && appointment.feeHistory.length > 0) {
      const feeRecord = appointment.feeHistory.id(feeId);
      if (feeRecord) {
        feeRecord.amountPaid += paymentAmount;
        if (feeRecord.amountPaid >= feeRecord.amount) feeRecord.status = 'Paid';
        else if (feeRecord.amountPaid > 0) feeRecord.status = 'Partial';
      }
    }

    appointment.amountPaid += paymentAmount;

    if (appointment.amountPaid >= appointment.feeAmount) {
      appointment.feeStatus = 'Paid';
    } else if (appointment.amountPaid > 0) {
      appointment.feeStatus = 'Partial';
    }

    await appointment.save();

    // Append a message of type 'payment' to the communication room so the doctor receives a message
    try {
      let room = await Room.findOne({ roomId: `room-${appointment._id}` });
      if (!room) {
        room = new Room({ roomId: `room-${appointment._id}` });
      }
      room.messages.push({
        senderId: req.user._id,
        senderRole: req.user.role,
        text: `💳 Payment of ₹${paymentAmount} completed successfully via ${paymentMethod || 'bank transfer'}.`,
        type: 'payment',
        seen: false,
        createdAt: new Date()
      });
      await room.save();
    } catch (e) {
      console.error("Error creating payment message in room:", e);
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
