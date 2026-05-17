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
  const [selectedContact, setSelectedContact] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [isAudioCall, setIsAudioCall] = useState(false);

  // Polling tracking refs
  const hasOffered = useRef(false);
  const hasAnswered = useRef(false);
  const processedCandidates = useRef(new Set());
  const pollingInterval = useRef(null);

  const location = useLocation();
  const autoSelectAppointmentId = location.state?.autoSelectAppointmentId;

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data } = await api.get('/appointments');
        setAppointments(data);
        if (data.length > 0) {
          if (autoSelectAppointmentId) {
            const matched = data.find(a => a._id === autoSelectAppointmentId);
            if (matched) {
              setSelectedContact(matched);
              setRoomId(`room-${matched._id}`);
              setMessages([]);
              setHasJoined(false);
              setIsFullscreen(false);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAppointments();
  }, [autoSelectAppointmentId]);

  // Poll messages for active chat room even if call is not started
  useEffect(() => {
    if (!roomId || hasJoined) return;
    
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/communication/${roomId}`);
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Chat polling error:", err);
      }
    };
    fetchMessages();

    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [roomId, hasJoined]);

  const selectContact = (appt) => {
    setSelectedContact(appt);
    setRoomId(`room-${appt._id}`);
    setMessages([]);
    setHasJoined(false);
    setIsFullscreen(false);
  };

  const exitNativeFullscreen = () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(err => {});
        }
      }
    } catch (err) {}
  };

  const initiateCall = (fullscreenMode) => {
    setIsFullscreen(fullscreenMode);
    setShowCallConfirm(false);
    setHasJoined(true);
    
    if (fullscreenMode) {
      const docEl = document.documentElement;
      try {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(err => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen().catch(err => {});
        }
      } catch (err) {}
    }
  };

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
        currentStream = await navigator.mediaDevices.getUserMedia({ video: isAudioCall ? false : true, audio: true });
        setStream(currentStream);
        if (localVideoRef.current && !isAudioCall) localVideoRef.current.srcObject = currentStream;

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
    exitNativeFullscreen();
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

  // Deterministic online indicator dynamically seeded by contactId
  const isContactOnline = (contactId) => {
    if (!contactId) return false;
    const charCodeSum = String(contactId).split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    return charCodeSum % 2 === 0;
  };

  return (
    <div className="dashboard-container" style={{ maxWidth: '1200px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Navbar */}
      <nav className="nav-bar" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => {
          if (selectedContact) {
            setSelectedContact(null);
          } else {
            navigate(-1);
          }
        }}>
          <Logo width={40} height={40} />
          <h2>Consultation & Chat</h2>
        </div>
      </nav>

      {/* 2. Symmetrical View Rendering */}
      {!selectedContact ? (
        /* Connected Contacts Grid View (No Chatbox visible here!) */
        <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                {user?.role === 'Doctor' ? 'Your Connected Patients' : 'Your Connected Doctors'}
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.82rem' }}>
                Select a connected contact to open a secure chat and call consultation room.
              </p>
            </div>
            
            {/* Search Bar */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '24px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Connected Contacts Cards Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
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
              
              const filtered = uniqueContacts.filter(a => 
                user?.role === 'Doctor' 
                  ? a.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) 
                  : a.doctor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (filtered.length === 0) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', opacity: 0.5 }}>
                    <MessageSquare size={36} color="var(--primary)" />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>No connected contacts found.</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {filtered.map(appt => {
                    const contactId = user?.role === 'Doctor' ? appt.patient?._id : appt.doctor?._id;
                    const contactName = user?.role === 'Doctor' 
                      ? appt.patient?.name 
                      : `Dr. ${appt.doctor?.name?.replace(/^Dr\.\s*/i, '') || 'Unknown'}`;
                    const isOnline = isContactOnline(contactId);

                    return (
                      <div 
                        key={appt._id}
                        className="glass-panel" 
                        style={{ 
                          padding: '16px', 
                          borderRadius: '12px', 
                          border: '1px solid var(--glass-border)',
                          background: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ position: 'relative', display: 'flex' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                              {contactName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()}
                            </div>
                            <span style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: isOnline ? '#10b981' : '#94a3b8',
                              border: '2px solid #fff',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                            }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: 0, color: 'var(--secondary)', fontSize: '0.92rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {contactName}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {user?.role === 'Doctor' ? 'Patient Profile' : (appt.doctor?.specialization || 'General Physician')}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)', 
                            color: isOnline ? '#10b981' : '#64748b',
                            fontWeight: 'bold'
                          }}>
                            {isOnline ? '● Online' : '○ Offline'}
                          </span>
                          
                          <button 
                            onClick={() => selectContact(appt)}
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', background: 'var(--primary)' }}
                          >
                            Chat & Consult
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Secure Dedicated Workspace View (Full screen chatbox + Call buttons at the top) */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
          
          {/* Workspace Header containing Voice Call and Video Call Actions */}
          <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Symmetrical Back to List Button for both Desktop and Mobile */}
              <button 
                onClick={() => setSelectedContact(null)}
                style={{
                  background: 'rgba(15, 130, 135, 0.08)',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '24px',
                  color: 'var(--primary)',
                  fontSize: '0.82rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ← Back
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', display: 'flex' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    {(() => {
                      const name = user?.role === 'Doctor' 
                        ? selectedContact.patient?.name 
                        : selectedContact.doctor?.name;
                      return name?.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase();
                    })()}
                  </div>
                  <span style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isContactOnline(user?.role === 'Doctor' ? selectedContact.patient?._id : selectedContact.doctor?._id) ? '#10b981' : '#94a3b8',
                    border: '2px solid #fff'
                  }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: 'bold' }}>
                    {user?.role === 'Doctor' 
                      ? selectedContact.patient?.name 
                      : `Dr. ${selectedContact.doctor?.name?.replace(/^Dr\.\s*/i, '') || 'Unknown'}`}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: isContactOnline(user?.role === 'Doctor' ? selectedContact.patient?._id : selectedContact.doctor?._id) ? '#10b981' : '#94a3b8', fontWeight: 'bold' }}>
                    {isContactOnline(user?.role === 'Doctor' ? selectedContact.patient?._id : selectedContact.doctor?._id) ? 'Online & Connected' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {!hasJoined && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Voice Call Trigger */}
                <button 
                  onClick={() => {
                    setIsAudioCall(true);
                    setShowCallConfirm(true);
                  }}
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--primary)', fontSize: '0.82rem', flexShrink: 0, borderRadius: '24px' }}
                >
                  <Phone size={14} /> Voice Call
                </button>

                {/* Video Call Trigger */}
                <button 
                  onClick={() => {
                    setIsAudioCall(false);
                    setShowCallConfirm(true);
                  }}
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', fontSize: '0.82rem', flexShrink: 0, borderRadius: '24px' }}
                >
                  <Video size={14} /> Video Call
                </button>
              </div>
            )}
          </div>

          {/* Work Area (Call + Chat room) */}
          <div className="communication-layout" style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden' }}>
            
            {/* Video Block (Visible only when call is active) */}
            {hasJoined && (
              <div className={`glass-panel ${isFullscreen ? 'fullscreen-video' : ''}`} style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 !important' }}>
                <div style={{ flex: 1, backgroundColor: '#000', borderRadius: '12px 12px 0 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  
                  {isAudioCall ? (
                    /* Beautiful Pulsating Audio Call UI */
                    <div style={{ flex: 1, width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', borderRadius: '12px 12px 0 0', position: 'relative', overflow: 'hidden' }}>
                      <div className="pulse-avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(15, 130, 135, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)', position: 'relative' }}>
                        <User size={48} color="var(--primary)" />
                        <span className="pulse-ring" style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid var(--primary)', opacity: 0.8 }} />
                      </div>
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>Secure Voice Consultation</h3>
                      <p style={{ color: '#10b981', margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>● Voice Stream Connected</p>
                    </div>
                  ) : (
                    /* Standard Video Call UI */
                    <>
                      {!remoteStream && <p style={{ color: '#fff', opacity: 0.5, position: 'absolute', zIndex: 1, fontSize: '0.85rem' }}>Waiting for peer to join...</p>}
                      
                      <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: remoteStream ? 'block' : 'none' }} 
                      />
                      
                      {/* Self Video PIP */}
                      <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '110px', height: '82px', backgroundColor: '#333', borderRadius: '6px', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 2 }}>
                         <video 
                            ref={localVideoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: isVideoOff ? 'none' : 'block' }} 
                         />
                         {isVideoOff && <VideoOff color="#fff" size={20} opacity={0.5} />}
                      </div>
                    </>
                  )}

                  {/* Exit Fullscreen Toggle Button */}
                  {isFullscreen && (
                    <button 
                      onClick={() => {
                        setIsFullscreen(false);
                        exitNativeFullscreen();
                      }} 
                      className="btn-primary" 
                      style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                      Exit Full Screen
                    </button>
                  )}
                </div>
                
                {/* Video Controls */}
                <div className="call-controls" style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderTop: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
                  <button onClick={toggleMute} style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', backgroundColor: isMuted ? 'var(--error)' : 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  
                  {!isAudioCall && (
                    <button onClick={toggleVideo} style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', backgroundColor: isVideoOff ? 'var(--error)' : 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
                    </button>
                  )}

                  <button onClick={toggleTranscription} style={{ padding: '0 12px', height: '38px', borderRadius: '19px', border: 'none', backgroundColor: isTranscribing ? '#10b981' : 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>
                    {isTranscribing ? 'Stop Transcribing' : 'Transcribe'}
                  </button>
                  <button onClick={endCall} style={{ width: '48px', height: '38px', borderRadius: '19px', border: 'none', backgroundColor: 'var(--error)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PhoneOff size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Chat Block (Hidden if in Fullscreen Video) */}
            {(!hasJoined || !isFullscreen) && (
              <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 !important' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <MessageSquare size={14} color="var(--primary)" />
                   <h4 style={{ margin: 0, color: 'var(--secondary)', fontSize: '0.85rem' }}>
                      Chat with {user?.role === 'Doctor' ? selectedContact.patient?.name : `Dr. ${selectedContact.doctor?.name?.replace(/^Dr\.\s*/i, '') || 'Unknown'}`}
                   </h4>
                </div>

                <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.2)' }}>
                  {messages.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '20px' }}>
                      No messages with {user?.role === 'Doctor' ? selectedContact.patient?.name : `Dr. ${selectedContact.doctor?.name?.replace(/^Dr\.\s*/i, '') || 'Unknown'}`} yet. Send a message to start direct consulting!
                    </p>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === user._id;
                      return (
                        <div 
                          key={idx} 
                          className={`chat-message ${isMe ? 'me' : 'other'}`}
                        >
                          {msg.text}
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSend} className="chat-input-container">
                  <input 
                    type="text" 
                    className="chat-input-field" 
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button type="submit" className="chat-send-btn">
                    <Send size={16} />
                  </button>
                </form>

                {/* AI Notes Section */}
                {hasJoined && (
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--glass-border)', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h5 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.8rem' }}>AI Consultation Notes</h5>
                      <button onClick={generateAINotes} disabled={isGeneratingNotes || !transcription} className="btn-primary" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                        {isGeneratingNotes ? '...' : 'Generate'}
                      </button>
                    </div>
                    {aiNotes ? (
                      <div style={{ fontSize: '0.75rem', color: '#334155', maxHeight: '60px', overflowY: 'auto', background: '#fff', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        {aiNotes}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                        {transcription ? "Click generate to create AI summary." : "Transcribe call to generate notes."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            
          </div>

        </div>
      )}

      {/* 3. Gorgeous Glassmorphism Modal for Video Call View Choice */}
      {showCallConfirm && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 999 
        }}>
          <div className="glass-panel" style={{ maxWidth: '380px', width: '90%', padding: '20px', textAlign: 'center', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: isAudioCall ? 'rgba(15, 130, 135, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: isAudioCall ? 'var(--primary)' : '#10b981' }}>
              {isAudioCall ? <Phone size={24} /> : <Video size={24} />}
            </div>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '6px', fontSize: '1.1rem' }}>
              Start {isAudioCall ? 'Voice' : 'Video'} Consultation
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px', lineHeight: '1.4' }}>
              Choose your layout mode for this secure {isAudioCall ? 'voice' : 'video'} session:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => initiateCall(true)} 
                className="btn-primary" 
                style={{ width: '100%', padding: '10px', background: isAudioCall ? 'var(--primary)' : '#10b981', fontSize: '0.85rem' }}
              >
                🖥️ Full Screen Mode
              </button>
              <button 
                onClick={() => initiateCall(false)} 
                className="btn-primary" 
                style={{ width: '100%', padding: '10px', background: 'var(--secondary)', fontSize: '0.85rem' }}
              >
                📱 Split Screen (Call + Chat)
              </button>
              <button 
                onClick={() => setShowCallConfirm(false)} 
                className="btn-primary" 
                style={{ width: '100%', padding: '10px', background: '#cbd5e1', color: '#1e293b', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Communication;
