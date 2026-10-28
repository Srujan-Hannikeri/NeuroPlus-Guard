const Report = require('../models/Report');
const Appointment = require('../models/Appointment');
const { evaluateMedicalCondition } = require('../utils/medicalDoctorService');

const buildClinicalReportAnalysis = async (reportData) => {
  const { category, reportTitle, notes, fileName } = reportData || {};
  
  // Clean filename to extract readable clinical terms
  const cleanFileName = (fileName || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/[0-9a-f]{8,}/gi, '')
    .trim();

  const diseaseOrTitle = (reportTitle && reportTitle !== 'Medical Report' && !reportTitle.startsWith('aa9e'))
    ? reportTitle
    : (cleanFileName || category || 'Medical Diagnostic Report');

  return await evaluateMedicalCondition(diseaseOrTitle, { category, reportTitle: diseaseOrTitle, notes });
};

exports.uploadReport = async (req, res) => {
  try {
    const { doctorId, fileBase64, fileType, fileName, category, reportTitle, notes } = req.body;
    
    if (!fileBase64) return res.status(400).json({ message: 'Please upload a file' });

    const cleanFileName = (fileName || '')
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim();

    const titleToUse = reportTitle || cleanFileName || 'Medical Report';

    // Auto-detect disease, precautions, and targeted doctor suggestion
    const aiSummary = await buildClinicalReportAnalysis({
      category: category || 'Auto-Detect',
      reportTitle: titleToUse,
      notes: notes || '',
      fileName,
      fileType
    });

    // Extract detected disease name from aiSummary to save as clean title
    let detectedDisease = titleToUse;
    const diseaseHeaderMatch = aiSummary.match(/🩺 Disease:\s*([^\n\r]+)/i);
    if (diseaseHeaderMatch && diseaseHeaderMatch[1] && !diseaseHeaderMatch[1].includes('Unrecognized')) {
      detectedDisease = diseaseHeaderMatch[1].trim();
    }

    const report = await Report.create({
      patient: req.user._id,
      doctor: doctorId || null,
      fileUrl: fileBase64,
      fileType: fileType || 'application/pdf',
      fileName: fileName || 'Medical_Report',
      reportTitle: detectedDisease,
      category: category || 'Auto-Detect',
      notes: notes || '',
      aiSummary
    });

    res.status(201).json(report);
  } catch (error) {
    console.error("Upload Report Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const isDoctor = req.user.role === 'Doctor';
    let query = {};
    
    if (isDoctor) {
      const appointments = await Appointment.find({ doctor: req.user._id, status: 'Completed' });
      const patientIds = [...new Set(appointments.map(a => a.patient.toString()))];
      
      query = {
        $or: [
          { doctor: req.user._id },
          { patient: { $in: patientIds } }
        ]
      };
    } else {
      query.patient = req.user._id;
    }

    const reports = await Report.find(query).populate('patient', 'name').populate('doctor', 'name').sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateAiSummary = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    
    const { category, reportTitle, notes } = req.body || {};
    if (category) report.category = category;
    if (reportTitle) report.reportTitle = reportTitle;
    if (notes !== undefined) report.notes = notes;

    // Generate AskMyDoc clinical report evaluation with full parameters
    const askMyDocAnalysis = await buildClinicalReportAnalysis({
      category: report.category,
      reportTitle: report.reportTitle,
      notes: report.notes,
      fileName: report.fileName,
      fileType: report.fileType
    });

    report.aiSummary = askMyDocAnalysis;
    await report.save();
    res.json(report);
  } catch (error) {
    console.error("AI Summary Error:", error);
    res.status(500).json({ message: error.message });
  }
};
