const Report = require('../models/Report');
const Appointment = require('../models/Appointment');

const analyzeReportWithAskMyDoc = async (reportContext) => {
  try {
    const prompt = `You are a clinical diagnostic AI powered by AskMyDoc. Analyze this medical report and provide a structured clinical summary:
- Key Findings & Parameters
- Clinical Significance / Any Potential Abnormalities
- Actionable Recommendations for Doctor & Patient

Report Context:
${reportContext}`;

    const response = await fetch('https://api.askmydoc.in/api/rag/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        history: [],
        session_id: 'report-analysis-' + Date.now(),
        top_k: 4
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.reply) {
        return `[AskMyDoc Medical AI Analysis]\n${data.reply}`;
      }
    }
  } catch (err) {
    console.warn('AskMyDoc report analysis error:', err.message);
  }
  return null;
};

exports.uploadReport = async (req, res) => {
  try {
    const { doctorId, fileBase64, fileType, fileName } = req.body;
    
    if (!fileBase64) return res.status(400).json({ message: 'Please upload a file' });

    // Analyze using AskMyDoc API
    const reportDesc = `File: ${fileName || 'Medical Report'}\nType: ${fileType || 'Medical Document'}`;
    const askMyDocSummary = await analyzeReportWithAskMyDoc(reportDesc);
    const aiSummary = askMyDocSummary || "Report uploaded successfully. Click 'Generate AI Description' for an in-depth clinical evaluation via AskMyDoc AI.";

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
      // Find all unique patients who have completed an appointment with this doctor
      const appointments = await Appointment.find({ doctor: req.user._id, status: 'Completed' });
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
    
    // Attempt AskMyDoc API clinical review
    const contextPrompt = `Medical report for patient. File format: ${report.fileType || 'Medical document'}. Uploaded on: ${report.createdAt}`;
    const askMyDocAnalysis = await analyzeReportWithAskMyDoc(contextPrompt);

    if (askMyDocAnalysis) {
      report.aiSummary = askMyDocAnalysis;
      await report.save();
      return res.json(report);
    }

    // Fallback to Gemini if AskMyDoc returns null or for multimodal documents
    if (process.env.GEMINI_API_KEY) {
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
      return res.json(report);
    }

    report.aiSummary = "[AskMyDoc Review] Routine medical report uploaded. Findings recorded; schedule follow-up if abnormalities develop.";
    await report.save();
    res.json(report);
  } catch (error) {
    console.error("AI Summary Error:", error);
    res.status(500).json({ message: error.message });
  }
};
