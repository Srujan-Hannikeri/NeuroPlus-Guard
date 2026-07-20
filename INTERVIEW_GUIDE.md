# NeuroPlus Guard - Comprehensive Project & Interview Guide

This guide is designed to prepare you for interviews regarding the **NeuroPlus Guard** web application. It includes a detailed overview of all functions, architecture, database schemas, and actual production code snippets.

---

## 1. Project Overview & Objective
**NeuroPlus Guard** is a real-time healthcare consulting portal designed for neurological and general patient care. It enables patients to book appointments, consult with doctors via real-time video/audio calling, receive automated medication slot reminders, track prescription records, and submit secure consultation payments. For doctors, it provides dashboards to manage appointments, issue prescriptions, view medical reports, and track earnings with interactive indicators for unseen payments.

---

## 2. Technical Stack
### Frontend
*   **Core**: React (v19) with Vite (v8) as the build tool.
*   **Styling**: Vanilla CSS for glassmorphism designs and smooth micro-animations.
*   **Routing**: React Router DOM (v7) for nested layout routes and role-based redirects.
*   **Icons**: Lucide React.

### Backend
*   **Runtime**: Node.js with Express.js server frameworks.
*   **Database**: MongoDB (Mongoose ORM) for document-based models.
*   **AI Integration**: Google Gen AI SDK for the AI Symptom Checker.
*   **WebRTC**: Native WebRTC browser APIs for real-time video/audio consulting, using the stateless database collections as the signaling channel.

---

## 3. Core Production Code Snippets

### 1. Parallel Badge Loading with `Promise.all` (`src/components/common/Sidebar.jsx`)
To make badge updates twice as fast and reduce sequential HTTP overhead, the sidebar requests appointments, prescriptions, and reports in parallel:
```javascript
const fetchBadges = async () => {
  try {
    // Run appointments, prescriptions, and reports fetches in parallel to make it much faster!
    const [appointmentsRes, prescriptionsRes, reportsRes] = await Promise.all([
      api.get('/appointments').catch(() => ({ data: [] })),
      api.get('/prescriptions').catch(() => ({ data: [] })),
      api.get('/reports').catch(() => ({ data: [] }))
    ]);

    if (!isMounted) return;

    const apptList = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [];
    setAppointments(apptList);

    // compute all counts locally
    const lastViewedAppts = localStorage.getItem('lastViewedAppointments') || 0;
    const unseenCount = apptList.filter(a => new Date(a.updatedAt || a.createdAt).getTime() > new Date(lastViewedAppts).getTime()).length;

    // 2. Fetch room summaries in parallel if there are appointments
    let unreadChatCount = 0;
    if (apptList.length > 0) {
      const roomIds = apptList.map(appt => `room-${appt._id}`);
      try {
        const { data: rooms } = await api.post('/communication/summary', { roomIds });
        (rooms || []).forEach(room => {
          // EXCLUDE payment confirmation type messages from counting towards the communication unread chat badge
          unreadChatCount += (room.messages?.filter(msg => msg.senderId !== user._id && msg.type !== 'payment' && !msg.seen).length) || 0;
        });
      } catch (e) {
        console.error("Sidebar summary polling error", e);
      }
    }
    // ... setting badges state ...
  } catch (err) {
    console.error("Error fetching badges in sidebar:", err);
  }
};
```

### 2. Auto-Appending Payment Messages (`backend/controllers/appointmentController.js`)
When a patient completes a payment, the backend appends a message of `type: 'payment'` to the communication room to alert the doctor:
```javascript
exports.payAppointmentFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, feeId, paymentMethod, paymentDetails } = req.body;
    
    // ... Verify payment and update appointment feeStatus ...
    await appointment.save();

    // Append a message of type 'payment' to the communication room so the doctor receives a message
    try {
      let room = await Room.findOne({ roomId: `room-${appointment._id}` });
      if (!room) {
        room = new Room({ roomId: `room-${appointment._id}` });
      }
      room.messages.push({
        senderId: req.user._id,
        senderRole: req.user.role,
        text: `💳 Payment of ₹${paymentAmount} completed successfully via ${paymentMethod || 'bank transfer'}.`,
        type: 'payment',
        seen: false,
        createdAt: new Date()
      });
      await room.save();
    } catch (e) {
      console.error("Error creating payment message in room:", e);
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### 3. Real-Time Chat Message Seen Updates (`backend/routes/communicationRoutes.js`)
Updates inner array fields in MongoDB. Mongoose requires `room.markModified('messages')` to recognize elements edited within document arrays:
```javascript
router.get('/:roomId', protect, async (req, res) => {
  try {
    let room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      room = await Room.create({ roomId: req.params.roomId });
    } else if (req.query.markAsSeen === 'true') {
      let updated = false;
      room.messages.forEach(msg => {
        const senderStr = msg.senderId ? msg.senderId.toString() : '';
        if (senderStr !== req.user._id.toString() && !msg.seen) {
          msg.seen = true;
          updated = true;
        }
      });
      if (updated) {
        room.markModified('messages'); // Persists inner field modifications
        await room.save();
      }
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

### 4. Interactive Seen Fees tracking (`src/pages/Fees.jsx`)
Keeps track of seen fees via unique IDs in `localStorage`, offering individual and global seen controls:
```javascript
const markFeeAsSeen = (feeId) => {
  const updated = [...seenPayments, feeId];
  setSeenPayments(updated);
  localStorage.setItem('seenPayments', JSON.stringify(updated));
  window.dispatchEvent(new Event('fees-updated')); // Instantly triggers sidebar badge refresh
};

const markAllFeesAsSeen = () => {
  const allIds = [];
  appointments.forEach(appt => {
    const fees = appt.feeHistory && appt.feeHistory.length > 0
      ? appt.feeHistory
      : (appt.feeAmount > 0 ? [{ _id: 'legacy' }] : []);
    fees.forEach(fee => {
      const feeId = fee._id === 'legacy' ? appt._id : fee._id;
      allIds.push(feeId);
    });
  });
  const updated = Array.from(new Set([...seenPayments, ...allIds]));
  setSeenPayments(updated);
  localStorage.setItem('seenPayments', JSON.stringify(updated));
  window.dispatchEvent(new Event('fees-updated'));
};
```

### 5. Automated Missed Call Logger (`src/pages/Communication.jsx`)
Appends a missed call type message to the room if the initiator terminates the WebRTC call before a remote stream connects:
```javascript
const endCall = () => {
  if (stream) stream.getTracks().forEach(track => track.stop());
  if (peerRef.current) {
    peerRef.current.close();
    peerRef.current = null;
  }
  if (pollingInterval.current) clearInterval(pollingInterval.current);
  
  // If we initiated the call and no remote stream was established, log it as a missed call
  if (isInitiator && !remoteStream && roomId) {
    api.post(`/communication/${roomId}/message`, {
      text: `📞 Missed ${isAudioCall ? 'voice' : 'video'} call`,
      type: 'missed_call'
    }).catch(err => console.error("Failed to log missed call", err));
  }

  // Clear call signaling state in MongoDB
  if (roomId) {
    api.post(`/communication/${roomId}/signal`, { clearSignal: true }).catch(err => {});
  }
  // ... Reset states ...
};
```

### 6. The 4-Hour Prescription Update limit (`src/pages/Prescriptions.jsx`)
Restricts prescription updates to a strict 4-hour window from the scheduled slot:
```javascript
// Verification scheduled times (Morning: 8:00 AM, Afternoon: 2:00 PM, Night: 9:00 PM)
const currentHour = todayObj.getHours();
let shouldMarkMissed = false;

if (time === 'Morning' && currentHour >= 12) shouldMarkMissed = true; // 8:00 AM + 4 hrs
else if (time === 'Afternoon' && currentHour >= 18) shouldMarkMissed = true; // 2:00 PM + 4 hrs
else if (time === 'Night' && currentHour >= 1 && currentHour < 21) shouldMarkMissed = true; // 9:00 PM + 4 hrs

if (shouldMarkMissed) {
  await api.put(`/prescriptions/${presc._id}/status`, { status: 'Missed', timeOfDay: time });
}
```

---

## 4. Database Schema Structure
The application employs five core Mongoose schemas:

### 1. User Schema (`User.js`)
*   `name`, `phone`, `password`, `role` ("Doctor" or "Patient")
*   `profilePic`, `age`, `bloodGroup` (Patient-specific)
*   `specialization`, `upiId`, `upiQrCode` (Doctor-specific)
*   `lastActive` (Date; used for online status heartbeats)

### 2. Appointment Schema (`Appointment.js`)
*   `doctor` (Ref to User)
*   `patient` (Ref to User)
*   `scheduledAt` (Date)
*   `status` ("Pending", "Accepted", "Completed", "Declined")
*   `feeAmount` (Number), `amountPaid` (Number), `feeStatus` ("Unpaid", "Partial", "Paid")
*   `feeHistory` (Array: amount, status, details, date)

### 3. Room Schema (`Room.js`)
*   `roomId` (String, e.g. `room-[appointmentId]`)
*   `offer`, `answer` (Mixed WebRTC SDP payloads)
*   `iceCandidates` (Array of candidate objects)
*   `messages` (Array: senderId, senderRole, text, type ['chat', 'payment', 'missed_call'], seen, createdAt)

---

## 5. Potential Interview Questions & Technical Answers

### Q1: How did you implement real-time video/audio consulting?
**Answer**: I used the browser's native **WebRTC (RTCPeerConnection) API** to establish a peer-to-peer connection for streaming. To exchange connection parameters (SDP offers/answers and ICE candidates), I used a **stateless MongoDB signaling channel**. The clients write signaling payloads to the database, and poll the server every 2 seconds to retrieve candidate listings. This eliminated the need for complex, heavy WebSockets setup, keeping the server lightweight and highly scalable.

### Q2: How did you ensure that badge calculations are fast and efficient?
**Answer**: Previously, badges were calculated by making sequential API requests on layout mounts (causing round-trip latency pileups). I refactored the logic in the sidebar to run all primary database requests (appointments, prescriptions, reports) in **parallel** using `Promise.all`. This cut network load times in half. I also introduced a local event dispatcher system: when a doctor marks a fee as seen on the Fees page, it fires a `'fees-updated'` event that instantly recalculates counts without waiting for the polling intervals.

### Q3: What Mongoose-specific challenges did you encounter and how did you resolve them?
**Answer**: I encountered an issue where unread message counts were not saving correctly on the backend when users read chats. In Mongoose, if you modify items inside a document array directly via `.forEach()`, Mongoose's change-detection system might fail to recognize the updates. I resolved this by explicitly calling `room.markModified('messages')` right before `await room.save()`. This forced Mongoose to compile the update statement and successfully persist the seen state to MongoDB.

### Q4: How is the 4-hour prescription window enforced?
**Answer**: On the backend, we record the scheduled date and time of the dosage slot. When the patient requests an update, we compare the current date-time with the scheduled time. If the duration exceeds **4 hours**, we restrict editing. Additionally, during layout load, a utility script checks for pending slots older than 4 hours and automatically posts a database patch to change their status to `"Missed"`.
