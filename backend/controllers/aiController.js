const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const analyzeSymptomsOffline = (prompt) => {
  const query = (prompt || '').toLowerCase();
  let analysis = "";
  let recommendations = [];
  
  if (query.includes('headache') || query.includes('migraine')) {
    analysis = "The description suggests a headache or migraine condition. This could be triggered by neurological factors, fatigue, dehydration, stress, or tension.";
    recommendations = [
      "Rest in a quiet, dark, and cool room.",
      "Stay hydrated by drinking plenty of water or electrolyte fluids.",
      "Apply a cold compress to your forehead or a warm wrap to your neck.",
      "Track your headache patterns, duration, and triggers (e.g., foods, stress, sleep changes) to share with your neurologist."
    ];
  } else if (query.includes('seizure') || query.includes('epilepsy') || query.includes('convulsion') || query.includes('fit')) {
    analysis = "This description relates to seizure activity or epilepsy, which requires immediate attention and professional neurological evaluation.";
    recommendations = [
      "Ensure a safe home environment to prevent physical injury during episodes.",
      "Take prescribed anti-epileptic medications strictly on time.",
      "Keep a detailed log of seizure frequency, duration, symptoms, and potential triggers.",
      "Seek emergency medical assistance immediately if a seizure lasts longer than 5 minutes or if multiple seizures occur in a row."
    ];
  } else if (query.includes('tremor') || query.includes('shak') || query.includes('parkinson')) {
    analysis = "Tremors or shaking movements can be associated with essential tremor, Parkinson's disease, or physiological factors like stress or anxiety.";
    recommendations = [
      "Limit caffeine, alcohol, and other neurological stimulants.",
      "Use weighted utensils or tools if tremors affect daily tasks like eating.",
      "Engage in regular physical therapy or movement exercises to support muscle control.",
      "Schedule a consultation with a neurologist specializing in movement disorders."
    ];
  } else if (query.includes('numb') || query.includes('tingl') || query.includes('neuropathy') || query.includes('pins')) {
    analysis = "Numbness or tingling (paresthesia) often indicates nerve irritation, spinal compression, or peripheral neuropathy.";
    recommendations = [
      "Avoid keeping limbs in positions that compress nerves (e.g. crossing legs, resting on elbows) for long periods.",
      "Maintain good ergonomic posture during daily activities.",
      "Monitor blood sugar levels closely, as peripheral neuropathy is a common complication of diabetes.",
      "Consult a doctor or neurologist for nerve conduction velocity (NCV) testing if symptoms persist."
    ];
  } else if (query.includes('forget') || query.includes('memory') || query.includes('alzheimer') || query.includes('dementia') || query.includes('confus')) {
    analysis = "Memory changes or confusion can stem from stress, sleep issues, vitamin deficiencies, or neurodegenerative conditions like Alzheimer's or dementia.";
    recommendations = [
      "Keep a structured daily routine and use tools like calendars, sticky notes, or medication organizers.",
      "Engage in brain-stimulating exercises like reading, puzzles, or new hobbies.",
      "Maintain active social connections and physical activity.",
      "Consult a doctor for a formal cognitive evaluation and blood tests to rule out reversible causes."
    ];
  } else {
    analysis = "Based on your description, the symptoms could be related to physical strain, temporary fatigue, stress, or mild dehydration.";
    recommendations = [
      "Ensure you get adequate rest and drink plenty of fluids.",
      "Monitor your condition and avoid strenuous physical or cognitive tasks for the next 24 hours.",
      "If you experience worsening symptoms, severe pain, chest tightness, or breathing difficulties, seek immediate medical care."
    ];
  }
  
  return `[NeuroPlus AI Offline Assessment]
Based on your input, here is a simulated clinical assessment of your symptoms:

- **Potential Analysis**: ${analysis}
- **Recommendations**:
${recommendations.map(r => `  * ${r}`).join('\n')}

*Disclaimer: This is an automated assessment running in offline fallback mode because the live AI service is currently unavailable. Please consult one of our platform doctors for an accurate medical diagnosis.*`;
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

exports.chatWithAI = async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType } = req.body;

    // Check if API key is provided
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
