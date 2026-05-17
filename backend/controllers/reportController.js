const Report = require('../models/Report');
const Appointment = require('../models/Appointment');

exports.uploadReport = async (req, res) => {
  try {
    const { doctorId, fileBase64, fileType, fileName } = req.body;
    
    if (!fileBase64) return res.status(400).json({ message: 'Please upload a file' });

    // Mock AI Analysis
    const aiSummary = "This is an AI generated summary of the report. The patient seems to have normal ranges for standard parameters, but further consultation is recommended.";

    const report = await Report.create({
      patient: req.user._id,
      doctor: doctorId || null,
      fileUrl: fileBase64, // Storing base64 directly
      fileType: fileType || 'application/pdf',
      aiSummary
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const isDoctor = req.user.role === 'Doctor';
    let query = {};
    
    if (isDoctor) {
      // Find all unique patients who have booked an appointment with this doctor
      const appointments = await Appointment.find({ doctor: req.user._id });
      const patientIds = [...new Set(appointments.map(a => a.patient.toString()))];
      
      // If the report explicitly has this doctor, or belongs to a connected patient
      query = {
        $or: [
          { doctor: req.user._id },
          { patient: { $in: patientIds } }
        ]
      };
    } else {
      query.patient = req.user._id;
    }

    const reports = await Report.find(query).populate('patient', 'name').populate('doctor', 'name');
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateAiSummary = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ message: 'GEMINI_API_KEY not configured' });
    }
    
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let contents = ["Please act as a professional medical AI. Analyze this medical report and provide a detailed, easy to understand summary of the findings, pointing out any abnormalities."];
    
    // If it's base64 data
    if (report.fileUrl && report.fileUrl.startsWith('data:')) {
      const mimeType = report.fileUrl.split(';')[0].split(':')[1];
      const base64Data = report.fileUrl.split('base64,')[1];
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });
    
    report.aiSummary = response.text;
    await report.save();
    
    res.json(report);
  } catch (error) {
    console.error("AI Summary Error:", error);
    res.status(500).json({ message: error.message });
  }
};
