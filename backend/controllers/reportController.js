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

const queryReportLLM = async (reportData) => {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const isGroq = apiKey.startsWith('gsk_') || !process.env.OPENAI_API_KEY;
    const endpoint = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions' 
      : 'https://api.openai.com/v1/chat/completions';
    const model = isGroq ? 'qwen/qwen3.8-27b' : 'gpt-4o-mini';

    const systemPrompt = `You are NeuroPlus Medical AI. Provide a SHORT, CONCISE, and direct clinical analysis of this medical report or disease. Keep each section brief (maximum 2-3 short bullet points, no long paragraphs).
Do NOT include markdown hash symbols like ### in your headers. Format strictly as:
📋 Clinical Summary & Parameters (via AskMyDoc):
• Disease / Test: [Name the exact disease or test evaluated]
• Diagnostic Review: [1 to 2 short sentences on what the results indicate]

🛡️ Recommended Precautions & Care Measures to be Done:
• [Short practical precaution 1]
• [Short practical precaution 2]
• [Short practical precaution 3]

⚠️ Warning Signs & Emergency Red Flags:
• [Critical emergency sign 1]
• [Critical emergency sign 2]

👨‍⚕️ Specialist Consultation (via AskMyDoc API):
[1 short sentence naming the exact doctor specialty.]`;

    const userPrompt = `Please clinically evaluate this medical report:
- Disease / Test Name: ${reportData.reportTitle || reportData.category || 'Medical Report'}
- Category: ${reportData.category || 'General Medical Report'}
- File Name: ${reportData.fileName || 'Diagnostic File'}
${reportData.notes ? `- Reported Patient Findings / Lab Values: "${reportData.notes}"` : ''}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1024
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content.trim();
    }
  } catch (err) {
    console.warn("Report LLM query failed or timed out:", err.message);
  }
  return null;
};

const buildClinicalReportAnalysis = async (reportData) => {
  // 1. Try Live Deep Medical LLM first if API key is present
  const llmReportAnalysis = await queryReportLLM(reportData || {});
  if (llmReportAnalysis) {
    const askMyDocSpecialist = await queryAskMyDocSpecialist(reportData?.category || 'General Medical Report');
    return `${llmReportAnalysis}\n\n*Verified Specialist Triage: ${askMyDocSpecialist || 'Consult a verified clinical specialist.'}*`;
  }

  const { category: inputCat, reportTitle, notes, fileName, fileType } = reportData || {};
  const combinedText = `${inputCat || ''} ${reportTitle || ''} ${notes || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  
  let category = "General Diagnostic & Clinical Laboratory Report";
  let analysis = "";
  let precautions = [];
  let redFlags = [];

  // 1. Complete Blood Count & Hematology
  if (/\b(cbc|wbc|rbc)\b/.test(combinedText) || combinedText.includes('blood') || combinedText.includes('hemo') || combinedText.includes('platelet') || combinedText.includes('anemia') || combinedText.includes('hematology')) {
    category = "Complete Blood Count & Hematology Report";
    analysis = "Evaluates primary blood cell lineages: Hemoglobin (erythrocyte oxygenation capacity), Total Leukocyte Count / WBC (systemic immune and infection index), and Platelets (hemostatic clotting function). Results should be evaluated against physiological reference ranges to detect anemia, leukocytosis, or thrombocytopenia.";
    precautions = [
      "Maintain active hydration by consuming 2.5 to 3 liters of fluids daily to support normal intravascular plasma volume.",
      "Incorporate bioavailable iron-rich foods (dark leafy greens, legumes, beetroot, dates, seeds, lean proteins) paired with Vitamin C to enhance absorption.",
      "Avoid strenuous physical exertion or abrupt changes in posture if experiencing lightheadedness, pale conjunctiva, or fatigue.",
      "Do NOT start or discontinue iron supplements, folic acid, or blood thinners without specific clinical instruction.",
      "Retain this report to track hematological index trends across follow-up visits."
    ];
    redFlags = [
      "Platelet count severely reduced (< 50,000 /µL) or spontaneous unexplained bruising, petechiae, or gum bleeding.",
      "Hemoglobin below 7.5 g/dL with severe pallor, tachycardia, or shortness of breath on mild exertion.",
      "High fever accompanied by severe chills or dramatically elevated WBC counts indicative of acute systemic infection."
    ];
  }
  // 2. Neurological & Spine Imaging (MRI / CT / EEG)
  else if (combinedText.includes('mri') || /\b(ct|ct scan|cat scan|eeg|disc|discs)\b/.test(combinedText) || combinedText.includes('brain') || combinedText.includes('spine') || combinedText.includes('neuro')) {
    category = "Neurological & Spine Radiological Imaging (MRI / CT)";
    analysis = "Evaluates structural neuro-anatomy, intracranial parenchyma, ventricular symmetry, cerebral perfusion, and spinal disc integrity. Assesses for acute vascular ischemia, disc herniation, neural foraminal stenosis, or space-occupying lesions.";
    precautions = [
      "Maintain strict ergonomic posture: use supportive cervical/lumbar pillows; avoid sudden jerky head rotations or heavy spinal loading.",
      "Ensure uninterrupted adherence to prescribed neuro-modulators or anti-epileptic medications (never skip doses).",
      "Maintain an objective log recording headache frequency, sensory numbness, paresthesia, or motor weakness episodes.",
      "Avoid unsupervised vigorous spinal manipulations, heavy weightlifting, or high-impact athletic activities.",
      "Preserve original digital DICOM imaging discs/scans alongside this report for your neurologist's review."
    ];
    redFlags = [
      "Sudden unilateral facial drooping, arm drift, or speech slurring (acute stroke signs).",
      "Explosive 'thunderclap' headache or sudden loss of consciousness.",
      "Loss of bowel or bladder control (cauda equina syndrome emergency).",
      "Rapidly progressive motor weakness in limbs or difficulty walking."
    ];
  }
  // 3. Cardiology & Cardiac Diagnostics (ECG / Echo)
  else if (combinedText.includes('ecg') || combinedText.includes('ekg') || combinedText.includes('echo') || combinedText.includes('cardio') || combinedText.includes('heart') || combinedText.includes('troponin') || combinedText.includes('holter')) {
    category = "Cardiology & Cardiac Diagnostics (ECG / Echocardiogram)";
    analysis = "Assesses cardiac electrical impulse generation, conduction intervals (PR, QRS, QT segments), myocardial rhythm regularity, chamber dimensions, left ventricular ejection fraction (LVEF), and valvular hemodynamics.";
    precautions = [
      "Cease vigorous physical strain, athletic training, or heavy lifting until cleared by your cardiologist.",
      "Adhere to a strict low-sodium dietary regimen (< 2,000 mg/day) and eliminate tobacco, nicotine, caffeine, and alcohol.",
      "Perform daily self-monitoring of resting pulse rate and blood pressure morning and evening; record findings.",
      "Practice calming deep diaphragmatic breathing to minimize stress-induced tachycardia.",
      "Take prescribed antihypertensives, antiarrhythmics, or statins exactly at prescribed daily intervals."
    ];
    redFlags = [
      "Squeezing chest pressure or substernal heaviness radiating to the jaw, neck, left shoulder, or arm.",
      "Acute shortness of breath occurring at rest or awakening you during the night (orthopnea).",
      "Episodes of syncope (fainting), profound dizziness, or sudden irregular racing heartbeats."
    ];
  }
  // 4. Glycemic & Diabetic Panel (HbA1c / Glucose)
  else if (combinedText.includes('sugar') || combinedText.includes('glucose') || combinedText.includes('hba1c') || combinedText.includes('diabet') || combinedText.includes('insulin')) {
    category = "Glycemic & Diabetic Panel (Blood Glucose / HbA1c)";
    analysis = "Evaluates pancreatic beta-cell endocrine function, fasting and post-prandial glycemic control, and long-term 90-day glycated hemoglobin (HbA1c). Critical for assessing glycemic stability, insulin sensitivity, and microvascular risk.";
    precautions = [
      "Adopt a structured low-glycemic index (GI), high-fiber diet rich in whole legumes, leafy vegetables, and complex carbohydrates; avoid refined sugars and sweetened juices.",
      "Engage in 30 minutes of moderate aerobic activity (e.g. brisk walking) 5 days a week, preferably 30 minutes following meals.",
      "Maintain a written blood glucose log capturing fasting, pre-meal, and 2-hour post-prandial readings.",
      "Practice meticulous daily foot inspection: check between toes for minor blisters, cuts, or fungal infections.",
      "Carry fast-acting glucose tablets or hard candy at all times in case of sudden hypoglycemic episodes (< 70 mg/dL)."
    ];
    redFlags = [
      "Severe hypoglycemia (< 55 mg/dL) causing confusion, profuse sweating, trembling, or loss of consciousness.",
      "Persistent hyperglycemia (> 250 mg/dL) accompanied by nausea, vomiting, abdominal pain, and fruity-smelling breath (DKA risk).",
      "Sudden blurry vision, visual dark spots, or non-healing foot sores."
    ];
  }
  // 5. Lipid Profile & Cholesterol Panel
  else if (combinedText.includes('lipid') || combinedText.includes('cholesterol') || combinedText.includes('triglyceride') || combinedText.includes('ldl') || combinedText.includes('hdl')) {
    category = "Lipid Profile & Cardiovascular Risk Panel";
    analysis = "Measures serum lipid fractions: Total Cholesterol, Low-Density Lipoprotein (LDL - atherogenic atheroma risk), High-Density Lipoprotein (HDL - cardioprotective), and Triglycerides (metabolic storage markers). Evaluates overall atherosclerotic cardiovascular disease (ASCVD) risk.";
    precautions = [
      "Significantly restrict dietary saturated fats, trans-fats, deep-fried snacks, processed meats, and full-fat dairy products.",
      "Increase dietary soluble fiber intake (oats, flaxseeds, psyllium husk, beans) to bind bile acids and lower systemic LDL.",
      "Engage in consistent cardiovascular exercise (brisk walking, swimming, cycling) to elevate cardioprotective HDL levels.",
      "Avoid smoking and alcohol consumption, both of which severely worsen dyslipidemia and vascular inflammation.",
      "Retest lipid profile following 8 to 12 weeks of structured dietary and clinical intervention."
    ];
    redFlags = [
      "Elevated lipids combined with new-onset exertional chest discomfort, left arm tightness, or shortness of breath.",
      "Severely elevated serum triglycerides (> 500 mg/dL), which carries an immediate clinical risk for acute pancreatitis."
    ];
  }
  // 6. Liver Function Test (LFT) & Hepatic Panel
  else if (combinedText.includes('liver') || combinedText.includes('lft') || combinedText.includes('sgot') || combinedText.includes('sgpt') || combinedText.includes('bilirubin') || combinedText.includes('alt') || combinedText.includes('ast') || combinedText.includes('hepatic') || combinedText.includes('jaundice')) {
    category = "Liver Function Test (LFT) & Hepatic Panel";
    analysis = "Evaluates hepatocellular integrity through transaminases (SGPT/ALT, SGOT/AST), biliary excretory efficiency via Total and Direct Bilirubin and Alkaline Phosphatase (ALP), and hepatic synthetic function through Total Protein and Albumin.";
    precautions = [
      "Strictly abstain from all alcoholic beverages, recreational substances, and hepatotoxic compounds.",
      "Avoid self-medicating with over-the-counter NSAIDs, excessive acetaminophen/paracetamol, or unverified herbal liver tonics.",
      "Consume a fresh, nutrient-dense diet emphasizing steamed vegetables, whole grains, and antioxidant-rich fruits; minimize saturated fats.",
      "Drink 2.5 to 3 liters of boiled/purified water daily to facilitate natural metabolic clearance.",
      "Schedule a follow-up liver ultrasound (USG) if transaminases or bilirubin fractions remain elevated."
    ];
    redFlags = [
      "Noticeable yellowing of the sclera of eyes or skin (icterus/jaundice) accompanied by dark cola-colored urine.",
      "Swelling of the abdomen (ascites) or lower extremities (peripheral edema).",
      "Mental confusion, altered sleep-wake cycle, or flapping hand tremors (signs of hepatic encephalopathy).",
      "Persistent nausea, severe right upper-quadrant abdominal tenderness, or pale clay-colored stools."
    ];
  }
  // 7. Kidney Function Test (KFT / RFT) & Renal Panel
  else if (combinedText.includes('kidney') || combinedText.includes('kft') || combinedText.includes('rft') || combinedText.includes('creatinine') || combinedText.includes('urea') || combinedText.includes('bun') || combinedText.includes('uric') || combinedText.includes('renal')) {
    category = "Kidney Function Test (KFT / RFT) & Renal Panel";
    analysis = "Evaluates glomerular filtration and renal excretory performance through Serum Creatinine, Blood Urea Nitrogen (BUN), and Uric Acid. Indicates nephron filtration efficiency and fluid-electrolyte balance.";
    precautions = [
      "Do NOT take non-steroidal anti-inflammatory drugs (NSAIDs like ibuprofen, naproxen, diclofenac) without explicit physician consent, as they cause acute renal vasoconstriction.",
      "Maintain consistent fluid intake as advised by your physician (avoid both severe dehydration and fluid overloading).",
      "Moderate dietary protein intake and limit foods high in purines (red meat, shellfish) if uric acid is elevated.",
      "Strictly manage and maintain resting blood pressure below 130/80 mmHg to protect delicate glomerular capillaries.",
      "Reduce dietary sodium intake to prevent fluid retention and systemic hypertension."
    ];
    redFlags = [
      "Marked decrease or complete absence of daily urine output (oliguria/anuria).",
      "Rapid onset of facial puffiness, periorbital swelling, or severe bilateral lower limb edema.",
      "Shortness of breath on lying flat, metal taste in mouth, or persistent intractable nausea."
    ];
  }
  // 8. Urine Routine & Microscopy (Urinalysis)
  else if (combinedText.includes('urine') || combinedText.includes('urinalysis') || combinedText.includes('pus cells') || combinedText.includes('epithelial') || combinedText.includes('uti') || combinedText.includes('proteinuria')) {
    category = "Urine Routine & Microscopy (Urinalysis)";
    analysis = "Evaluates physical characteristics (color, turbidity, specific gravity), chemical markers (pH, protein, glucose, ketones, nitrites), and microscopic sediment (pus cells/leukocytes, RBCs, epithelial cells, casts, crystals, bacteria).";
    precautions = [
      "Hydrate vigorously by drinking 2.5 to 3 liters of water daily to naturally flush micro-organisms from the urinary tract.",
      "Void your bladder completely at regular intervals; do not resist the urge to urinate.",
      "Refrain from consuming bladder irritants including caffeinated coffee, spicy dishes, and carbonated beverages.",
      "Maintain strict personal hygiene; wear loose, breathable pure cotton undergarments.",
      "If pus cells or nitrites are elevated, follow up with a Urine Culture & Sensitivity test before starting antibiotics."
    ];
    redFlags = [
      "Visible red, pink, or cloudy brown blood in the urine (frank hematuria).",
      "High spiking fever with severe chills and severe flank/back pain (signs of acute pyelonephritis).",
      "Inability to pass urine despite severe painful bladder fullness."
    ];
  }
  // 9. Thyroid Function Profile (TSH / T3 / T4)
  else if (combinedText.includes('thyroid') || combinedText.includes('tsh') || combinedText.includes('t3') || combinedText.includes('t4') || combinedText.includes('goiter')) {
    category = "Thyroid Function Profile (TSH / T3 / T4)";
    analysis = "Evaluates pituitary-thyroid endocrine feedback axis: Thyroid-Stimulating Hormone (TSH), Free T3, and Free T4. Assesses for clinical or subclinical hypothyroidism (elevated TSH) or hyperthyroidism (suppressed TSH).";
    precautions = [
      "If prescribed thyroid hormone replacement (e.g. Levothyroxine), take it first thing in the morning with a full glass of water on an empty stomach, at least 45 minutes before breakfast or coffee.",
      "Avoid taking calcium, iron, or antacid supplements within 4 hours of thyroid medication to prevent absorption interference.",
      "Maintain a balanced diet with adequate natural iodine and selenium; avoid excessive raw goitrogens (cabbage, cauliflower, kale).",
      "Track systemic symptoms including energy levels, temperature tolerance, heart rate, and weight fluctuations.",
      "Retest serum TSH levels after 6 to 8 weeks following any dosage adjustment."
    ];
    redFlags = [
      "Resting heart rate persistently above 100 bpm accompanied by severe tremors, profuse sweating, and anxiety (thyrotoxicosis).",
      "Severe extreme lethargy, hypothermia, mental confusion, or facial swelling.",
      "Rapidly enlarging neck swelling or difficulty swallowing or breathing."
    ];
  }
  // 10. Chest X-Ray & Pulmonary Diagnostic Report
  else if (combinedText.includes('x-ray') || combinedText.includes('xray') || combinedText.includes('chest') || combinedText.includes('lung') || combinedText.includes('pulmonary') || combinedText.includes('pft') || combinedText.includes('spirometry')) {
    category = "Chest X-Ray & Pulmonary Diagnostic Report";
    analysis = "Evaluates lung parenchyma, bronchovascular markings, pleural spaces, costophrenic angles, mediastinal contours, and cardiothoracic ratio. Checks for consolidations, infiltrates, pleural effusions, pneumothorax, or cardiomegaly.";
    precautions = [
      "Refrain strictly from active smoking and avoid exposure to secondhand smoke, dust, chemicals, and biomass smoke.",
      "Perform incentive spirometry or deep breathing exercises 3 times daily to promote alveolar expansion.",
      "Use steam inhalation with warm water to clear bronchial secretions if productive cough is present.",
      "Ensure up-to-date immunizations (annual influenza and pneumococcal vaccines as indicated).",
      "Keep digital or physical X-ray films stored flat in protective envelopes for your pulmonologist's evaluation."
    ];
    redFlags = [
      "Acute severe shortness of breath or sudden sharp pleuritic chest pain on inhalation.",
      "Hemoptysis (coughing up fresh blood or blood-tinged sputum).",
      "Oxygen saturation (SpO2) dropping below 92% on room air."
    ];
  }
  // 11. Abdominal Ultrasound & Sonography (USG)
  else if (combinedText.includes('ultrasound') || combinedText.includes('usg') || combinedText.includes('sono') || combinedText.includes('abdomen') || combinedText.includes('pelvic') || combinedText.includes('gallbladder') || combinedText.includes('calculi') || combinedText.includes('stone')) {
    category = "Abdominal Ultrasound & Sonography Report";
    analysis = "Visualizes solid visceral organs (liver, gallbladder, spleen, pancreas, kidneys, urinary bladder, pelvic structures). Assesses for organomegaly, parenchymal echogenicity, cholelithiasis (gallstones), nephrolithiasis (kidney stones), or fluid collections.";
    precautions = [
      "If gallstones are identified, avoid fatty, fried, greasy foods that stimulate painful gallbladder contractions.",
      "If renal calculi (kidney stones) are noted, maintain daily water consumption of 3 liters to dilute urinary solutes.",
      "Avoid heavy abdominal straining, strenuous core workouts, or direct trauma to the abdomen.",
      "Maintain a bland, easily digestible diet and eat smaller, more frequent meals.",
      "Correlate ultrasound findings with serum liver or renal function tests as advised."
    ];
    redFlags = [
      "Sudden, intense, colicky abdominal pain radiating to the back or groin accompanied by vomiting.",
      "High fever with chills and severe right upper quadrant abdominal tenderness (acute cholecystitis).",
      "Gross blood in the urine or inability to pass urine."
    ];
  }
  // 12. Orthopedic Imaging & Bone Density (X-Ray / DEXA)
  else if (combinedText.includes('bone') || combinedText.includes('fracture') || combinedText.includes('dexa') || combinedText.includes('joint') || combinedText.includes('ortho') || combinedText.includes('osteopor')) {
    category = "Orthopedic Imaging & Bone Health Report";
    analysis = "Evaluates osseous integrity, cortical continuity, joint space width, articular alignment, and bone mineral density (T-score/Z-score). Assesses for acute fractures, degenerative joint disease (osteoarthritis), or osteopenia/osteoporosis.";
    precautions = [
      "Follow R.I.C.E. principles (Rest, Ice, Compression, Elevation) and immobilization protocols for acute skeletal injuries.",
      "Ensure adequate dietary calcium (1,000–1,200 mg/day) and Vitamin D3 supplementation under medical supervision.",
      "Engage in physician-approved low-impact weight-bearing exercises to stimulate bone remodeling.",
      "Implement fall prevention safeguards at home: eliminate loose rugs, install bathroom grab bars, and ensure good lighting.",
      "Avoid high-impact jumping or aggressive joint loading until bone healing is verified on follow-up imaging."
    ];
    redFlags = [
      "Visible bone deformity, unnatural angulation, or open skin wound over an injured bone (compound fracture).",
      "Inability to bear any weight or severe, unyielding bone pain unresponsive to immobilization.",
      "Loss of pulse, coldness, or numbness in toes or fingers below the injury site."
    ];
  }
  // 13. Default General Laboratory & Clinical Diagnostic Report
  else {
    category = "Clinical Laboratory & Medical Diagnostic Report";
    analysis = "Clinical parameters, biochemical markers, and diagnostic indicators documented. Reference values reflect physiological baseline indicators for health monitoring, diagnosis confirmation, and preventive healthcare.";
    precautions = [
      "Maintain optimal systemic hydration by consuming 2 to 2.5 liters of clean water daily.",
      "Ensure 7 to 8 hours of restorative sleep to promote cellular recovery and homeostasis.",
      "Continue existing prescribed health regimens and avoid self-medicating with unprescribed pharmaceuticals.",
      "Schedule a dedicated clinical consultation to correlate these laboratory findings with your personal medical history."
    ];
    redFlags = [
      "Sudden onset of severe pain, high persistent fever (>101°F), or breathing discomfort.",
      "Rapid unexplained deterioration in physical stamina, mental clarity, or functional mobility."
    ];
  }

  // Query AskMyDoc API dynamically for the verified specialist
  const askMyDocSpecialist = await queryAskMyDocSpecialist(category);

  let output = `📋 Clinical Summary & Parameters (via AskMyDoc):
• Document Type: ${category}
• Analyzed File: ${fileName || 'Medical File'} ${fileType ? `(${fileType})` : ''}
${notes ? `• Reported Patient Findings / Values: "${notes}"\n` : ''}• Diagnostic Review: ${analysis}

🛡️ Recommended Precautions & Care Measures to be Done:
${precautions.map(p => `• ${p}`).join('\n')}

⚠️ Warning Signs & Emergency Red Flags:
${redFlags.map(r => `• ${r}`).join('\n')}

👨‍⚕️ Specialist Consultation (via AskMyDoc API):
${askMyDocSpecialist || 'Please consult a verified medical practitioner for clinical evaluation of this report.'}`;

  return output;
};

exports.uploadReport = async (req, res) => {
  try {
    const { doctorId, fileBase64, fileType, fileName, category, reportTitle, notes } = req.body;
    
    if (!fileBase64) return res.status(400).json({ message: 'Please upload a file' });

    // Analyze using AskMyDoc API engine with full metadata
    const aiSummary = await buildClinicalReportAnalysis({
      category,
      reportTitle,
      notes,
      fileName,
      fileType
    });

    const report = await Report.create({
      patient: req.user._id,
      doctor: doctorId || null,
      fileUrl: fileBase64,
      fileType: fileType || 'application/pdf',
      fileName: fileName || 'Medical_Report',
      reportTitle: reportTitle || fileName || 'Medical Report',
      category: category || 'General Medical Report',
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
