const Prescription = require('../models/Prescription');

exports.createPrescription = async (req, res) => {
  try {
    const { patientId, medicines } = req.body;
    
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
