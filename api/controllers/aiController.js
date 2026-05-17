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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });

    res.json({ reply: response.text });

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ message: error.message || 'Failed to process AI request' });
  }
};
