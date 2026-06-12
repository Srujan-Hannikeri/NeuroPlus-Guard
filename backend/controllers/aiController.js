const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

exports.chatWithAI = async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType } = req.body;

    // Check if API key is provided
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing. Providing mock response.");
      return res.json({ reply: "Mock Response: I am your AI assistant. To enable full AI features, please provide a valid GEMINI_API_KEY in the backend .env file. For now, I can only provide this simulated response." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let contents = [prompt || "Hello!"];

    if (imageBase64) {
      // imageBase64 might come with data:image/png;base64, prefix. 
      // We need to strip it if present.
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
      
      // Override prompt if empty but file exists
      if (!prompt) {
          contents[0] = "What is in this image? If it is a skin allergy or medical symptom, please analyze it and provide information.";
      } else {
          // If the user provided a prompt, we might want to guide the AI to be a medical assistant
          contents[0] = "You are a helpful medical AI assistant. Analyze the user's prompt and the provided image. User prompt: " + prompt;
      }
    } else {
       // Just a text prompt
       contents[0] = "You are a helpful medical AI assistant. User prompt: " + prompt;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
      });
      res.json({ reply: response.text });
    } catch (apiError) {
      console.warn("Gemini API call failed, using mock fallback:", apiError.message);
      let simulatedReply = "I am currently running in offline simulation mode because the configured Gemini API key is invalid, leaked, or blocked by Google. To activate live AI, please update the GEMINI_API_KEY environment variable.\n\nBased on your description, here is a simulated general assessment:\n- **Analysis**: The symptoms described could be related to temporary fatigue, environmental changes, or mild dehydration.\n- **Recommendations**: Rest, drink plenty of fluids, and monitor your condition. If you experience severe pain, high fever, or breathing difficulties, please seek immediate medical attention from one of our platform doctors.";
      res.json({ reply: simulatedReply });
    }

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ message: error.message || 'Failed to process AI request' });
  }
};
