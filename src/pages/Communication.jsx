import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
  const videoCallContainerRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [isAudioCall, setIsAudioCall] = useState(false);
  const [newMessageCounts, setNewMessageCounts] = useState({});
  const [lastReadCounts, setLastReadCounts] = useState({});
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [lastMessages, setLastMessages] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeOffer, setActiveOffer] = useState(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [globalIncomingCall, setGlobalIncomingCall] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync fullscreen state with native browser escapes/events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Polling tracking refs
  const hasOffered = useRef(false);
  const hasAnswered = useRef(false);
  const processedCandidates = useRef(new Set());
  const pollingInterval = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const contactIdParam = searchParams.get('contactId');
  const location = useLocation();
  const autoSelectAppointmentId = location.state?.autoSelectAppointmentId;

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data } = await api.get('/appointments');
        setAppointments(data);
        if (contactIdParam) {
          if (Array.isArray(data) && data.length > 0) {
            const matched = data.find(a => {
              const cId = user?.role === 'Doctor' ? a.patient?._id : a.doctor?._id;
              return cId === contactIdParam;
            });
            if (matched) {
              setSelectedContact(matched);
              setRoomId(`room-${matched._id}`);
              setMessages([]);
              setHasJoined(false);
              setIsFullscreen(false);
            }
          }
        } else if (autoSelectAppointmentId) {
          if (Array.isArray(data) && data.length > 0) {
            const matched = data.find(a => a._id === autoSelectAppointmentId);
            if (matched) {
              setSelectedContact(matched);
              setRoomId(`room-${matched._id}`);
              setMessages([]);
              setHasJoined(false);
              setIsFullscreen(false);
            }
          }
        } else {
          // If no search param or state is set, clear the active workspace to return to grid list
          setSelectedContact(null);
          setRoomId('');
          setMessages([]);
          setHasJoined(false);
          setIsFullscreen(false);
          setActiveOffer(null);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAppointments();
  }, [autoSelectAppointmentId, contactIdParam, user]);

  // Poll messages and signaling for active chat room even if call is not started
  useEffect(() => {
    if (!roomId || hasJoined) return;
    
    const fetchMessagesAndSignal = async () => {
      try {
        const { data } = await api.get(`/communication/${roomId}`);
        if (data.messages) {
          setMessages(data.messages);
          setNewMessageCounts(prev => ({ ...prev, [roomId]: 0 }));
        }
        // Sync active offer state
        if (data.offer && !data.answer) {
          setActiveOffer(data.offer);
        } else {
          setActiveOffer(null);
        }
      } catch (err) {
        console.error("Chat polling error:", err);
      }
    };
    fetchMessagesAndSignal();

    const interval = setInterval(fetchMessagesAndSignal, 2500);
    return () => clearInterval(interval);
  }, [roomId, hasJoined]);

  const selectContact = (appt) => {
    const contactId = user?.role === 'Doctor' ? appt.patient?._id : appt.doctor?._id;
    if (contactId) {
      setSearchParams({ contactId });
    }
    const rId = `room-${appt._id}`;
    // Mark this room as read immediately in frontend state
    setNewMessageCounts(prev => ({ ...prev, [rId]: 0 }));
    setSelectedContact(appt);
    setRoomId(rId);
    setMessages([]);
    setHasJoined(false);
    setIsFullscreen(false);
    setActiveOffer(null);
  };

  // Poll all rooms for new message counts and incoming calls globally
  useEffect(() => {
    if (hasJoined) return; // Skip background room polling when user is actively on a live call
    const apptList = Array.isArray(appointments) ? appointments : [];
    if (apptList.length === 0) return;
    const pollAllRooms = async () => {
      const counts = {};
      const lastMsgs = {};
      let activeCallIncoming = null;

      await Promise.all(apptList.map(async appt => {
        const rId = `room-${appt._id}`;
        try {
          const { data } = await api.get(`/communication/${rId}`);
          // Filter to messages sent by the other user that are not marked as seen yet
          counts[rId] = data.messages?.filter(msg => msg.senderId !== user?._id && !msg.seen).length || 0;
          if (data.messages && data.messages.length > 0) {
            lastMsgs[rId] = data.messages[data.messages.length - 1];
          }

          // Call incoming detection: if there is an active offer, no answer, and we are not the sender
          if (data.offer && !data.answer && data.offer.senderId !== user?._id) {
            activeCallIncoming = {
              appointment: appt,
              roomId: rId,
              offer: data.offer
            };
          }
        } catch {}
      }));

      setNewMessageCounts(prev => ({ ...prev, ...counts }));
      setLastMessages(prev => ({ ...prev, ...lastMsgs }));
      setGlobalIncomingCall(activeCallIncoming);
    };

    pollAllRooms();
    const interval = setInterval(pollAllRooms, 5000);
    return () => clearInterval(interval);
  }, [appointments, user, hasJoined]);

  // Send heartbeat every 20s so others can see us as online
  useEffect(() => {
    const ping = () => api.post('/communication/heartbeat').catch(() => {});
    ping();
    const interval = setInterval(ping, 20000);
    return () => clearInterval(interval);
  }, []);

  // Poll online users list every 5s
  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const { data } = await api.get('/communication/online-users');
        setOnlineUserIds(new Set(data.onlineUserIds || []));
      } catch {}
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 5000);
    return () => clearInterval(interval);
  }, []);

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
    setActiveOffer(null);
    
    if (fullscreenMode) {
      setTimeout(() => {
        const el = videoCallContainerRef.current;
        if (el) {
          try {
            if (el.requestFullscreen) {
              el.requestFullscreen().catch(err => {});
            } else if (el.webkitRequestFullscreen) {
              el.webkitRequestFullscreen().catch(err => {});
            }
          } catch (err) {
            console.error("Fullscreen request failed", err);
          }
        }
      }, 150);
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
    hasOffered.current = false;
    hasAnswered.current = false;
    processedCandidates.current.clear();

    const startMediaAndPolling = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: isAudioCall ? false : true, audio: true });
        setStream(currentStream);
        if (localVideoRef.current && !isAudioCall) localVideoRef.current.srcObject = currentStream;

        peer = createPeer(currentStream);
        peerRef.current = peer;

        // Whoever initiated the call is the offerer to support role-independent calls
        if (isInitiator) {
          peer.onnegotiationneeded = async () => {
            if (hasOffered.current) return;
            hasOffered.current = true;
            try {
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              const offerPayload = {
                type: peer.localDescription.type,
                sdp: peer.localDescription.sdp,
                senderId: user._id
              };
              await api.post(`/communication/${roomId}/signal`, { offer: offerPayload });
            } catch (error) {
              console.error("Negotiation needed error", error);
            }
          };
        }

        // Start polling the stateless API every 2 seconds
        pollingInterval.current = setInterval(async () => {
          try {
            const { data } = await api.get(`/communication/${roomId}`);
            
            // Auto-Disconnect detection: if counterpart ended call, their endCall cleared signaling.
            // When we poll and see no active offer/answer but we are inside call, we shut down too!
            // We gate this check by hasOffered/hasAnswered to avoid startup race conditions.
            const isNegotiated = isInitiator ? hasOffered.current : hasAnswered.current;
            if (isNegotiated && !data.offer && !data.answer) {
              if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
              }
              if (peerRef.current) {
                peerRef.current.close();
                peerRef.current = null;
              }
              if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
              }
              exitNativeFullscreen();
              setIsFullscreen(false);
              setStream(null);
              setRemoteStream(null);
              setHasJoined(false);
              setSelectedContact(null);
              setRoomId('');
              setSearchParams({});
              return;
            }

            // Handle Messages Sync
            if (data.messages && data.messages.length > 0) {
              setMessages(data.messages);
            }

            // If not initiator, answer the offer
            if (!isInitiator && data.offer && !hasAnswered.current) {
              hasAnswered.current = true;
              await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              await api.post(`/communication/${roomId}/signal`, { answer: peer.localDescription });
            }

            // If initiator, accept the answer
            if (isInitiator && data.answer && hasOffered.current && peer.signalingState !== 'stable') {
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

  // Close peer connections, turn off camera/microphone hardware, clear DB states, and return to grid list
  const endCall = () => {
    // 1. Stop all tracks in the active media stream (switches off camera & mic)
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    // 2. Close peer connection
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    // 3. Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // 4. Clear polling interval
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    // 5. Clear call signaling state in MongoDB backend so counterpart's polling detects disconnection
    if (roomId) {
      api.post(`/communication/${roomId}/signal`, { clearSignal: true }).catch(err => {
        console.error("Failed to clear signal state", err);
      });
    }

    // 6. Exit native fullscreen
    exitNativeFullscreen();
    setIsFullscreen(false);
    
    // 7. Reset local WebRTC and call states
    setStream(null);
    setRemoteStream(null);
    setHasJoined(false);
    setActiveOffer(null);
    
    // 8. Reset selected contact to go back to Connected Contacts Grid list
    setSelectedContact(null);
    setRoomId('');
    setSearchParams({});
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

  // Real online check using heartbeat-tracked IDs
  const isContactOnline = (contactId) => {
    if (!contactId) return false;
    return onlineUserIds.has(String(contactId));
  };

  const totalOtherUnread = Object.entries(newMessageCounts)
    .filter(([rId, count]) => rId !== roomId && count > 0)
    .reduce((sum, [_, count]) => sum + count, 0);

  return (
    <div className="consultation-room-page-root">
      
      {/* 1. Navbar */}
      <nav className="nav-bar" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo width={40} height={40} />
          <h2>Consultation & Chat</h2>
        </div>
      </nav>

      {/* Global Incoming Call Alert Banner */}
      {globalIncomingCall && (!selectedContact || roomId !== globalIncomingCall.roomId) && (
        <div 
          onClick={() => {
            setIsAudioCall(globalIncomingCall.offer.type === 'audio');
            setIsInitiator(false);
            selectContact(globalIncomingCall.appointment);
            setTimeout(() => {
              initiateCall(false);
            }, 150);
          }}
          className="pulse-incoming-call"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            padding: '14px 20px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            marginBottom: '16px',
            animation: 'pulse 2.5s infinite',
            zIndex: 9999,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Phone size={20} style={{ animation: 'bounce 1s infinite' }} />
            <div>
              <h5 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.92rem', letterSpacing: '0.3px' }}>
                Incoming Consultation Call from {user?.role === 'Doctor' ? globalIncomingCall.appointment.patient?.name : `Dr. ${globalIncomingCall.appointment.doctor?.name?.replace(/^Dr\.\s*/i, '')}`}
              </h5>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.95 }}>Click here to answer and join the secure voice/video session immediately.</p>
            </div>
          </div>
          <button 
            style={{ 
              background: '#fff', 
              color: '#10b981', 
              border: 'none', 
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontSize: '0.78rem', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
          >
            Answer Call
          </button>
        </div>
      )}

      {/* 2. Mutually Exclusive View Rendering */}
      {!selectedContact ? (
        /* Connected Contacts Grid View (Full screen width!) */
        <div className="glass-panel" style={{ flex: 1, padding: isMobile ? '12px' : '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
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
              const apptList = Array.isArray(appointments) ? appointments : [];
              const uniqueContacts = [];
              const seenIds = new Set();
              apptList.forEach(appt => {
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
                <div className="contact-card-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', width: '100%' }}>
                  {filtered.map(appt => {
                    const contactId = user?.role === 'Doctor' ? appt.patient?._id : appt.doctor?._id;
                    const contactName = user?.role === 'Doctor' 
                      ? appt.patient?.name 
                      : `Dr. ${appt.doctor?.name?.replace(/^Dr\.\s*/i, '') || 'Unknown'}`;
                    const isOnline = isContactOnline(contactId);
                    const cardRoomId = `room-${appt._id}`;
                    const hasNewMsg = (newMessageCounts[cardRoomId] || 0) > 0;
                    const newMsgCount = newMessageCounts[cardRoomId] || 0;

                    return (
                      <div 
                        key={appt._id}
                        className="glass-panel contact-card" 
                        onClick={() => selectContact(appt)}
                        style={{ 
                          padding: '14px 18px', 
                          borderRadius: '14px', 
                          border: hasNewMsg ? '1.5px solid var(--primary)' : '1px solid var(--glass-border)',
                          background: hasNewMsg ? 'rgba(15,130,135,0.03)' : '#fff',
                          boxShadow: hasNewMsg ? '0 4px 20px rgba(15,130,135,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Left portion: Avatar + Text details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                          {/* Avatar with online dot */}
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {contactName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()}
                            </div>
                            <span style={{
                              position: 'absolute',
                              bottom: '-1px',
                              right: '-1px',
                              width: '13px',
                              height: '13px',
                              borderRadius: '50%',
                              background: isOnline ? '#10b981' : '#94a3b8',
                              border: '2px solid #fff',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                            }} />
                          </div>

                          {/* Text Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: 0, color: 'var(--secondary)', fontSize: '1rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {contactName}
                            </h4>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: isOnline ? '#10b981' : 'var(--text-muted)', fontWeight: isOnline ? '600' : '400' }}>
                              {isOnline ? '● Online' : '○ Offline'} &nbsp;·&nbsp; {user?.role === 'Doctor' ? 'Patient' : (appt.doctor?.specialization || 'General Physician')}
                            </p>
                            
                            {/* Latest Message Preview snippet with ticks */}
                            {lastMessages[cardRoomId] ? (
                              <p style={{ 
                                margin: '6px 0 0', 
                                fontSize: '0.82rem', 
                                color: hasNewMsg ? 'var(--primary)' : 'var(--text-muted)', 
                                fontWeight: hasNewMsg ? '600' : '400',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '95%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {lastMessages[cardRoomId].senderId === user._id && (
                                  lastMessages[cardRoomId].seen ? (
                                    <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '-1.5px', display: 'inline-flex' }} title="Seen">
                                      ✓✓
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem', display: 'inline-flex' }} title="Delivered">
                                      ✓
                                    </span>
                                  )
                                )}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {lastMessages[cardRoomId].senderId === user._id ? 'You: ' : ''}{lastMessages[cardRoomId].text}
                                </span>
                              </p>
                            ) : (
                              hasNewMsg && (
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)' }} />
                                  New message
                                </p>
                              )
                            )}
                          </div>
                        </div>

                        {/* Right portion: Badge & Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          {hasNewMsg ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <span style={{
                                background: 'var(--primary)',
                                color: '#fff',
                                borderRadius: '12px',
                                padding: '2px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                animation: 'pulse 1.5s infinite',
                                whiteSpace: 'nowrap'
                              }}>
                                Reply
                              </span>
                              <span style={{
                                background: 'var(--primary)',
                                color: '#fff',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 'bold'
                              }}>
                                {newMsgCount}
                              </span>
                            </div>
                          ) : (
                            <span className="desktop-only" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                              Chat &nbsp;→
                            </span>
                          )}
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
              <div className="chat-header-left">
                {/* Back button: rendered on both PC/Desktop and Mobile for seamless navigation */}
                <button 
                  onClick={() => {
                    setSearchParams({});
                    setSelectedContact(null);
                  }}
                  className="back-btn-responsive"
                  style={{
                    background: 'rgba(15, 130, 135, 0.08)',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    marginRight: '8px',
                    position: 'relative'
                  }}
                >
                  ← Back
                  {totalOtherUnread > 0 && (
                    <span 
                      className="pulse-incoming-call"
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '0.62rem',
                        fontWeight: 'bold',
                        marginLeft: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      {totalOtherUnread}
                    </span>
                  )}
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
            </div>

            {!hasJoined && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => {
                    setIsAudioCall(true);
                    setIsInitiator(true);
                    setShowCallConfirm(true);
                  }}
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--primary)', fontSize: '0.82rem', flexShrink: 0, borderRadius: '24px' }}
                >
                  <Phone size={14} /> Voice Call
                </button>
                <button 
                  onClick={() => {
                    setIsAudioCall(false);
                    setIsInitiator(true);
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
              <div 
                ref={videoCallContainerRef}
                className="video-block-container"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden', 
                  padding: 0,
                  backgroundColor: '#000',
                  borderRadius: isFullscreen ? '0' : '12px',
                  width: '100%',
                  position: 'relative'
                }}
              >
                <div style={{ flex: 1, backgroundColor: '#000', borderRadius: isFullscreen ? '0' : '12px 12px 0 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  
                  {isAudioCall ? (
                    /* Beautiful Pulsating Audio Call UI */
                    <div style={{ flex: 1, width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', borderRadius: isFullscreen ? '0' : '12px 12px 0 0', position: 'relative', overflow: 'hidden' }}>
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
                
                {/* Video Controls (Removed Transcribe Button completely) */}
                <div className="call-controls" style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderTop: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
                  <button onClick={toggleMute} style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', backgroundColor: isMuted ? 'var(--error)' : 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  
                  {!isAudioCall && (
                    <button onClick={toggleVideo} style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', backgroundColor: isVideoOff ? 'var(--error)' : 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
                    </button>
                  )}

                  {/* Red End Call button which shuts off hardware camera and goes back to grid list */}
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
                  {/* Dynamic Incoming Call / Join Banner */}
                  {activeOffer && !hasJoined && (
                    <div 
                      onClick={() => {
                        setIsAudioCall(activeOffer.type === 'audio');
                        setIsInitiator(false);
                        initiateCall(false);
                      }}
                      className="pulse-incoming-call"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        padding: '12px 18px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                        marginBottom: '12px',
                        animation: 'pulse 2.5s infinite'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Phone size={18} style={{ animation: 'bounce 1s infinite' }} />
                        <div>
                          <h5 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.88rem' }}>Incoming Consultation Call</h5>
                          <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.95 }}>Click here to connect your camera & microphone to join the secure session.</p>
                        </div>
                      </div>
                      <span style={{ background: '#fff', color: '#10b981', padding: '4px 12px', borderRadius: '16px', fontSize: '0.72rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        Join Call
                      </span>
                    </div>
                  )}

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
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            position: 'relative',
                            maxWidth: '75%'
                          }}
                        >
                          <span style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>{msg.text}</span>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', 
                            alignSelf: 'flex-end',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px'
                          }}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            {isMe && (
                              msg.seen ? (
                                <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '-1.5px', marginLeft: '2px' }} title="Seen">
                                  ✓✓
                                </span>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', fontSize: '0.75rem', marginLeft: '2px' }} title="Delivered">
                                  ✓
                                </span>
                              )
                            )}
                          </span>
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
