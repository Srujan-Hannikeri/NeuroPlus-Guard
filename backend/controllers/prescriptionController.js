const Prescription = require('../models/Prescription');

// Utility to automatically mark unlogged dosages older than 4 hours past deadline as "Missed"
const autoMarkMissedDosages = async (userId) => {
  try {
    const prescriptions = await Prescription.find({ patient: userId, isActive: true });
    const now = new Date();
    
    for (let prescription of prescriptions) {
      let updated = false;
      const createdAt = new Date(prescription.createdAt);
      
      // Determine max duration of any medicine
      const maxDuration = Math.max(...prescription.medicines.map(m => m.durationDays), 1);
      
      // Loop over all days from prescription start date up to today
      for (let day = 0; day < maxDuration; day++) {
        const targetDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate() + day);
        const targetDateStr = targetDate.toISOString().split('T')[0];
        
        // Skip if targetDate itself is in the future
        if (targetDate.getTime() > new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
          continue;
        }
        
        const timesOfDay = ['Morning', 'Afternoon', 'Night'];
        for (const time of timesOfDay) {
          const isRequired = prescription.medicines.some(m => 
            (time === 'Morning' && m.morning) ||
            (time === 'Afternoon' && m.afternoon) ||
            (time === 'Night' && m.night)
          );
          
          if (isRequired) {
            const deadline = new Date(targetDate);
            if (time === 'Morning') {
              deadline.setHours(12, 0, 0, 0); // 8:00 AM + 4 hrs
            } else if (time === 'Afternoon') {
              deadline.setHours(17, 0, 0, 0); // 1:00 PM + 4 hrs
            } else if (time === 'Night') {
              deadline.setHours(24, 0, 0, 0); // 8:00 PM + 4 hrs
            }
            
            // If the deadline has already passed
            if (now.getTime() > deadline.getTime()) {
              // Check if there is already a log for this target date and time
              const hasLog = prescription.history.some(h => {
                const hDateStr = new Date(h.date).toISOString().split('T')[0];
                return hDateStr === targetDateStr && h.timeOfDay === time;
              });
              
              if (!hasLog) {
                // Mark as missed automatically
                prescription.history.push({
                  date: deadline,
                  timeOfDay: time,
                  status: 'Missed'
                });
                updated = true;
              }
            }
          }
        }
      }
      
      if (updated) {
        await prescription.save();
      }
    }
  } catch (err) {
    console.error('Failed to auto-mark missed dosages:', err);
  }
};

exports.createPrescription = async (req, res) => {
  try {
    const { patientId, medicines } = req.body;
    
    const Appointment = require('../models/Appointment');
    const completedAppointment = await Appointment.findOne({
      doctor: req.user._id,
      patient: patientId,
      status: 'Completed'
    });
    if (!completedAppointment) {
      return res.status(400).json({ message: 'You can only create prescriptions for patients after their appointment is completed (consulted).' });
    }
    
    const prescription = await Prescription.create({
      patient: patientId,
      doctor: req.user._id,
      medicines
    });
    
    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPrescriptions = async (req, res) => {
  try {
    const isDoctor = req.user.role === 'Doctor';
    const query = isDoctor ? { doctor: req.user._id } : { patient: req.user._id };
    
    // Auto-mark missed dosages before returning prescriptions
    if (isDoctor) {
      const patientIds = await Prescription.distinct('patient', { doctor: req.user._id });
      for (const pId of patientIds) {
        await autoMarkMissedDosages(pId);
      }
    } else {
      await autoMarkMissedDosages(req.user._id);
    }
    
    const prescriptions = await Prescription.find(query)
      .populate('patient', 'name')
      .populate('doctor', 'name')
      .sort({ createdAt: -1 });
      
    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, timeOfDay } = req.body; // status: 'Taken' or 'Missed', timeOfDay: 'Morning', 'Afternoon', 'Night'
    
    // Auto-mark missed dosages first to keep compliance history clean
    await autoMarkMissedDosages(req.user._id);
    
    const prescription = await Prescription.findOne({ _id: id, patient: req.user._id });
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    
    // Add to history
    prescription.history.push({
      date: new Date(),
      timeOfDay,
      status
    });
    
    await prescription.save();
    
    // If missed, simulate sending SMS to doctor
    if (status === 'Missed') {
       console.log(`[SIMULATED SMS] Alert Doctor: Patient ${req.user.name} missed their ${timeOfDay} medication dose.`);
    }

    res.json(prescription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.autoMarkMissedDosages = autoMarkMissedDosages;
