const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const generatePrecautionsAndClinicalGuidance = (prompt, askMyDocReply) => {
  const query = (prompt || '').toLowerCase();
  let assessment = "";
  let precautions = [];
  let redFlags = [];

  if (query.includes('cough') || query.includes('cold') || query.includes('throat') || query.includes('phlegm') || query.includes('sneeze') || query.includes('bronch') || query.includes('congestion')) {
    assessment = "Your symptoms indicate respiratory or throat irritation, commonly caused by viral upper respiratory infections, allergic bronchitis, dry indoor air, or dust exposure.";
    precautions = [
      "Stay well-hydrated: Drink warm water, clear broths, or herbal teas with honey and ginger to soothe irritated airways.",
      "Practice steam inhalation 2 to 3 times daily or run a room humidifier to loosen chest congestion.",
      "Gargle with warm salt water (half teaspoon salt in warm water) twice daily to reduce throat inflammation.",
      "Avoid cold beverages, deep-fried foods, cigarette smoke, and exposure to sudden changes in air temperature.",
      "Sleep with your head slightly elevated using an extra pillow to prevent nocturnal coughing attacks.",
      "Rest your voice and avoid straining your throat."
    ];
    redFlags = [
      "Shortness of breath, wheezing, or difficulty catching your breath while resting.",
      "Persistent high fever (above 101°F / 38.3°C) lasting longer than 3 days.",
      "Coughing up blood or dark rusty-colored phlegm.",
      "Sharp, localized chest pain when taking a deep breath."
    ];
  } else if (query.includes('headache') || query.includes('migraine') || query.includes('head ache')) {
    assessment = "The symptoms point toward a headache or migraine episode, which may be triggered by muscle tension, eye strain, dehydration, stress, lack of sleep, or neurological vascular shifts.";
    precautions = [
      "Rest in a quiet, dark, well-ventilated room and close your eyes for 30–45 minutes.",
      "Hydrate immediately with water or electrolyte fluids, as dehydration is a very common headache trigger.",
      "Apply a cold gel pack or ice wrapped in a towel to your forehead/temples, or a warm wrap to tight neck muscles.",
      "Take a complete break from digital screens (phones, laptops, TV) and bright fluorescent lighting.",
      "Gently massage tight neck, temple, and shoulder muscles to relieve muscular tension.",
      "Maintain regular meal intervals to avoid hypoglycemia-induced headaches."
    ];
    redFlags = [
      "Sudden, explosive 'thunderclap' headache reaching maximum intensity in seconds.",
      "Headache accompanied by stiff neck, high fever, confusion, or difficulty speaking.",
      "Visual disturbances, sudden numbness, or weakness on one side of the face or body."
    ];
  } else if (query.includes('fever') || query.includes('temperature') || query.includes('chills')) {
    assessment = "Elevated body temperature suggests an active immune response, frequently associated with a viral or bacterial infection.";
    precautions = [
      "Prioritize absolute bed rest to allow your immune system to recover.",
      "Drink plenty of fluids (boiled water, coconut water, soups, ORS) to prevent fever-induced dehydration.",
      "Wear light, breathable cotton clothing and ensure the room is comfortably cool and ventilated.",
      "Use lukewarm water sponge baths if body temperature rises uncomfortably (do not use cold water or alcohol wipes).",
      "Keep a written log of temperature readings taken every 4 hours."
    ];
    redFlags = [
      "Fever exceeding 103°F (39.4°C) or not responding to recommended antipyretics.",
      "Fever accompanied by petechial skin rashes, stiff neck, or extreme lethargy.",
      "Inability to keep fluids down due to persistent vomiting."
    ];
  } else if (query.includes('numb') || query.includes('tingl') || query.includes('neuropathy') || query.includes('pins')) {
    assessment = "Numbness and tingling (paresthesia) commonly result from peripheral nerve compression, neuropathy, circulation issues, or spinal nerve irritation.";
    precautions = [
      "Avoid sustained postures that pinch nerves, such as crossing legs, resting on elbows, or repetitive wrist flexion.",
      "Maintain ergonomic posture at your desk and take frequent movement breaks.",
      "Inspect feet and hands daily for unnoticed cuts or pressure spots, especially if you have high blood sugar.",
      "Wear comfortable, well-cushioned shoes and avoid walking barefoot.",
      "Avoid prolonged exposure of extremities to extreme cold."
    ];
    redFlags = [
      "Sudden onset of numbness spreading rapidly across an entire limb or face.",
      "Loss of bowel or bladder control.",
      "Loss of motor strength or inability to lift your foot (foot drop)."
    ];
  } else if (query.includes('tremor') || query.includes('shak') || query.includes('parkinson')) {
    assessment = "Involuntary shaking or tremors can be related to essential tremor, stress/fatigue, metabolic factors, or neurological movement conditions.";
    precautions = [
      "Strictly minimize or eliminate stimulants like caffeine, energy drinks, nicotine, and alcohol.",
      "Ensure 7–8 hours of sound sleep, as fatigue significantly accentuates tremor frequency.",
      "Use weighted utensils, mugs with lids, and adaptive grips to simplify daily activities.",
      "Practice deep breathing, meditation, or progressive muscle relaxation to decrease adrenaline surges."
    ];
    redFlags = [
      "Rapidly progressing tremors interfering with walking or balance.",
      "Tremors accompanied by sudden stiffness, rigidity, or frequent falls."
    ];
  } else if (query.includes('stomach') || query.includes('abdom') || query.includes('vomit') || query.includes('nausea') || query.includes('diarrhea') || query.includes('acidity') || query.includes('gas')) {
    assessment = "Gastrointestinal discomfort, acidity, or nausea often results from acute gastritis, indigestion, food sensitivity, or gastroenteritis.";
    precautions = [
      "Switch to bland, easily digestible meals (rice porridge, bananas, toast, curd/yogurt).",
      "Avoid spicy, oily, acidic (citrus/tomato), caffeinated, or carbonated items.",
      "Sip oral rehydration salts (ORS) or electrolyte water frequently in small sips.",
      "Do not lie down immediately after eating; wait at least 2 hours before reclining.",
      "Eat smaller, more frequent meals rather than large heavy portions."
    ];
    redFlags = [
      "Severe, sharp abdominal pain that prevents standing straight or touching the abdomen.",
      "Blood in vomit (resembling coffee grounds) or black tarry stools.",
      "Signs of dehydration: dry mouth, sunken eyes, no urination for over 8 hours."
    ];
  } else if (query.includes('bp') || query.includes('pressure') || query.includes('hypertension') || query.includes('dizz')) {
    assessment = "Fluctuations in blood pressure or dizziness can arise from stress, dehydration, postural changes, electrolyte shifts, or cardiovascular strain.";
    precautions = [
      "Sit or lie down immediately in a safe position to prevent falls if feeling lightheaded.",
      "Reduce dietary salt intake and avoid processed foods high in sodium.",
      "Hydrate adequately and avoid abrupt transitions from lying down to standing up.",
      "Avoid smoking, alcohol, and excessive caffeine.",
      "Record your blood pressure readings twice daily (morning and evening)."
    ];
    redFlags = [
      "Blood pressure reading exceeding 180/120 mmHg.",
      "Chest tightness, shortness of breath, sudden severe headache, or blurred vision."
    ];
  } else {
    assessment = "Your reported symptoms suggest physical strain, temporary fatigue, or early physiological stress.";
    precautions = [
      "Prioritize 7 to 8 hours of restorative sleep to support natural biological recovery.",
      "Stay well hydrated with clean water and nutrient-rich warm fluids.",
      "Avoid strenuous physical or mental overexertion for the next 24 to 48 hours.",
      "Keep a symptom log noting exact onset, triggers, and any relief factors."
    ];
    redFlags = [
      "Symptoms that rapidly worsen or do not show improvement after 48 hours.",
      "Unexplained high fever, chest pain, or breathing discomfort."
    ];
  }

  let finalOutput = `### 🩺 Clinical Overview
${assessment}

### 🛡️ Recommended Precautions & Care Measures to be Done:
${precautions.map(p => `• ${p}`).join('\n')}

### ⚠️ Warning Signs & Emergency Red Flags:
${redFlags.map(r => `• ${r}`).join('\n')}

### 👨‍⚕️ Specialist Consultation (via AskMyDoc API):
${askMyDocReply || 'Consult a qualified General Physician or specialist to receive a personalized medical examination.'}`;

  return finalOutput;
};

const analyzeSymptomsOffline = (prompt) => {
  return generatePrecautionsAndClinicalGuidance(prompt, null);
};

const generateOfflineConsultationNotes = (prompt) => {
  const transcriptPart = prompt.replace("Generate a brief medical summary/notes from this consultation transcript:", "").trim();
  
  if (!transcriptPart) {
    return `[NeuroPlus AI Offline Notes]
- **Session type**: Voice/Video Consultation
- **Summary**: No active conversation transcript was captured.
- **Recommendations**: Please ensure microphone permissions are enabled during call sessions to capture speech notes.`;
  }
  
  const terms = transcriptPart.toLowerCase();
  let symptomsDetected = [];
  let adviceGiven = [];
  
  if (terms.includes('headache') || terms.includes('migraine')) {
    symptomsDetected.push("Headache / Migraine symptoms");
    adviceGiven.push("Rest in a dark, quiet room; maintain hydration.");
  }
  if (terms.includes('seizure') || terms.includes('fit') || terms.includes('epilepsy')) {
    symptomsDetected.push("Seizure activity / episodes");
    adviceGiven.push("Adhere strictly to anti-epileptic drug schedule; avoid triggers.");
  }
  if (terms.includes('tremor') || terms.includes('shaking')) {
    symptomsDetected.push("Tremors or involuntary shaking");
    adviceGiven.push("Avoid stimulants; practice coordination exercises.");
  }
  if (terms.includes('numb') || terms.includes('tingl') || terms.includes('neuropathy')) {
    symptomsDetected.push("Numbness / tingling / neuropathy");
    adviceGiven.push("Avoid nerve compression; follow up with neurologist.");
  }
  if (terms.includes('pain')) {
    symptomsDetected.push("Pain or discomfort reported");
    adviceGiven.push("Rest, apply warm/cold compress; check pain levels.");
  }
  if (terms.includes('medicine') || terms.includes('dosage') || terms.includes('pill') || terms.includes('tablet')) {
    symptomsDetected.push("Prescription / medication schedule discussed");
    adviceGiven.push("Take all prescribed medications exactly as directed.");
  }
  
  if (symptomsDetected.length === 0) {
    symptomsDetected.push("General wellness consultation");
  }
  if (adviceGiven.length === 0) {
    adviceGiven.push("Get sufficient rest, stay hydrated, and report any new symptoms.");
  }
  
  return `[NeuroPlus AI Offline Notes]
Here is a summary of the consultation:

- **Key Symptoms/Topics Discussed**:
${symptomsDetected.map(s => `  * ${s}`).join('\n')}

- **Patient Advice & Recommendations**:
${adviceGiven.map(a => `  * ${a}`).join('\n')}

- **Transcribed Conversation Snippet**: "${transcriptPart.substring(0, 180)}${transcriptPart.length > 180 ? '...' : ''}"

*Disclaimer: This note was generated using localized offline rules because the live AI service is currently unavailable.*`;
};

const chatWithAskMyDoc = async (message, history = []) => {
  try {
    const response = await fetch('https://api.askmydoc.in/api/rag/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history || [],
        session_id: 'chat-' + Date.now(),
        top_k: 4
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.reply) {
        let fullReply = data.reply;
        if (data.results && data.results.length > 0) {
          const docList = data.results
            .map(d => `• **${d.name || d.first_name + ' ' + d.last_name}** (${d.specialty || 'Medical Specialist'})`)
            .join('\n');
          fullReply += `\n\n**Recommended Verified Specialists (via AskMyDoc):**\n${docList}`;
        }
        return fullReply;
      }
    }
  } catch (err) {
    console.warn('AskMyDoc chat request error:', err.message);
  }
  return null;
};

exports.chatWithAI = async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType, history } = req.body;

    // Use AskMyDoc API and comprehensive clinical precautions engine
    if (!imageBase64 && prompt && !prompt.startsWith("Generate a brief medical summary/notes from this consultation transcript:")) {
      const askMyDocReply = await chatWithAskMyDoc(prompt, history);
      const combinedReply = generatePrecautionsAndClinicalGuidance(prompt, askMyDocReply);
      return res.json({ reply: combinedReply, source: 'AskMyDoc AI' });
    }

    // Check if API key is provided for Gemini fallback / image analysis
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing. Providing rule-based offline response.");
      if (prompt && prompt.startsWith("Generate a brief medical summary/notes from this consultation transcript:")) {
        return res.json({ reply: generateOfflineConsultationNotes(prompt) });
      }
      return res.json({ reply: analyzeSymptomsOffline(prompt) });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let contents = [prompt || "Hello!"];

    if (imageBase64) {
      let base64Data = imageBase64;
      if (imageBase64.includes('base64,')) {
        base64Data = imageBase64.split('base64,')[1];
      }

      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "image/jpeg"
        }
      });
      
      if (!prompt) {
          contents[0] = "What is in this image? If it is a skin allergy or medical symptom, please analyze it and provide information.";
      } else {
          contents[0] = "You are a helpful medical AI assistant. Analyze the user's prompt and the provided image. User prompt: " + prompt;
      }
    } else {
        contents[0] = "You are a helpful medical AI assistant. User prompt: " + prompt;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
      });
      res.json({ reply: response.text });
    } catch (apiError) {
      console.warn("Gemini API call failed, using rule-based offline fallback:", apiError.message);
      if (prompt && prompt.startsWith("Generate a brief medical summary/notes from this consultation transcript:")) {
        return res.json({ reply: generateOfflineConsultationNotes(prompt) });
      }
      return res.json({ reply: analyzeSymptomsOffline(prompt) });
    }

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ message: error.message || 'Failed to process AI request' });
  }
};
