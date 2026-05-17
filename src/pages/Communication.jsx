import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Video, Send, Mic, MicOff, VideoOff, PhoneOff, User, MessageSquare, ShieldCheck, Heart, Search } from 'lucide-react';
import { API_BASE_URL } from '../config';
import axios from 'axios';

const Communication = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(''); 
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [aiNotes, setAiNotes] = useState('');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const recognitionRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);

  // Polling tracking refs
  const hasOffered = useRef(false);
  const hasAnswered = useRef(false);
  const processedCandidates = useRef(new Set());
  const pollingInterval = useRef(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data } = await api.get('/appointments');
        setAppointments(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAppointments();
  }, []);

  const createPeer = (currentStream) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    peer.onicecandidate = async (event) => {
      if (event.candidate && roomId) {
        try {
          await api.post(`/communication/${roomId}/signal`, {
            candidate: event.candidate
          });
        } catch (e) { console.error("Error sending ICE candidate", e); }
      }
    };

    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    currentStream.getTracks().forEach(track => {
      peer.addTrack(track, currentStream);
    });

    return peer;
  };

  useEffect(() => {
    if (!hasJoined || !roomId) return;
    
    let currentStream = null;
    let peer = null;

    const startMediaAndPolling = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(currentStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = currentStream;

        peer = createPeer(currentStream);
        peerRef.current = peer;

        // Force Doctor to be the offerer to avoid race conditions
        if (user?.role === 'Doctor') {
          peer.onnegotiationneeded = async () => {
            if (hasOffered.current) return;
            hasOffered.current = true;
            try {
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              await api.post(`/communication/${roomId}/signal`, { offer: peer.localDescription });
            } catch (error) {
              console.error("Negotiation needed error", error);
            }
          };
        }

        // Start polling the stateless API every 2 seconds
        pollingInterval.current = setInterval(async () => {
          try {
            const { data } = await api.get(`/communication/${roomId}`);
            
            // Handle Messages Sync
            if (data.messages && data.messages.length > 0) {
              setMessages(data.messages);
            }

            // If Patient, answer the offer
            if (user?.role === 'Patient' && data.offer && !hasAnswered.current) {
              hasAnswered.current = true;
              await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              await api.post(`/communication/${roomId}/signal`, { answer: peer.localDescription });
            }

            // If Doctor, accept the answer
            if (user?.role === 'Doctor' && data.answer && hasOffered.current && peer.signalingState !== 'stable') {
              await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
            }

            // Add new ICE candidates
            if (data.iceCandidates) {
              for (const cand of data.iceCandidates) {
                if (cand.senderId !== user._id && !processedCandidates.current.has(cand._id)) {
                  processedCandidates.current.add(cand._id);
                  await peer.addIceCandidate(new RTCIceCandidate(cand.candidate)).catch(e => console.error(e));
                }
              }
            }
          } catch (error) {
            console.error("Polling error", error);
          }
        }, 2000);

      } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("Unable to access camera or microphone. Please check your permissions.");
      }
    };
    startMediaAndPolling();

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.close();
      }
    };
  }, [hasJoined, roomId, user]);

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleTranscription = () => {
    if (isTranscribing) {
      recognitionRef.current?.stop();
      setIsTranscribing(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition is not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscription(prev => prev + ' ' + currentTranscript);
      };
      recognition.start();
      recognitionRef.current = recognition;
      setIsTranscribing(true);
    }
  };

  const generateAINotes = async () => {
    if (!transcription.trim()) return alert("No transcription available to generate notes.");
    setIsGeneratingNotes(true);
    try {
      const formData = new FormData();
      formData.append('prompt', `Generate a brief medical summary/notes from this consultation transcript: ${transcription}`);
      const res = await axios.post(`${API_BASE_URL}/ai/chat`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAiNotes(res.data.reply);
    } catch (error) {
      console.error(error);
      alert("Failed to generate notes.");
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) recognitionRef.current.stop();
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    navigate(-1);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !roomId) return;
    
    const messageText = input;
    setInput('');
    // Optimistic UI update
    setMessages(prev => [...prev, { senderId: user._id, text: messageText }]);

    try {
      await api.post(`/communication/${roomId}/message`, { text: messageText });
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '1200px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav-bar" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <Logo width={40} height={40} />
          <h2>Active Consultation</h2>
        </div>
      </nav>

      <div className="communication-layout" style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden', paddingBottom: '24px' }}>
        {/* Video Area */}
        <div className="glass-panel" style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, backgroundColor: '#000', borderRadius: '16px 16px 0 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            
            {!hasJoined ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '24px', background: '#1e293b' }}>
                <h3 style={{ color: '#fff', marginBottom: '16px', textAlign: 'center' }}>
                  {user?.role === 'Doctor' ? 'Select Patient to Call' : 'Select Doctor to Call'}
                </h3>
                
                <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px auto', width: '100%' }}>
                  <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search name..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'grid', gap: '12px', maxWidth: '500px', margin: '0 auto', width: '100%', overflowY: 'auto', maxHeight: '400px' }}>
                  {(() => {
                    const uniqueContacts = [];
                    const seenIds = new Set();
                    appointments.forEach(appt => {
                      const contactId = user?.role === 'Doctor' ? appt.patient?._id : appt.doctor?._id;
                      if (contactId && !seenIds.has(contactId)) {
                        seenIds.add(contactId);
                        uniqueContacts.push(appt);
                      }
                    });
                    
                    return uniqueContacts
                      .filter(a => user?.role === 'Doctor' ? a.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) : a.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(appt => (
                        <div key={appt._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#334155', padding: '16px', borderRadius: '8px' }}>
                          <div>
                            <p style={{ color: '#fff', fontWeight: 'bold' }}>
                              {user?.role === 'Doctor' ? appt.patient?.name : `Dr. ${appt.doctor?.name}`}
                            </p>
                            <p style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{new Date(appt.scheduledAt || appt.createdAt).toLocaleDateString()}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setRoomId(`room-${appt._id}`);
                              setHasJoined(true);
                            }}
                            className="btn-primary" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#10b981' }}>
                            <Video size={16} /> Call
                          </button>
                        </div>
                    ));
                  })()}
                  {appointments.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>No contacts found.</p>}
                </div>
              </div>
            ) : (
              <>
                {!remoteStream && <p style={{ color: '#fff', opacity: 0.5, position: 'absolute', zIndex: 1 }}>Waiting for WebRTC Peer to connect...</p>}
                
                {/* Remote Video Container */}
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: remoteStream ? 'block' : 'none' }} 
                />
                
                {/* Self Video PIP Placeholder */}
                <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '200px', height: '150px', backgroundColor: '#333', borderRadius: '8px', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                   <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: isVideoOff ? 'none' : 'block' }} 
                   />
                   {isVideoOff && <VideoOff color="#fff" size={32} opacity={0.5} />}
                </div>
              </>
            )}
          </div>
          
          {/* Controls */}
          <div className="call-controls" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', borderTop: '1px solid var(--glass-border)' }}>
            <button 
              onClick={toggleMute} 
              style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', backgroundColor: isMuted ? 'var(--error)' : 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isMuted ? <MicOff /> : <Mic />}
            </button>
            <button 
              onClick={toggleVideo}
              style={{ width: '50px', height: '50px', borderRadius: '50%', border: 'none', backgroundColor: isVideoOff ? 'var(--error)' : 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isVideoOff ? <VideoOff /> : <Video />}
            </button>
            <button 
              onClick={toggleTranscription}
              style={{ padding: '0 20px', height: '50px', borderRadius: '25px', border: 'none', backgroundColor: isTranscribing ? '#10b981' : 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {isTranscribing ? 'Stop Transcribing' : 'Transcribe'}
            </button>
            <button 
              onClick={endCall}
              style={{ width: '60px', height: '50px', borderRadius: '25px', border: 'none', backgroundColor: 'var(--error)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneOff />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <MessageSquare size={20} color="var(--primary)" />
             <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>Chat</h3>
          </div>
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => {
              const isMe = msg.senderId === user._id;
              return (
              <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', background: isMe ? 'var(--primary)' : '#e2e8f0', color: isMe ? '#fff' : '#1e293b', padding: '10px 14px', borderRadius: '12px', maxWidth: '80%' }}>
                {msg.text}
              </div>
            )})}
          </div>
          <form onSubmit={handleSend} style={{ display: 'flex', padding: '12px', borderTop: '1px solid var(--glass-border)' }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ flex: 1, borderRadius: '8px 0 0 8px', borderRight: 'none', padding: '10px' }}
              placeholder="Type message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!hasJoined}
            />
            <button type="submit" className="btn-primary" disabled={!hasJoined} style={{ borderRadius: '0 8px 8px 0', padding: '10px 16px' }}>Send</button>
          </form>

          {/* AI Notes Section */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ color: 'var(--primary)' }}>AI Consultation Notes</h4>
              <button onClick={generateAINotes} disabled={isGeneratingNotes || !transcription} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                {isGeneratingNotes ? 'Generating...' : 'Generate Notes'}
              </button>
            </div>
            {aiNotes ? (
              <div style={{ fontSize: '0.85rem', color: '#334155', maxHeight: '100px', overflowY: 'auto', background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                {aiNotes}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {transcription ? "Transcription active. Click generate to create summary." : "Start transcribing the call to generate AI notes."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communication;
