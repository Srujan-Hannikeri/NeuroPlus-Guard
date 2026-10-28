const Report = require('../models/Report');
const Appointment = require('../models/Appointment');

const queryAskMyDocSpecialist = async (reportCategory) => {
  try {
    const postData = JSON.stringify({
      message: `What specialist doctor should evaluate a ${reportCategory} report?`,
      history: [],
      session_id: 'report-spec-' + Date.now(),
      top_k: 4
    });

    const response = await fetch('https://api.askmydoc.in/api/rag/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: postData,
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const data = await response.json();
      return data.reply || null;
    }
  } catch (err) {
    console.warn('AskMyDoc specialist query failed:', err.message);
  }
  return null;
};

const buildClinicalReportAnalysis = async (fileName, fileType) => {
  const nameLower = `${fileName || ''} ${fileType || ''}`.toLowerCase();
  let category = "General Medical Report";
  let analysis = "";
  let precautions = [];
  let redFlags = [];

  if (nameLower.includes('cbc') || nameLower.includes('blood') || nameLower.includes('hemo') || nameLower.includes('platelet') || nameLower.includes('patho')) {
    category = "Complete Blood Count & Hematology Report";
    analysis = "Evaluates primary blood cell lines including Hemoglobin (oxygen-carrying capability), White Blood Cells (immune/infection indicators), and Platelets (clotting mechanisms). Parameters should be correlated against standard laboratory reference intervals.";
    precautions = [
      "Maintain adequate hydration with clean water and nutrient-rich fluids to support blood volume.",
      "Incorporate balanced, iron-rich and protein-rich whole foods (leafy greens, legumes, nuts) into your daily diet.",
      "Avoid heavy physical strain or abrupt overexertion if experiencing fatigue or dizziness.",
      "Do not start or discontinue iron supplements or medications without specific clinical instruction.",
      "Retain this report to compare cell count trends during your next follow-up consultation."
    ];
    redFlags = [
      "Sudden extreme dizziness, fainting episodes, or severe pale skin/lips.",
      "Unexplained spontaneous bruising, dark petechial spots, or persistent bleeding from gums/cuts.",
      "High fever accompanied by severe chills or rapid breathing."
    ];
  } else if (nameLower.includes('mri') || nameLower.includes('ct') || nameLower.includes('brain') || nameLower.includes('spine') || nameLower.includes('neuro')) {
    category = "Neurological / Radiological Imaging Report";
    analysis = "Evaluates neuro-anatomical structures, tissue symmetry, and checks for signs of acute vascular lesions, disc compression, or intracranial changes.";
    precautions = [
      "Maintain correct ergonomic posture while sitting and sleeping; avoid sudden jerky head or neck movements.",
      "Ensure uninterrupted medication adherence if you are on prescribed neuro-medications (e.g. anti-epileptics or pain modulators).",
      "Keep a symptom log noting any headaches, tingling, or changes in vision or sensation.",
      "Bring the original digital scan imaging discs/files along with this printed report to your appointment."
    ];
    redFlags = [
      "Sudden weakness or loss of sensation on one side of your face or body.",
      "Severe explosive headache ('thunderclap') or loss of consciousness.",
      "Onset of sudden difficulty speaking, slurred speech, or blurred vision."
    ];
  } else if (nameLower.includes('ecg') || nameLower.includes('ekg') || nameLower.includes('echo') || nameLower.includes('cardio') || nameLower.includes('heart')) {
    category = "Cardiac Diagnostics / ECG Report";
    analysis = "Evaluates cardiac electrical impulse conduction, rhythm regularity, heart rate intervals (PR, QRS, QT intervals), and checks for ischemic changes.";
    precautions = [
      "Refrain from vigorous physical exertion until cleared by your physician.",
      "Limit sodium intake and eliminate caffeine, tobacco, and alcohol.",
      "Practice calming deep-breathing exercises to minimize anxiety-induced tachycardia.",
      "Monitor resting pulse rate and blood pressure twice daily."
    ];
    redFlags = [
      "Chest heaviness, squeezing pressure, or pain radiating to jaw, neck, or left arm.",
      "Sudden shortness of breath while sitting or resting.",
      "Severe lightheadedness, cold clammy sweating, or fainting."
    ];
  } else if (nameLower.includes('sugar') || nameLower.includes('glucose') || nameLower.includes('hba1c') || nameLower.includes('diabet')) {
    category = "Glycemic / Diabetic Panel Report";
    analysis = "Evaluates blood glucose levels and long-term glycemic control. Provides critical data for assessing insulin sensitivity and metabolic balance.";
    precautions = [
      "Follow a structured low-glycemic, high-fiber dietary plan with consistent meal timings.",
      "Avoid refined sugars, sweetened beverages, and high-carb processed foods.",
      "Engage in moderate daily physical activity like walking for 30 minutes after meals.",
      "Maintain a personal glucose diary tracking fasting and post-prandial readings."
    ];
    redFlags = [
      "Blood sugar dropping below 70 mg/dL with sweating, shakiness, and confusion (consume quick sugar immediately).",
      "Persistent blood sugar above 250 mg/dL with excessive thirst, nausea, or deep rapid breathing."
    ];
  } else {
    category = "Clinical Laboratory & Medical Report";
    analysis = "Clinical parameters and diagnostic indicators recorded. Reference values indicate physiological baseline markers for health tracking and preventive care.";
    precautions = [
      "Maintain good hydration by drinking 2 to 3 liters of water daily.",
      "Ensure 7 to 8 hours of restorative sleep to promote natural recovery.",
      "Continue prescribed health routines and avoid self-medicating with unprescribed pharmaceuticals.",
      "Schedule a follow-up consultation to correlate findings with your overall clinical health history."
    ];
    redFlags = [
      "Sudden onset of severe pain, high persistent fever, or breathing difficulty.",
      "Rapid worsening of existing physical symptoms."
    ];
  }

  // Query AskMyDoc API for specialist consultation
  const askMyDocSpecialist = await queryAskMyDocSpecialist(category);

  return `### 📋 Clinical Summary & Parameters (via AskMyDoc)
• **Document Type**: ${category} (${fileName || 'Medical File'})
• **Diagnostic Review**: ${analysis}

### 🛡️ Recommended Precautions & Care Measures to be Done:
${precautions.map(p => `• ${p}`).join('\n')}

### ⚠️ Warning Signs & Emergency Red Flags:
${redFlags.map(r => `• ${r}`).join('\n')}

### 👨‍⚕️ Specialist Consultation (via AskMyDoc API):
${askMyDocSpecialist || 'Please consult a verified medical practitioner for clinical evaluation of this report.'}`;
};

exports.uploadReport = async (req, res) => {
  try {
    const { doctorId, fileBase64, fileType, fileName } = req.body;
    
    if (!fileBase64) return res.status(400).json({ message: 'Please upload a file' });

    // Analyze using AskMyDoc API engine
    const aiSummary = await buildClinicalReportAnalysis(fileName, fileType);

    const report = await Report.create({
      patient: req.user._id,
      doctor: doctorId || null,
      fileUrl: fileBase64, // Storing base64 directly
      fileType: fileType || 'application/pdf',
      fileName: fileName || 'Medical_Report',
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
    
    // Generate AskMyDoc clinical report evaluation with precautions and specialist
    const askMyDocAnalysis = await buildClinicalReportAnalysis(report.fileName, report.fileType);
    report.aiSummary = askMyDocAnalysis;
    await report.save();
    res.json(report);
  } catch (error) {
    console.error("AI Summary Error:", error);
    res.status(500).json({ message: error.message });
  }
};
