import React, { useState, useRef } from 'react';
import Logo from '../components/common/Logo';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ImagePlus, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const renderMarkdown = (text) => {
  if (!text) return null;
  // Convert basic markdown to HTML safely
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\n/g, '<br/>');
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

const AIChatbot = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your NeuroPlus AI assistant. Please describe your symptoms. Note: I am not a substitute for professional medical advice.' }
  ]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !image) return;

    // Add user message to UI
    const newMessages = [...messages, { sender: 'user', text: input, image: imagePreview }];
    setMessages(newMessages);
    
    const currentInput = input;
    const currentImage = image;

    setInput('');
    setImage(null);
    setImagePreview(null);
    setIsLoading(true);

    try {
      let imageBase64 = null;
      let mimeType = null;
      
      if (currentImage) {
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.readAsDataURL(currentImage);
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
        mimeType = currentImage.type;
      }

      const res = await axios.post(`${API_BASE_URL}/ai/chat`, {
        prompt: currentInput,
        imageBase64,
        mimeType
      });

      setMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
    } catch (error) {
      console.error("AI request failed", error);
      setMessages(prev => [...prev, { sender: 'bot', text: error.response?.data?.message || "Sorry, I am having trouble connecting to the server. Please check your connection or GEMINI_API_KEY." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '800px' }}>
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <Logo width={40} height={40} />
          <h2>AI Symptom Checker</h2>
        </div>
      </nav>

      <div className="glass-panel" style={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', background: msg.sender === 'user' ? 'var(--primary)' : '#e2e8f0', color: msg.sender === 'user' ? '#fff' : '#1e293b', padding: '12px 16px', borderRadius: '16px', maxWidth: '80%', overflowWrap: 'break-word', lineHeight: '1.5' }}>
              {msg.image && <img src={msg.image} alt="User uploaded" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px' }} />}
              {msg.text && (msg.sender === 'bot' ? renderMarkdown(msg.text) : <div>{msg.text}</div>)}
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: '#e2e8f0', color: '#1e293b', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 className="spinner" size={20} /> AI is thinking...
            </div>
          )}
        </div>
        {imagePreview && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
             <img src={imagePreview} alt="Preview" style={{ height: '40px', borderRadius: '4px' }} />
             <button type="button" onClick={() => { setImage(null); setImagePreview(null); }} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>Remove</button>
          </div>
        )}
        <form onSubmit={handleSend} style={{ display: 'flex', padding: '16px', borderTop: '1px solid var(--glass-border)', gap: '8px', alignItems: 'center' }}>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '8px' }}>
            <ImagePlus size={24} />
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            style={{ display: 'none' }} 
          />
          <input 
            type="text" 
            className="input-field" 
            style={{ flex: 1, borderRadius: '8px' }}
            placeholder="Type your symptoms here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ borderRadius: '8px', padding: '10px 20px' }} disabled={isLoading}>
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatbot;
