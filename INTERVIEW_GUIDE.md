# NeuroPlus Guard — Complete Interview & Study Guide

> **How to use this guide**: Every section includes the actual production code from the project.
> Read the explanation first, then study the code. This guide covers all features top-to-bottom.

---

## 1. Project Overview

**NeuroPlus Guard** is a full-stack healthcare consulting portal for neurological care.

| Role | Key Features |
|---|---|
| **Patient** | Book appointments, pay fees, view prescriptions, track medication slots, consult via video/chat |
| **Doctor** | Manage appointments, issue prescriptions, receive payments, generate AI consultation notes |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8, Vanilla CSS |
| Routing | React Router DOM v7 |
| Backend | Node.js + Express.js (serverless via Vercel) |
| Database | MongoDB + Mongoose ORM |
| Realtime Calls | Native WebRTC (browser API) |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Auth | JWT + bcryptjs |
| OTP/SMS | Twilio (with offline mock fallback) |

---

## 3. Application Architecture & Routing (`src/App.jsx`)

All authenticated pages are wrapped in the `<Layout>` component which provides the sidebar, header, badge polling, heartbeat ping, and global incoming call detection.

```jsx
// src/App.jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Error Boundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => {
            const userInfo = localStorage.getItem('userInfo');
            if (userInfo) {
              const role = JSON.parse(userInfo).role;
              window.location.href = role === 'Doctor' ? '/doctor-dashboard' : '/patient-dashboard';
            } else { window.location.href = '/login'; }
          }}>Go to Home</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/"               element={<Navigate to="/login" />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* All authenticated pages are wrapped inside Layout */}
          <Route path="/doctor-dashboard"  element={<Layout><DoctorDashboard /></Layout>} />
          <Route path="/patient-dashboard" element={<Layout><PatientDashboard /></Layout>} />
          <Route path="/consultation"      element={<Layout><Communication /></Layout>} />
          <Route path="/prescriptions"     element={<Layout><Prescriptions /></Layout>} />
          <Route path="/fees"              element={<Layout><Fees /></Layout>} />
          <Route path="/reports"           element={<Layout><Reports /></Layout>} />
          <Route path="/ai-chatbot"        element={<Layout><AIChatbot /></Layout>} />
        </Routes>
      </Router>
    </AuthProvider>
  </ErrorBoundary>
);
```

**Interview Point**: There is no explicit `ProtectedRoute` component. Every page reads `user` from `AuthContext` and redirects to `/login` if no user is found. The `ErrorBoundary` class component catches any rendering crash and redirects gracefully.

---

## 4. Authentication System

### 4a. Auth Context (`src/context/AuthContext.jsx`)

Stores the logged-in user in React state AND `localStorage` to survive page refreshes.

```jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start, restore user from localStorage (persists across browser refresh)
  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) setUser(JSON.parse(userInfo));
    setLoading(false);
  }, []);

  const login = async (phone, password) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { phone, password });
      setUser(res.data);
      localStorage.setItem('userInfo', JSON.stringify(res.data)); // Save JWT + user object
      return { success: true, role: res.data.role };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 4b. User Registration & Login (`backend/controllers/authController.js`)

Passwords are hashed with `bcrypt` (10 salt rounds). On login, a signed JWT is returned.

```javascript
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

exports.register = async (req, res) => {
  const { name, phone, password, role, specialization, upiId, age, bloodGroup } = req.body;
  const userExists = await User.findOne({ phone });
  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name, phone, password: hashedPassword, role,
    specialization, upiId, age, bloodGroup, isVerified: false
  });
  res.status(201).json({ _id: user._id, name: user.name, phone: user.phone, role: user.role });
};

exports.login = async (req, res) => {
  const { phone, password } = req.body;
  const user = await User.findOne({ phone });

  if (user && (await bcrypt.compare(password, user.password))) {
    const userObj = user.toObject();
    delete userObj.password; // NEVER return the hashed password to client
    res.json({ ...userObj, token: generateToken(user._id) });
  } else {
    res.status(401).json({ message: 'Invalid phone or password' });
  }
};
```

### 4c. Forgot & Reset Password with Twilio OTP

```javascript
exports.forgotPassword = async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = generatedOtp;
  await user.save();

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your NeuroPulse Guard OTP is: ${generatedOtp}`,
      from: process.env.TWILIO_PHONE_NUMBER, to: phone
    });
    res.json({ message: 'OTP sent successfully' });
  } else {
    // Fallback for demo/testing — don't do this in production!
    res.json({ message: 'OTP sent (Mock Mode)', mockOtp: generatedOtp });
  }
};

exports.resetPassword = async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  const user = await User.findOne({ phone });
  if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.otp = undefined; // Clear OTP after use
  await user.save();
  res.json({ message: 'Password reset successfully' });
};
```

### 4d. JWT Auth Middleware (`backend/middlewares/authMiddleware.js`)

Every protected API route passes through this before the controller.

```javascript
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]; // "Bearer <token>"
      await connectDB(); // Must ensure DB is connected (serverless cold starts)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ message: 'User not found' });
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) return res.status(401).json({ message: 'No token provided' });
};

// Role guard: router.get('/doctor-only', protect, authorize('Doctor'), handler)
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: `Role ${req.user.role} not authorized` });
  next();
};
```

---

## 5. WebRTC Video / Audio Calling (`src/pages/Communication.jsx`)

The approach: **MongoDB as a stateless signaling channel** — no WebSocket server needed.

**Flow:**
1. Caller creates SDP offer → writes to `Room.offer` in MongoDB
2. Receiver polls every 2s, detects offer → creates SDP answer → writes to `Room.answer`
3. Both sides write/read ICE candidates from `Room.iceCandidates`
4. P2P media stream established directly browser-to-browser via WebRTC

### 5a. Incoming Call Ringtone (Web Audio API)

```javascript
// Creates a 600Hz sine-wave beep using the browser's built-in audio engine
const playIncomingCallBeep = (() => {
  let audioCtx = null, intervalId = null;
  return {
    start: () => {
      if (intervalId) return;
      const playBeep = () => {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0,    audioCtx.currentTime + 0.45);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.45);
      };
      playBeep();
      intervalId = setInterval(playBeep, 1800); // Repeat every 1.8 seconds
    },
    stop: () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } }
  };
})();
```

### 5b. Creating the RTCPeerConnection

```javascript
const createPeer = (currentStream) => {
  const peer = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },  // Free Google STUN server
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  });

  // Auto-end call on any network failure
  peer.onconnectionstatechange = () => {
    if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) endCall();
  };

  // Each ICE candidate discovered locally → send to DB for peer to pick up
  peer.onicecandidate = async (event) => {
    if (event.candidate && roomId)
      await api.post(`/communication/${roomId}/signal`, { candidate: event.candidate });
  };

  // Remote media stream arrives → attach to <video> element
  peer.ontrack = (event) => {
    setRemoteStream(event.streams[0]);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
  };

  // Add local camera/mic tracks to the peer connection
  currentStream.getTracks().forEach(track => peer.addTrack(track, currentStream));
  return peer;
};
```

### 5c. Full Offer / Answer / ICE Polling Loop

```javascript
useEffect(() => {
  if (!hasJoined || !roomId) return;
  let currentStream = null;

  const startMediaAndPolling = async () => {
    // 1. Capture camera + mic (video=false for audio-only calls)
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: !isAudioCall, audio: true
    });
    setStream(currentStream);
    if (localVideoRef.current && !isAudioCall) localVideoRef.current.srcObject = currentStream;

    const peer = createPeer(currentStream);
    peerRef.current = peer;

    if (isInitiator) {
      // 2a. CALLER: Create SDP offer and write to DB signaling channel
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await api.post(`/communication/${roomId}/signal`, {
        offer: { type: peer.localDescription.type, sdp: peer.localDescription.sdp,
                 senderId: user._id, isAudioCall }
      });
      hasOffered.current = true;
    }

    // 3. Poll DB every 2 seconds for signaling updates
    pollingInterval.current = setInterval(async () => {
      const { data } = await api.get(`/communication/${roomId}?markAsSeen=true`);

      // Auto-disconnect: if signaling is cleared from DB, the other side hung up
      if (hasOffered.current && !data.offer && !data.answer) { endCall(); return; }

      // 2b. RECEIVER: Read offer from DB, create and send answer
      if (!isInitiator && data.offer && !hasAnswered.current) {
        hasAnswered.current = true;
        await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await api.post(`/communication/${roomId}/signal`, { answer: peer.localDescription });
      }

      // 2c. CALLER: Read answer from DB and complete the handshake
      if (isInitiator && data.answer && hasOffered.current && peer.signalingState !== 'stable')
        await peer.setRemoteDescription(new RTCSessionDescription(data.answer));

      // 4. Deduplicated ICE candidate processing
      if (data.iceCandidates && peer.remoteDescription) {
        for (const cand of data.iceCandidates) {
          if (cand.senderId !== user._id && !processedCandidates.current.has(cand._id)) {
            processedCandidates.current.add(cand._id);
            await peer.addIceCandidate(new RTCIceCandidate(cand.candidate));
          }
        }
      }
    }, 2000);
  };

  startMediaAndPolling();
  return () => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    if (peerRef.current) peerRef.current.close();
  };
}, [hasJoined, roomId, user, isInitiator, isAudioCall]);
```

### 5d. End Call & Missed Call Auto-Logging

```javascript
const endCall = () => {
  if (stream) stream.getTracks().forEach(track => track.stop());   // Turn off camera/mic
  if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
  if (pollingInterval.current) clearInterval(pollingInterval.current);

  // If caller hung up before receiver joined → log a missed call message in the room
  if (isInitiator && !remoteStream && roomId) {
    api.post(`/communication/${roomId}/message`, {
      text: `📞 Missed ${isAudioCall ? 'voice' : 'video'} call`,
      type: 'missed_call'
    }).catch(console.error);
  }

  // Clear WebRTC signaling from DB for a clean state
  if (roomId) api.post(`/communication/${roomId}/signal`, { clearSignal: true }).catch(() => {});

  // Reset all state
  setStream(null); setRemoteStream(null); setHasJoined(false);
  setRoomId(''); setSelectedContact(null);
};
```

### 5e. Live Speech Transcription + AI Consultation Notes

```javascript
// Web Speech API — runs throughout the entire call duration
useEffect(() => {
  if (!hasJoined) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++)
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
    if (finalTranscript)
      setTranscription(prev => (prev + ' ' + finalTranscript).trim());
  };

  // Auto-restart to keep transcription running for the entire call
  recognition.onend = () => {
    if (hasJoined && recognitionRef.current) try { recognition.start(); } catch {}
  };

  recognition.start();
  recognitionRef.current = recognition;
  return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
}, [hasJoined]);

// Send transcript to Gemini to generate structured consultation notes
const generateAINotes = async () => {
  if (!transcription.trim()) return alert('No transcription available.');
  setIsGeneratingNotes(true);
  try {
    const res = await axios.post(`${API_BASE_URL}/ai/chat`, {
      prompt: `Generate a brief medical summary/notes from this consultation transcript: ${transcription}`
    });
    setAiNotes(res.data.reply);
  } finally { setIsGeneratingNotes(false); }
};
```

---

## 6. AI Symptom Checker (`backend/controllers/aiController.js`)

Calls Google Gemini 2.5 Flash. Falls back to a local rule-based engine if API is unavailable.

```javascript
exports.chatWithAI = async (req, res) => {
  const { prompt, imageBase64, mimeType } = req.body;

  // Layer 1: offline fallback — no API key configured
  if (!process.env.GEMINI_API_KEY) {
    if (prompt?.startsWith('Generate a brief medical summary'))
      return res.json({ reply: generateOfflineConsultationNotes(prompt) });
    return res.json({ reply: analyzeSymptomsOffline(prompt) });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let contents = [prompt || 'Hello!'];

  if (imageBase64) {
    // Support image analysis (e.g., skin condition photos)
    const base64Data = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1] : imageBase64;
    contents.push({ inlineData: { data: base64Data, mimeType: mimeType || 'image/jpeg' } });
    contents[0] = 'You are a helpful medical AI assistant. Analyze the image and prompt: ' + prompt;
  } else {
    contents[0] = 'You are a helpful medical AI assistant. User prompt: ' + prompt;
  }

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents });
    res.json({ reply: response.text });
  } catch (apiError) {
    // Layer 2: fallback if Gemini quota exceeded or network error
    console.warn('Gemini API failed, using offline fallback:', apiError.message);
    res.json({ reply: analyzeSymptomsOffline(prompt) });
  }
};

// Keyword-matching offline engine for neurological symptoms
const analyzeSymptomsOffline = (prompt) => {
  const query = (prompt || '').toLowerCase();
  if (query.includes('headache') || query.includes('migraine'))
    return '[Offline] Suggests headache/migraine. Rest in dark room, stay hydrated, track triggers.';
  if (query.includes('seizure') || query.includes('epilepsy'))
    return '[Offline] Seizure activity detected. Follow anti-epileptic schedule strictly.';
  if (query.includes('tremor') || query.includes('parkinson'))
    return '[Offline] Tremors noted. Limit caffeine. Consult movement disorder specialist.';
  return '[Offline] General symptoms. Get rest, stay hydrated, monitor for worsening.';
};
```

---

## 7. Online Status Heartbeat

Every logged-in user pings the server every 20 seconds. If `lastActive` is within 30 seconds, they appear online.

```javascript
// src/components/common/Layout.jsx
useEffect(() => {
  if (!user) return;
  const ping = () => api.post('/communication/heartbeat').catch(() => {});
  ping(); // Immediate ping on mount
  const interval = setInterval(ping, 20000); // Then every 20 seconds
  return () => clearInterval(interval);
}, [user]);
```

```javascript
// backend/routes/communicationRoutes.js
router.post('/heartbeat', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { lastActive: new Date() });
  res.json({ status: 'ok' });
});

router.get('/online-users', protect, async (req, res) => {
  const threshold = new Date(Date.now() - 30000); // 30 seconds ago
  const onlineUsers = await User.find({ lastActive: { $gte: threshold } }).select('_id');
  res.json({ onlineUserIds: onlineUsers.map(u => u._id.toString()) });
});
```

---

## 8. Optimized Badge System (`src/components/common/Sidebar.jsx`)

### 8a. Parallel Fetching with `Promise.all`

```javascript
const fetchBadges = async () => {
  // All 3 requests fire simultaneously — not sequentially
  const [appointmentsRes, prescriptionsRes, reportsRes] = await Promise.all([
    api.get('/appointments').catch(() => ({ data: [] })),
    api.get('/prescriptions').catch(() => ({ data: [] })),
    api.get('/reports').catch(() => ({ data: [] }))
  ]);

  const apptList = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [];

  // Appointment badge: unseen since last visited
  const lastViewedAppts = localStorage.getItem('lastViewedAppointments') || 0;
  const unseenApptCount = apptList.filter(a =>
    new Date(a.updatedAt || a.createdAt).getTime() > new Date(lastViewedAppts).getTime()
  ).length;

  // Chat badge: batch fetch all room summaries
  let unreadChatCount = 0;
  if (apptList.length > 0) {
    const roomIds = apptList.map(appt => `room-${appt._id}`);
    const { data: rooms } = await api.post('/communication/summary', { roomIds });
    (rooms || []).forEach(room => {
      // EXCLUDE 'payment' type messages — they go to the Fees badge only
      unreadChatCount += room.messages?.filter(
        msg => msg.senderId !== user._id && msg.type !== 'payment' && !msg.seen
      ).length || 0;
    });
  }

  // Fees badge: unseen paid fees tracked by IDs in localStorage
  const seenPayments = JSON.parse(localStorage.getItem('seenPayments') || '[]');
  let unseenPayCount = 0;
  apptList.forEach(appt => {
    (appt.feeHistory || []).forEach(fee => {
      const feeId = fee._id || appt._id;
      if (fee.status === 'Paid' && !seenPayments.includes(String(feeId))) unseenPayCount++;
    });
  });

  setBadges({ appointments: unseenApptCount, chat: unreadChatCount, fees: unseenPayCount });
};
```

### 8b. Instant Badge Update via Custom DOM Event

```javascript
// Sidebar.jsx: listens for the event
useEffect(() => {
  const handleFeesUpdated = () => fetchBadges();
  window.addEventListener('fees-updated', handleFeesUpdated);
  return () => window.removeEventListener('fees-updated', handleFeesUpdated);
}, []);

// Fees.jsx: dispatches the event immediately after marking seen
const markFeeAsSeen = (feeId) => {
  const updated = [...seenPayments, feeId];
  setSeenPayments(updated);
  localStorage.setItem('seenPayments', JSON.stringify(updated));
  window.dispatchEvent(new Event('fees-updated')); // Sidebar badge refreshes instantly
};

const markAllFeesAsSeen = () => {
  const allIds = [];
  appointments.forEach(appt => {
    (appt.feeHistory || []).forEach(fee => allIds.push(fee._id || appt._id));
  });
  const updated = Array.from(new Set([...seenPayments, ...allIds]));
  setSeenPayments(updated);
  localStorage.setItem('seenPayments', JSON.stringify(updated));
  window.dispatchEvent(new Event('fees-updated'));
};
```

---

## 9. Payment System & Auto-Message (`backend/controllers/appointmentController.js`)

When a patient pays, the appointment record is updated AND an automatic message is posted in the chat room so the doctor gets notified immediately.

```javascript
exports.payAppointmentFee = async (req, res) => {
  const { id } = req.params;
  const { amount, paymentMethod, paymentDetails } = req.body;
  const appointment = await Appointment.findById(id);
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

  const paymentAmount = amount || appointment.feeAmount;
  appointment.amountPaid = (appointment.amountPaid || 0) + paymentAmount;
  appointment.feeStatus = appointment.amountPaid >= appointment.feeAmount ? 'Paid' : 'Partial';

  if (!appointment.feeHistory) appointment.feeHistory = [];
  appointment.feeHistory.push({
    amount: paymentAmount, status: appointment.feeStatus,
    method: paymentMethod, details: paymentDetails, date: new Date()
  });
  await appointment.save();

  // Post auto-message to the doctor in their consultation room
  try {
    let room = await Room.findOne({ roomId: `room-${appointment._id}` });
    if (!room) room = new Room({ roomId: `room-${appointment._id}` });
    room.messages.push({
      senderId: req.user._id,
      senderRole: req.user.role,
      text: `💳 Payment of Rs.${paymentAmount} completed via ${paymentMethod || 'bank transfer'}.`,
      type: 'payment',   // Special type: shown on Fees page, excluded from chat badge count
      seen: false,
      createdAt: new Date()
    });
    await room.save();
  } catch (e) { console.error('Error creating payment message:', e); }

  res.json(appointment);
};
```

---

## 10. Chat Seen Tracking & Mongoose `markModified` (`backend/routes/communicationRoutes.js`)

> **Critical Mongoose Pitfall**: Modifying a field inside a document array subdocument does NOT automatically trigger Mongoose's dirty-checking. You MUST call `.markModified('messages')` before `.save()`, or the change is silently discarded.

```javascript
router.get('/:roomId', protect, async (req, res) => {
  let room = await Room.findOne({ roomId: req.params.roomId });
  if (!room) {
    room = await Room.create({ roomId: req.params.roomId });
  } else if (req.query.markAsSeen === 'true') {
    let updated = false;
    room.messages.forEach(msg => {
      // Only mark messages from the OTHER person as seen
      if (msg.senderId?.toString() !== req.user._id.toString() && !msg.seen) {
        msg.seen = true;
        updated = true;
      }
    });
    if (updated) {
      room.markModified('messages'); // CRITICAL: Mongoose needs this to detect array changes
      await room.save();             // Without markModified, seen:true is never written to DB!
    }
  }
  res.json(room);
});
```

---

## 11. 4-Hour Prescription Window (`src/pages/Prescriptions.jsx`)

Medication slots expire 4 hours after their scheduled time. The page auto-marks them as Missed on load.

| Slot      | Scheduled | Expires At | Condition                              |
|-----------|-----------|------------|----------------------------------------|
| Morning   | 8:00 AM   | 12:00 PM   | `currentHour >= 12`                    |
| Afternoon | 2:00 PM   | 6:00 PM    | `currentHour >= 18`                    |
| Night     | 9:00 PM   | 1:00 AM    | `currentHour >= 1 && currentHour < 21` |

```javascript
const checkAndMarkMissed = async (prescriptions) => {
  const todayObj = new Date();
  const currentHour = todayObj.getHours();

  for (const presc of prescriptions) {
    if (presc.status !== 'Active') continue;
    let updatedAny = false;

    for (const time of ['Morning', 'Afternoon', 'Night']) {
      // Check if a dose log already exists for this slot today
      const hasLog = presc.history?.some(h => {
        const hDate = new Date(h.date);
        return hDate.getDate()     === todayObj.getDate() &&
               hDate.getMonth()    === todayObj.getMonth() &&
               hDate.getFullYear() === todayObj.getFullYear() &&
               h.timeOfDay === time;
      });

      if (!hasLog) {
        let shouldMarkMissed = false;
        if (time === 'Morning'   && currentHour >= 12)                     shouldMarkMissed = true;
        if (time === 'Afternoon' && currentHour >= 18)                     shouldMarkMissed = true;
        if (time === 'Night'     && currentHour >= 1 && currentHour < 21)  shouldMarkMissed = true;

        if (shouldMarkMissed) {
          await api.put(`/prescriptions/${presc._id}/status`, { status: 'Missed', timeOfDay: time });
          updatedAny = true;
        }
      }
    }
    if (updatedAny) await fetchPrescriptions(); // Refresh UI
  }
};
```

---

## 12. Database Schemas

### User Schema
```javascript
const userSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  phone:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  role:           { type: String, enum: ['Doctor', 'Patient'], required: true },
  profilePic:     String,       // Base64 image
  age:            Number,       // Patient-only
  bloodGroup:     String,       // Patient-only
  specialization: String,       // Doctor-only
  upiId:          String,       // Doctor payment ID
  upiQrCode:      String,       // Doctor QR code (Base64)
  isVerified:     Boolean,
  otp:            String,       // Temporary; cleared after password reset
  lastActive:     Date,         // Updated every 20s for online status
}, { timestamps: true });
```

### Appointment Schema
```javascript
const appointmentSchema = new mongoose.Schema({
  doctor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: Date,
  status:      { type: String, enum: ['Pending','Accepted','Completed','Declined'], default: 'Pending' },
  notes:       String,
  feeAmount:   { type: Number, default: 0 },
  amountPaid:  { type: Number, default: 0 },
  feeStatus:   { type: String, enum: ['Unpaid','Partial','Paid'], default: 'Unpaid' },
  feeHistory:  [{ amount: Number, status: String, method: String, details: String, date: Date }]
}, { timestamps: true });
```

### Room Schema (Chat + WebRTC Signaling)
```javascript
const messageSchema = new mongoose.Schema({
  senderId:   mongoose.Schema.Types.ObjectId,
  senderRole: String,
  text:       String,
  type:       { type: String, enum: ['chat', 'payment', 'missed_call'], default: 'chat' },
  seen:       { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now }
}, { _id: true });

const roomSchema = new mongoose.Schema({
  roomId:       { type: String, required: true, unique: true },
  messages:     [messageSchema],
  offer:        mongoose.Schema.Types.Mixed,         // WebRTC SDP offer
  answer:       mongoose.Schema.Types.Mixed,         // WebRTC SDP answer
  iceCandidates: [mongoose.Schema.Types.Mixed]       // ICE candidates list
}, { timestamps: true });
```

---

## 13. Interview Questions & Model Answers

### Q1: How did you implement real-time video calling without WebSockets?
**Answer**: I used the browser's native **WebRTC API** for peer-to-peer media streaming and replaced the traditional WebSocket signaling server with **MongoDB as a stateless polling channel**. Both clients poll a REST endpoint every 2 seconds. The caller writes its SDP offer to the Room document; the receiver detects it, creates an answer, and writes it back. ICE candidates are also stored in the same document. This design eliminates persistent socket connections and works perfectly with Vercel's serverless architecture.

### Q2: What was a critical Mongoose bug you discovered and fixed?
**Answer**: When iterating over a Mongoose document array with `.forEach()` and modifying a field on each subdocument (like setting `seen = true`), Mongoose's internal change-tracker does NOT detect those modifications. The fix is to call `room.markModified('messages')` before `await room.save()`. Without this, the `seen: true` changes were calculated in memory but silently discarded — never persisted to MongoDB.

### Q3: How does the AI feature handle unavailability gracefully?
**Answer**: The `chatWithAI` controller has a two-layer fallback. First, if `GEMINI_API_KEY` is not configured, it immediately returns a response from a local keyword-matching rule engine. Second, even with a valid key, if the Gemini API call itself fails (quota, network), the `catch` block calls the same offline function. The user always receives a useful response instead of an error.

### Q4: How does the badge system stay fast and responsive?
**Answer**: I refactored sequential API calls into `Promise.all()` so appointments, prescriptions, and reports all fetch simultaneously — cutting latency by up to 60%. For the fees badge specifically, I use a custom DOM event `'fees-updated'` that the Fees page dispatches whenever a fee is marked seen, so the sidebar badge updates instantly without waiting for the next poll cycle.

### Q5: How does the 4-hour prescription window work without a backend cron job?
**Answer**: On page load, the Prescriptions page checks the current hour against each slot's scheduled time. If no dose log exists for a slot today and the 4-hour window has passed (e.g., it's past 12:00 PM for the Morning slot), the frontend sends a PATCH to mark it "Missed" automatically. This client-driven approach requires no server cron job.

### Q6: How is online/offline status implemented?
**Answer**: The `<Layout>` component runs `setInterval(ping, 20000)` to POST to `/communication/heartbeat` every 20 seconds. The backend updates the user's `lastActive` date in MongoDB. The `/online-users` endpoint filters for users whose `lastActive` is within the last 30 seconds and returns their IDs. The frontend compares this list to show colored presence dots on contact cards.

### Q7: How does the global incoming call notification work across all pages?
**Answer**: The `<Layout>` component (wrapping every authenticated page) polls all appointment rooms every 5 seconds looking for active WebRTC offers younger than 45 seconds from another user. If found, it shows a global call overlay and plays a ringtone using the Web Audio API. The user can answer from any page — navigating to `/consultation` with the relevant appointment pre-selected — or decline, which clears the offer from the database.
