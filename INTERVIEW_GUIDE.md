# NeuroPlus Guard - Comprehensive Project & Interview Guide

This guide is designed to prepare you for interviews regarding the **NeuroPlus Guard** web application. It includes a detailed overview of all functions, architecture, database schemas, and engineering choices.

---

## 1. Project Overview & Objective
**NeuroPlus Guard** is a premium, real-time healthcare consulting and monitoring portal designed for neurological and general patient care. It enables patients to book appointments, consult with doctors via real-time video/audio calling, receive automated medication slot reminders, track prescription records, and submit secure consultation payments. For doctors, it provides dashboards to manage appointments, issue prescriptions, view medical reports, and track earnings with interactive indicators for unseen payments.

---

## 2. Technical Stack
### Frontend
*   **Core**: React (v19) with Vite (v8) as the build tool (fast HMR and compilation).
*   **Styling**: Vanilla CSS for maximum customizability, responsive layouts, glassmorphism designs, and smooth micro-animations.
*   **Routing**: React Router DOM (v7) for nested layout routes and role-based redirects.
*   **Icons**: Lucide React for consistent, lightweight vector iconography.

### Backend
*   **Runtime**: Node.js with Express.js server frameworks.
*   **Database**: MongoDB (Mongoose ORM) for document-based models.
*   **AI Integration**: Google Gen AI SDK for the AI Symptom Checker.
*   **WebRTC**: Native WebRTC browser APIs for real-time video/audio consulting, using the stateless database collections as the signaling channel.

---

## 3. Core Features & Functions
### 1. Doctor & Patient Dashboards
*   **Patient Dashboard**: Offers search filters to browse doctors, shortcuts to book appointments, current medication reminders based on time-of-day, and one-click consult button.
*   **Doctor Dashboard**: Shows active patients, today's schedule checklist, completed consultation stats, and unread notification alerts.

### 2. AI Symptom Checker (`/ai-chatbot`)
*   Provides patients with preliminary diagnostic checklists using the Gemini API.
*   Allows patients to type symptoms and upload photos/reports. The AI analyzes inputs and returns recommendations (Disclaimer: Not a substitute for formal diagnosis).

### 3. Consultation & Chat Room (`/consultation`)
*   **Real-time Chat**: Fully features text messaging, image sharing, and read receipts (`✓` and `✓✓`).
*   **Voice & Video WebRTC Calls**: Bypasses layout selection to join instantly. Features elevated desktop PiP containers, responsive controls, native full-screen support, and native browser escapes.
*   **Missed Call Tracker**: Logs missed calls as centered red banners in the chat log, which automatically trigger sidebar badges for the callee.
*   **Payment Receipts**: Centered green gradient receipts are rendered directly in the chat to confirm successful payments.

### 4. Prescription Management (`/prescriptions`)
*   Doctors can schedule prescriptions with specific slots (Morning, Afternoon, Night) and dosages.
*   **4-Hour Update Limit**: Patients are only allowed to modify or mark a medication slot as taken within **4 hours** of its scheduled slot. If they miss the window, the slot is automatically marked as **Missed**.

### 5. Consultation Fees & Payment Portal (`/fees`)
*   **Mock Payment Checkout**: Patients select a payment method (Card, UPI, Netbanking) and input mock info. No OTP verification is requested.
*   **Doctor Earnings Ledger**: Shows daily and overall earnings.
*   **Interactive Seen Indicators**: Paid cards feature a pulsing red dot and a `New` tag for the doctor. Doctors can dismiss them using a `✓ Mark as Seen` button or clear them all at once using the `Mark All as Seen` button.

### 6. Medical Reports (`/reports`)
*   Patients can upload medical records (PDFs/Images). Doctors can access and review patient report files securely.

### 7. Global Live Clock & Heartbeat
*   Every authenticated page displays a synchronized date and time clock on the right side of the navbar.
*   Users ping a global online heartbeat every 20 seconds, allowing the website to show accurate **Online** / **Offline** states.

---

## 4. Database Schema Structure
The application employs five core Mongoose schemas:

### 1. User Schema (`User.js`)
Stores identities, profile details, qualifications, and live online presence tracking:
*   `name`, `phone`, `password`, `role` ("Doctor" or "Patient")
*   `profilePic`, `age`, `bloodGroup` (Patient-specific)
*   `specialization`, `upiId`, `upiQrCode` (Doctor-specific)
*   `lastActive` (Date; used for online status heartbeats)

### 2. Appointment Schema (`Appointment.js`)
Tracks consultations, schedules, fee history, and statuses:
*   `doctor` (Ref to User)
*   `patient` (Ref to User)
*   `scheduledAt` (Date)
*   `status` ("Pending", "Accepted", "Completed", "Declined")
*   `feeAmount` (Number), `amountPaid` (Number), `feeStatus` ("Unpaid", "Partial", "Paid")
*   `feeHistory` (Array of subdocuments: amount, status, transaction details, date)

### 3. Room Schema (`Room.js`)
Manages both WebRTC call signaling and persistent chat logs:
*   `roomId` (String, e.g. `room-[appointmentId]`)
*   `offer`, `answer` (Mixed WebRTC SDP payloads)
*   `iceCandidates` (Array of candidate objects)
*   `messages` (Array of message objects: senderId, senderRole, text, type ['chat', 'payment', 'missed_call'], seen, createdAt)

### 4. Prescription Schema (`Prescription.js`)
Defines patient schedules and medication schedules:
*   `appointment` (Ref to Appointment)
*   `doctor`, `patient` (Refs to User)
*   `medicines` (Array: name, dosage, frequency, slots [morning, afternoon, night] with date/status ["Pending", "Taken", "Missed"])

### 5. Report Schema (`Report.js`)
Saves medical records:
*   `patient` (Ref to User)
*   `title` (String), `fileUrl` (String), `uploadedAt` (Date)

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
