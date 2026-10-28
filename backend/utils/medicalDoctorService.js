const User = require('../models/User');

// Mapping of popular diseases & clinical keywords to medical specialties and short precautions
const POPULAR_DISEASES = [
  // 1. CARDIOLOGY (Can be treated by system Cardiologists)
  {
    keywords: ['heart', 'cardiac', 'angina', 'chest pain', 'palpitation', 'palpitations', 'myocardial', 'heart attack', 'cad', 'artery', 'atherosclerosis', 'troponin', 'ecg', 'ekg', 'echo', 'cardiomegaly', 'arrhythmia', 'heart failure'],
    disease: 'Coronary Artery Disease / Cardiac Condition',
    specialty: 'Cardiologist',
    precautions: [
      'Avoid sudden physical overexertion and heavy lifting.',
      'Maintain a strict low-sodium, low-cholesterol diet.',
      'Take prescribed cardiac medications on exact schedule.'
    ]
  },
  {
    keywords: ['hypertension', 'high bp', 'blood pressure', 'high blood pressure'],
    disease: 'Hypertension (High Blood Pressure)',
    specialty: 'Cardiologist',
    precautions: [
      'Limit dietary sodium to under 2,000 mg daily.',
      'Monitor and record blood pressure morning and evening.',
      'Avoid caffeine, tobacco, and high-stress triggers.'
    ]
  },
  {
    keywords: ['cholesterol', 'lipid', 'triglyceride', 'ldl', 'dyslipidemia'],
    disease: 'Hyperlipidemia (High Cholesterol)',
    specialty: 'Cardiologist',
    precautions: [
      'Eliminate deep-fried, oily snacks and trans-fat foods.',
      'Increase soluble fiber intake from oats, beans, and seeds.',
      'Engage in 30 minutes of daily brisk cardiovascular exercise.'
    ]
  },

  // 2. INFECTIONS & GENERAL MEDICINE
  {
    keywords: ['dengue', 'platelet', 'ns1', 'aedes'],
    disease: 'Dengue Fever',
    specialty: 'General Physician',
    precautions: [
      'Drink 3+ liters of fluids (ORS, coconut water, papaya leaf extract) daily.',
      'Monitor platelet count daily with repeat CBC blood tests.',
      'Strictly avoid aspirin and ibuprofen; take paracetamol for fever.'
    ]
  },
  {
    keywords: ['malaria', 'plasmodium', 'chills and fever'],
    disease: 'Malaria Infection',
    specialty: 'General Physician',
    precautions: [
      'Complete the full prescribed course of antimalarial medications.',
      'Use mosquito repellents and sleep under protective nets.',
      'Stay hydrated with warm electrolyte solutions and rest.'
    ]
  },
  {
    keywords: ['typhoid', 'salmonella', 'widal', 'enteric fever'],
    disease: 'Typhoid Fever',
    specialty: 'General Physician',
    precautions: [
      'Consume only boiled or purified drinking water.',
      'Eat light, soft, freshly cooked foods; avoid outside street food.',
      'Complete full antibiotic prescription without skipping doses.'
    ]
  },
  {
    keywords: ['chikungunya', 'joint pain with fever', 'chikv'],
    disease: 'Chikungunya Viral Infection',
    specialty: 'General Physician',
    precautions: [
      'Rest affected joints and apply gentle cold compresses for pain.',
      'Stay proactively hydrated with fresh juices and coconut water.',
      'Avoid strenuous physical exertion until joint swelling subsides.'
    ]
  },
  {
    keywords: ['fever', 'temperature', 'pyrexia', 'viral fever', 'flu', 'influenza', 'shivering'],
    disease: 'Acute Viral Fever / Flu',
    specialty: 'General Physician',
    precautions: [
      'Prioritize strict bed rest to support immune defense.',
      'Drink 2.5 to 3 liters of warm fluids and clear broths.',
      'Use lukewarm sponge baths if body temperature rises above 101°F.'
    ]
  },
  {
    keywords: ['covid', 'corona', 'sars-cov-2'],
    disease: 'COVID-19 Respiratory Infection',
    specialty: 'General Physician',
    precautions: [
      'Isolate in a well-ventilated room to prevent transmission.',
      'Monitor blood oxygen saturation (SpO2) every 6 hours with a pulse oximeter.',
      'Perform steam inhalation and warm saline gargles twice daily.'
    ]
  },
  {
    keywords: ['anemia', 'haemoglobin', 'hemoglobin', 'low hb', 'iron deficiency', 'cbc', 'wbc', 'rbc'],
    disease: 'Iron Deficiency Anemia / Hematologic Imbalance',
    specialty: 'General Physician',
    precautions: [
      'Incorporate iron-rich foods (spinach, beetroot, lentils, dates, pomegranate).',
      'Pair iron sources with Vitamin C (citrus, amla) for optimal absorption.',
      'Avoid consuming tea or coffee immediately with meals.'
    ]
  },

  // 3. NEUROLOGY & BRAIN
  {
    keywords: ['migraine', 'headache', 'throbbing head', 'photophobia'],
    disease: 'Migraine / Severe Cephalalgia',
    specialty: 'Neurologist',
    precautions: [
      'Rest in a dark, quiet, distraction-free environment.',
      'Drink 500 mL of water immediately to address dehydration triggers.',
      'Apply an ice pack to your forehead and avoid digital screen glare.'
    ]
  },
  {
    keywords: ['stroke', 'paralysis', 'facial drooping', 'slurred speech', 'arm weakness', 'tia', 'ischemic stroke'],
    disease: 'Cerebrovascular Stroke / TIA',
    specialty: 'Neurologist',
    precautions: [
      'Seek emergency hospital care immediately (Golden Hour treatment).',
      'Do not give oral food, water, or aspirin if swallowing is impaired.',
      'Keep patient resting flat with head slightly turned to the side.'
    ]
  },
  {
    keywords: ['epilepsy', 'seizure', 'fit', 'convulsion', 'eeg'],
    disease: 'Epilepsy / Seizure Disorder',
    specialty: 'Neurologist',
    precautions: [
      'Take prescribed anti-epileptic medications strictly on time.',
      'During a seizure, clear sharp objects and turn patient onto side.',
      'Ensure 8 hours of sleep; avoid flashing strobe lights and sleep deprivation.'
    ]
  },
  {
    keywords: ['brain', 'mri', 'ct scan brain', 'brain tumor', 'intracranial', 'meningitis'],
    disease: 'Neurological / Brain Parenchymal Condition',
    specialty: 'Neurologist',
    precautions: [
      'Maintain strict adherence to prescribed neuro-modulator medications.',
      'Avoid sudden neck twisting, heavy lifting, or high-impact strain.',
      'Keep follow-up imaging scans and report any vision changes.'
    ]
  },
  {
    keywords: ['parkinson', 'tremor', 'shaking hands', 'rigidity'],
    disease: "Parkinson's Disease / Tremor Syndrome",
    specialty: 'Neurologist',
    precautions: [
      'Practice regular gentle balance and fine-motor coordination exercises.',
      'Eliminate caffeine and stimulants that aggravate physiological tremors.',
      'Ensure safe, well-lit home walkways free of tripping hazards.'
    ]
  },

  // 4. ENDOCRINOLOGY & METABOLIC
  {
    keywords: ['diabetes', 'sugar', 'glucose', 'hba1c', 'insulin', 'fasting blood sugar'],
    disease: 'Diabetes Mellitus (High Blood Sugar)',
    specialty: 'Endocrinologist',
    precautions: [
      'Adopt a low-glycemic, high-fiber diet; strictly eliminate refined sugars.',
      'Monitor fasting and post-meal blood glucose levels regularly.',
      'Engage in 30 minutes of moderate brisk walking daily after meals.'
    ]
  },
  {
    keywords: ['thyroid', 'tsh', 'hypothyroid', 'hyperthyroid', 't3', 't4', 'goiter'],
    disease: 'Thyroid Endocrine Disorder',
    specialty: 'Endocrinologist',
    precautions: [
      'Take thyroid medication first thing in morning with water on empty stomach.',
      'Avoid calcium or iron supplements within 4 hours of thyroid pill.',
      'Retest serum TSH levels every 6 to 8 weeks to adjust dosages.'
    ]
  },
  {
    keywords: ['pcod', 'pcos', 'polycystic', 'irregular periods', 'ovarian'],
    disease: 'PCOS / PCOD (Polycystic Ovarian Syndrome)',
    specialty: 'Gynecologist / Endocrinologist',
    precautions: [
      'Maintain a structured low-carb, anti-inflammatory whole-food diet.',
      'Perform regular cardiovascular and resistance exercise 4-5 days a week.',
      'Prioritize consistent sleep cycles to regulate reproductive hormones.'
    ]
  },

  // 5. RESPIRATORY & PULMONOLOGY
  {
    keywords: ['asthma', 'wheezing', 'inhaler', 'bronchospasm'],
    disease: 'Bronchial Asthma',
    specialty: 'Pulmonologist',
    precautions: [
      'Keep your fast-acting rescue inhaler accessible at all times.',
      'Avoid known triggers: smoke, cold drafts, dust mites, and pet dander.',
      'Use a spacer with inhalers and rinse mouth thoroughly after steroid puffs.'
    ]
  },
  {
    keywords: ['pneumonia', 'lung infection', 'consolidated lung', 'x-ray chest', 'chest xray'],
    disease: 'Pneumonia / Lower Respiratory Infection',
    specialty: 'Pulmonologist',
    precautions: [
      'Complete the entire course of prescribed antibiotics or antivirals.',
      'Perform incentive spirometry or gentle deep-breathing drills.',
      'Hydrate with warm fluids and use steam inhalation to thin secretions.'
    ]
  },
  {
    keywords: ['cough', 'cold', 'sore throat', 'phlegm', 'bronchitis', 'tonsil', 'sinus'],
    disease: 'Acute Bronchitis / Upper Airway Infection',
    specialty: 'Pulmonologist',
    precautions: [
      'Perform warm salt-water gargles 2-3 times daily to soothe the throat.',
      'Use warm steam inhalation for 10 minutes to relieve airway congestion.',
      'Drink warm water, herbal teas with honey, and avoid icy beverages.'
    ]
  },
  {
    keywords: ['tuberculosis', 'tb', 'mantoux', 'afb sputum', 'coughing blood'],
    disease: 'Pulmonary Tuberculosis (TB)',
    specialty: 'Pulmonologist',
    precautions: [
      'Never miss or discontinue DOTS anti-tubercular medication doses.',
      'Wear a surgical mask in public and ensure good room ventilation.',
      'Consume a high-calorie, protein-rich diet to regain body weight.'
    ]
  },

  // 6. GASTROENTEROLOGY & HEPATIC
  {
    keywords: ['acidity', 'gerd', 'acid reflux', 'heartburn', 'gastric', 'gastritis'],
    disease: 'GERD / Hyperacidity & Gastritis',
    specialty: 'Gastroenterologist',
    precautions: [
      'Avoid spicy, fried, citrus, caffeinated, and minty foods/drinks.',
      'Do not lie down flat within 2 to 3 hours after having a meal.',
      'Eat smaller, frequent meals and avoid skipping breakfast.'
    ]
  },
  {
    keywords: ['jaundice', 'hepatitis', 'liver', 'lft', 'bilirubin', 'sgot', 'sgpt', 'fatty liver', 'cirrhosis'],
    disease: 'Hepatic / Liver Condition (Jaundice / Fatty Liver)',
    specialty: 'Gastroenterologist',
    precautions: [
      'Strictly avoid all alcohol consumption and hepatotoxic medications.',
      'Consume light, easily digestible, low-fat home-cooked meals.',
      'Drink 2.5 to 3 liters of boiled/purified water daily for metabolic clearance.'
    ]
  },
  {
    keywords: ['ulcer', 'peptic', 'stomach pain', 'stomach ache', 'h. pylori'],
    disease: 'Peptic Ulcer Disease',
    specialty: 'Gastroenterologist',
    precautions: [
      'Avoid NSAID painkillers (ibuprofen, diclofenac) which erode stomach lining.',
      'Avoid alcohol, coffee, and acidic, deeply fried foods.',
      'Take prescribed antacids or proton pump inhibitors before meals.'
    ]
  },
  {
    keywords: ['gallstone', 'cholelithiasis', 'gallbladder', 'usg abdomen', 'ultrasound abdomen'],
    disease: 'Gallstone Disease (Cholelithiasis)',
    specialty: 'Gastroenterologist',
    precautions: [
      'Avoid greasy, high-fat, deep-fried meals that trigger gallbladder contractions.',
      'Eat small, frequent portions with plenty of fiber and water.',
      'Seek prompt evaluation if sudden severe right upper-belly pain develops.'
    ]
  },
  {
    keywords: ['diarrhea', 'loose motion', 'vomiting', 'food poisoning', 'dehydration'],
    disease: 'Acute Gastroenteritis / Food Poisoning',
    specialty: 'General Physician',
    precautions: [
      'Replenish fluid loss immediately with Oral Rehydration Salt (ORS) solution.',
      'Follow a bland BRAT diet (Bananas, Rice, Applesauce, Toast, curd/yogurt).',
      'Wash hands thoroughly before handling food and avoid street items.'
    ]
  },

  // 7. NEPHROLOGY & UROLOGY
  {
    keywords: ['kidney stone', 'renal calculi', 'flank pain', 'kidney'],
    disease: 'Kidney Stones (Nephrolithiasis)',
    specialty: 'Urologist / Nephrologist',
    precautions: [
      'Drink 3+ liters of clean water daily to naturally flush urinary solutes.',
      'Limit high-oxalate foods (spinach, chocolate, nuts) and excess dietary salt.',
      'Avoid heavy abdominal straining until stone passage is evaluated.'
    ]
  },
  {
    keywords: ['uti', 'urinary infection', 'burning urine', 'dysuria', 'urine routine'],
    disease: 'Urinary Tract Infection (UTI)',
    specialty: 'Urologist / Nephrologist',
    precautions: [
      'Drink 2.5 to 3 liters of water daily to flush out bacteria.',
      'Void your bladder completely at regular intervals; do not hold urine.',
      'Wear breathable pure cotton clothing and maintain strict personal hygiene.'
    ]
  },
  {
    keywords: ['creatinine', 'urea', 'kft', 'rft', 'kidney failure', 'ckd'],
    disease: 'Renal Impairment / Chronic Kidney Disease',
    specialty: 'Nephrologist',
    precautions: [
      'Strictly avoid NSAID painkillers (like ibuprofen) which damage nephrons.',
      'Maintain exact daily fluid intake limits advised by your doctor.',
      'Reduce dietary sodium, processed foods, and high-potassium items.'
    ]
  },

  // 8. ORTHOPEDICS & BONES
  {
    keywords: ['arthritis', 'joint pain', 'knee pain', 'osteoarthritis', 'swollen knee'],
    disease: 'Osteoarthritis / Joint Inflammation',
    specialty: 'Orthopedic Surgeon',
    precautions: [
      'Avoid high-impact jumping, deep squatting, or lifting heavy weights.',
      'Apply warm compresses for chronic stiffness or ice packs for acute swelling.',
      'Engage in low-impact exercises like swimming or gentle level walking.'
    ]
  },
  {
    keywords: ['fracture', 'broken bone', 'bone pain', 'dislocation', 'xray bone'],
    disease: 'Bone Fracture / Skeletal Injury',
    specialty: 'Orthopedic Surgeon',
    precautions: [
      'Immobilize the injured limb immediately; do NOT put weight on it.',
      'Apply an ice pack wrapped in a cloth to reduce swelling.',
      'Ensure adequate dietary calcium and Vitamin D3 under physician guidance.'
    ]
  },
  {
    keywords: ['back pain', 'sciatica', 'spine', 'disc herniation', 'spondylosis', 'cervical'],
    disease: 'Spinal Disc Disorder / Lumbar Spondylosis',
    specialty: 'Orthopedic / Spine Specialist',
    precautions: [
      'Maintain strict ergonomic posture and avoid heavy bending from the waist.',
      'Sleep on a firm supportive mattress with a pillow under your knees.',
      'Engage in gentle back-strengthening physiotherapy exercises.'
    ]
  },

  // 9. DERMATOLOGY & SKIN
  {
    keywords: ['skin', 'rash', 'eczema', 'psoriasis', 'itching', 'allergy', 'hives', 'urticaria', 'fungal', 'ringworm'],
    disease: 'Dermatological Condition / Skin Allergy',
    specialty: 'Dermatologist',
    precautions: [
      'Do NOT scratch the rash to avoid secondary bacterial skin infections.',
      'Bathe in lukewarm water and use mild, fragrance-free moisturizing soap.',
      'Wear loose, breathable 100% pure cotton clothing.'
    ]
  },

  // 10. OPHTHALMOLOGY & ENT
  {
    keywords: ['eye', 'vision', 'conjunctivitis', 'cataract', 'red eye', 'blurry vision'],
    disease: 'Ophthalmologic / Eye Condition',
    specialty: 'Ophthalmologist',
    precautions: [
      'Do NOT rub or touch your eyes; wash hands frequently.',
      'Discontinue contact lens use and wear prescription eyeglasses.',
      'Apply cool compresses and use preservative-free lubricating eye drops.'
    ]
  },
  {
    keywords: ['ear', 'earache', 'tinnitus', 'vertigo', 'hearing', 'sinusitis'],
    disease: 'ENT / Ear or Sinus Disorder',
    specialty: 'ENT Specialist',
    precautions: [
      'Keep the ear canal dry; avoid inserting cotton buds or foreign objects.',
      'Use warm steam inhalation twice daily to equalize sinus pressure.',
      'Avoid sudden atmospheric pressure shifts and loud acoustic exposures.'
    ]
  }
];

/**
 * Match condition text to an identified disease, required medical specialty, and short precautions.
 */
function findPopularDiseaseMatch(inputText) {
  if (!inputText || typeof inputText !== 'string') return null;
  const clean = inputText.toLowerCase().replace(/[^\w\s]/g, ' ');

  for (const item of POPULAR_DISEASES) {
    for (const kw of item.keywords) {
      // Check word boundary or substring match
      const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(clean) || clean.includes(kw)) {
        return item;
      }
    }
  }
  return null;
}

/**
 * Check MongoDB for registered doctors who have the required specialty to treat this disease.
 * If matching doctor(s) exist: suggest ONLY those doctors!
 * If no matching doctor has that specialty: show clear message stating required specialty is not currently in the system, and to contact our doctors/clinic.
 */
async function getDoctorSuggestionForSpecialty(requiredSpecialty) {
  try {
    const doctors = await User.find({ role: 'Doctor' }).select('name specialization qualification phone').lean();
    if (!doctors || doctors.length === 0) {
      return `Please contact our healthcare clinic at 9886801223 for medical consultation.`;
    }

    const reqLower = (requiredSpecialty || '').toLowerCase();

    // Check which registered doctors can actually treat this condition
    const matchingDoctors = doctors.filter(doc => {
      const spec = (doc.specialization || '').toLowerCase();
      if (!spec) return false;
      
      // If specialty is Cardiologist, check cardiologist/heart
      if (reqLower.includes('cardio') && spec.includes('cardio')) return true;
      if (reqLower.includes('neuro') && spec.includes('neuro')) return true;
      if (reqLower.includes('physician') && (spec.includes('physician') || spec.includes('general') || spec.includes('internal'))) return true;
      if (reqLower.includes('pulmono') && spec.includes('pulmono')) return true;
      if (reqLower.includes('ortho') && spec.includes('ortho')) return true;
      if (reqLower.includes('endocrino') && (spec.includes('endocrino') || spec.includes('diabet'))) return true;
      if (reqLower.includes('gastro') && spec.includes('gastro')) return true;
      if (reqLower.includes('dermato') && spec.includes('dermato')) return true;
      if (reqLower.includes('uro') && spec.includes('uro')) return true;
      if (reqLower.includes('nephro') && spec.includes('nephro')) return true;
      if (reqLower.includes('ophthalmo') && spec.includes('ophthalmo')) return true;
      if (reqLower.includes('ent') && spec.includes('ent')) return true;

      return spec.includes(reqLower) || reqLower.includes(spec);
    });

    if (matchingDoctors.length > 0) {
      // Suggest ONLY doctors who can treat them!
      return matchingDoctors.map(doc => {
        const name = doc.name.trim().startsWith('Dr') ? doc.name.trim() : `Dr. ${doc.name.trim()}`;
        const spec = doc.specialization ? ` (${doc.specialization.trim()})` : '';
        const qual = doc.qualification ? ` [${doc.qualification.trim()}]` : '';
        const phone = doc.phone ? ` - Phone: ${doc.phone.trim()}` : '';
        return `• ${name}${spec}${qual}${phone}`;
      }).join('\n');
    }

    // No doctor with this specific specialty is registered in the system
    return `Requires evaluation by a ${requiredSpecialty || 'Specialist'}.\nCurrently, no registered ${requiredSpecialty} is available in our system.\nPlease contact our clinic at 9886801223 for a specialist referral.`;
  } catch (err) {
    console.warn('Error fetching system doctors:', err.message);
    return `Please contact our healthcare clinic at 9886801223 for medical consultation.`;
  }
}

/**
 * Handle Unknown or Unrecognized Disease:
 * Returns the exact "contact our doctors" message requested by user.
 */
async function buildUnknownDiseaseResponse() {
  let docList = "";
  try {
    const doctors = await User.find({ role: 'Doctor' }).select('name specialization qualification phone').lean();
    if (doctors && doctors.length > 0) {
      docList = doctors.map(doc => {
        const name = doc.name.trim().startsWith('Dr') ? doc.name.trim() : `Dr. ${doc.name.trim()}`;
        const spec = doc.specialization ? ` (${doc.specialization.trim()})` : '';
        const phone = doc.phone ? ` - Phone: ${doc.phone.trim()}` : '';
        return `• ${name}${spec}${phone}`;
      }).join('\n');
    }
  } catch (err) {
    console.warn(err);
  }

  return `🩺 Disease: Unrecognized Condition / Symptoms

🛡️ Precautions:
• Please contact our doctors for clinical examination and proper diagnosis.
• Avoid self-medicating or taking unverified medications.
• Keep a daily log of your symptoms and seek medical evaluation.

👨‍⚕️ Suggested Doctor (in system):
Please contact our registered doctors for clinical triage:
${docList || '• Clinic Helpdesk - Phone: 9886801223'}`;
}

/**
 * Query Groq / LLM with strict instructions to identify disease and precautions.
 * Returns { disease, precautions } or null.
 */
async function queryLLMForDisease(promptText) {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const isGroq = apiKey.startsWith('gsk_') || !process.env.OPENAI_API_KEY;
    const endpoint = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions' 
      : 'https://api.openai.com/v1/chat/completions';
    const model = isGroq ? 'qwen/qwen3.8-27b' : 'gpt-4o-mini';

    const systemPrompt = `You are a medical diagnostic AI.
Given the patient input, identify the exact disease or test accurately.
Rules:
1. If the input is clear, output:
DISEASE: [Exact Disease Name]
SPECIALTY: [Treating Specialist, e.g. Cardiologist, Neurologist, General Physician, Pulmonologist, Endocrinologist, Gastroenterologist, Dermatologist, Orthopedic Surgeon, Urologist, ENT Specialist, Ophthalmologist]
PRECAUTIONS:
• [Short actionable precaution 1 - under 12 words]
• [Short actionable precaution 2 - under 12 words]
• [Short actionable precaution 3 - under 12 words]

2. If the input is completely unrecognizable, gibberish, nonsensical, or cannot be identified clinically, output:
DISEASE: UNKNOWN`;

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
          { role: 'user', content: promptText }
        ],
        temperature: 0.1,
        max_tokens: 300
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content.trim();
    }
  } catch (err) {
    console.warn("LLM query failed:", err.message);
  }
  return null;
}

/**
 * Master evaluator: Accurately evaluates any disease input (for Reports or Chat)
 * Returns strict 3-part format:
 * 🩺 Disease: <Name>
 * 🛡️ Precautions:
 * • <p1>
 * • <p2>
 * • <p3>
 * 👨‍⚕️ Suggested Doctor (in system):
 * <Only doctor who can treat them OR "No registered [Specialist] in system. Contact our doctors.">
 */
async function evaluateMedicalCondition(inputText, metadata = {}) {
  const combined = `${inputText || ''} ${metadata.category || ''} ${metadata.reportTitle || ''} ${metadata.notes || ''}`.trim();

  // Handle casual greetings gracefully
  const cleanInput = (inputText || '').trim().toLowerCase();
  if (/^(hi|hello|hey|good morning|good evening|good afternoon|who are you)[\s!.]*$/i.test(cleanInput)) {
    let docList = "";
    try {
      const doctors = await User.find({ role: 'Doctor' }).select('name specialization phone').lean();
      if (doctors && doctors.length > 0) {
        docList = doctors.map(doc => {
          const name = doc.name.trim().startsWith('Dr') ? doc.name.trim() : `Dr. ${doc.name.trim()}`;
          const spec = doc.specialization ? ` (${doc.specialization.trim()})` : '';
          const phone = doc.phone ? ` - Phone: ${doc.phone.trim()}` : '';
          return `• ${name}${spec}${phone}`;
        }).join('\n');
      }
    } catch (e) {}

    return `🩺 Disease: General Health Consultation

🛡️ Precautions:
• Please describe your specific symptoms or health questions.
• Note the duration, intensity, and any home remedies tried.
• Avoid unverified over-the-counter medications.

👨‍⚕️ Suggested Doctor (in system):
Please contact our registered doctors:
${docList || '• Clinic Helpdesk - Phone: 9886801223'}`;
  }

  // Check if input is empty or completely uninformative
  if (!combined || combined.length < 3) {
    return await buildUnknownDiseaseResponse();
  }

  // 1. Try local clinical dictionary of all popular diseases first for 100% accuracy and speed
  const localMatch = findPopularDiseaseMatch(combined);

  // 2. Try LLM for dynamic recognition if not matched locally
  let llmContent = null;
  if (!localMatch) {
    llmContent = await queryLLMForDisease(combined);
  }

  if (llmContent) {
    if (llmContent.includes('DISEASE: UNKNOWN') || llmContent.includes('Disease: UNKNOWN')) {
      return await buildUnknownDiseaseResponse();
    }

    // Parse LLM response
    const diseaseMatch = llmContent.match(/DISEASE:\s*(.+)/i);
    const specialtyMatch = llmContent.match(/SPECIALTY:\s*(.+)/i);
    const precautionsMatch = llmContent.match(/PRECAUTIONS:\s*([\s\S]+)/i);

    const diseaseName = diseaseMatch ? diseaseMatch[1].trim() : 'Evaluated Medical Condition';
    let specialty = specialtyMatch ? specialtyMatch[1].trim() : 'General Physician';
    
    // Also check local match on the diseaseName to verify specialty
    const secondaryMatch = findPopularDiseaseMatch(diseaseName);
    if (secondaryMatch) {
      specialty = secondaryMatch.specialty;
    }

    let precautionsText = "";
    if (precautionsMatch) {
      const lines = precautionsMatch[1].trim().split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))
        .map(l => `• ${l.replace(/^[-*•]\s*/, '')}`)
        .slice(0, 3);
      precautionsText = lines.join('\n');
    }

    if (!precautionsText) {
      precautionsText = "• Follow up with a clinical practitioner for physical examination.\n• Keep a record of current symptoms and vitals.\n• Avoid unprescribed pharmaceuticals.";
    }

    const doctorSuggestion = await getDoctorSuggestionForSpecialty(specialty);

    return `🩺 Disease: ${diseaseName}\n\n🛡️ Precautions:\n${precautionsText}\n\n👨‍⚕️ Suggested Doctor (in system):\n${doctorSuggestion}`;
  }

  // If local match was found
  if (localMatch) {
    const doctorSuggestion = await getDoctorSuggestionForSpecialty(localMatch.specialty);
    const precautionsText = localMatch.precautions.map(p => `• ${p}`).join('\n');
    return `🩺 Disease: ${localMatch.disease}\n\n🛡️ Precautions:\n${precautionsText}\n\n👨‍⚕️ Suggested Doctor (in system):\n${doctorSuggestion}`;
  }

  // If neither local dictionary nor LLM identified it -> show contact our doctors message
  return await buildUnknownDiseaseResponse();
}

module.exports = {
  evaluateMedicalCondition,
  findPopularDiseaseMatch,
  getDoctorSuggestionForSpecialty,
  buildUnknownDiseaseResponse
};
