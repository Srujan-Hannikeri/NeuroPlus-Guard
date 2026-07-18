NeuroPlus-Guard — Detailed Function & Module Reference
Generated: 2026-07-18

Purpose
This document describes important functions and modules in the NeuroPlus-Guard codebase so you can explain the design and implementation in interviews. It focuses on backend controllers, core models, and the key frontend modules/components.

Notation
- "file: path" indicates the source file containing the functions described.
- When available, parameters and return descriptions are included.

---

1) Backend: Appointment controller
file: backend/controllers/appointmentController.js

Functions:

- verifyPaymentWithGateway(paymentData)
  - Purpose: Simulate/verify a payment with an external gateway. Implements simple business-rule checks on provided payment details (card CVV values, UPI id contents, bank name) and returns a success object or failure message.
  - Parameters: paymentData { amount, method, details }
  - Returns: Promise resolving to { success: boolean, transactionId?: string, message?: string }
  - Key behavior: Posts to a mock endpoint (httpbin.org) and uses rules to decide failure/success. Generates a fake transaction id when successful.

- requestAppointment(req, res)
  - Purpose: Create a new appointment (patient request) in the database.
  - Parameters: Express req (expects doctorId, notes, isEmergency), res
  - Returns: JSON of the created appointment or 500 on error.
  - Notes: Sets status to 'Pending' and stores patient from req.user.

- createAppointmentByDoctor(req, res)
  - Purpose: Allow a doctor to create an appointment on behalf of a patient.
  - Parameters: req (doctor-only), body contains patientId, notes, scheduledAt, feeAmount
  - Returns: JSON appointment. Ensures scheduledAt is converted to local-time equivalent.
  - Key behavior: Persists feeAmount and initial feeStatus.

- updateAppointmentStatus(req, res)
  - Purpose: Update appointment status and optional scheduledAt/meetingLink.
  - Parameters: req.params.id, req.body.status, scheduledAt, meetingLink
  - Returns: Updated appointment JSON.
  - Key behavior: Converts scheduledAt preserving local entered time; enforces that Accepted appointments require scheduledAt.

- rescheduleAppointment(req, res)
  - Purpose: Doctor-only rescheduling of an appointment.
  - Parameters: req.params.id, req.body.scheduledAt
  - Returns: Updated appointment JSON after converting scheduledAt appropriately.

- getAppointments(req, res)
  - Purpose: Fetch appointments for the current user (doctor or patient). Populates patient and doctor references.
  - Parameters: req (uses req.user.role to determine filter)
  - Returns: Array of appointments sorted by urgency/status/dates.
  - Key behavior: Applies grouping to sort by emergency, pending, accepted, completed.

- updateAppointmentFee(req, res)
  - Purpose: Allows doctor to add/adjust fee entries for an appointment.
  - Parameters: req.params.id, req.body.feeAmount
  - Returns: Updated appointment JSON.
  - Notes: Appends to appointment.feeHistory array with a Pending fee entry.

- payAppointmentFee(req, res)
  - Purpose: Handle patient payments. Verifies payment with gateway, updates feeHistory and appointment.amountPaid, and updates appointment.feeStatus.
  - Parameters: req.params.id (appointment id), body: { amount, feeId, paymentMethod, paymentDetails }
  - Returns: Updated appointment JSON.
  - Notes: Previously pushed a 'payment' message into the communication Room; this side-effect was later removed on request.

---

2) Backend: Room model
file: backend/models/Room.js

Schemas and fields:
- messageSchema
  - Fields: senderId, senderRole, text, type (chat/payment/system), meta (mixed), seen (boolean), createdAt
  - Use: Messages in a room use this schema. "type" allows message categorization for rendering and filtering.

- iceCandidateSchema
  - Fields: senderId, candidate
  - Use: Store ICE candidates for WebRTC negotiation when using stateless polling signals.

- roomSchema
  - Fields: roomId (e.g. 'room-<appointmentId>'), offer, answer, iceCandidates[], messages[]
  - Use: Stores the latest offer/answer and queued ICE candidates and messages. Useful for connection establishment when peers poll the server.

Important note: The Room model supports offline signaling and message persistence for consultations.

---

3) Frontend: API wrapper
file: src/services/api.js

Key functions/constructs:

- api = axios.create({ baseURL })
  - Purpose: Central axios instance with baseURL (from env or '/api').

- Request interceptor
  - Purpose: Attach Authorization header if userInfo exists in localStorage.
  - Behavior: Parses localStorage.userInfo to get token. If token exists, sets config.headers.Authorization = `Bearer ${token}` (implementation previously had a bug which was fixed in earlier changes).

- Response interceptor
  - Purpose: Global error handling. On status 401, redirect to '/' (home) to avoid forcing login redirect loops.
  - Behavior: Logs and rejects other errors.

Usage: Import this api instance across the frontend to make authenticated requests.

---

4) Frontend: LiveClock component
file: src/components/common/LiveClock.jsx

- LiveClock()
  - Purpose: Display the current date and time in a modern format and 12-hour clock with AM/PM.
  - Behavior: Uses setInterval to update every second. Renders date string (weekday, day, month, year) and time string (hh:mm:ss AM/PM).
  - Use: Embedded in navbars to show live time.

---

5) Frontend: Sidebar component
file: src/components/common/Sidebar.jsx

Functions / handlers:

- useEffect(fetchBadges)
  - Purpose: Poll backend endpoints to compute badge counts (appointments, consultation unread, prescriptions, reports, fees).
  - Behavior: Fetches /appointments, then calls /communication/summary with roomIds to compute unread messages, fetches /prescriptions and /reports, and calculates unseen fees from feeHistory compared against localStorage.lastViewedFees.
  - Important: Results are merged into a single setState at once to avoid race conditions.

- getBadgeCount(name)
  - Purpose: Return the numeric badge count given a nav item name. Maps names to the badge fields.

- formatDoctorName(name, role)
  - Purpose: Normalize doctor names to include "Dr." prefix consistently.

- handleLogout()
  - Purpose: Call logout from AuthContext and navigate to /login.

- handleNavClick for appointments & fees
  - Purpose: When clicking Appointments or Fees in the sidebar, mark the corresponding lastViewed timestamp immediately (so the badge clears right away). Writes lastViewedAppointments / lastViewedFees into localStorage with an ISO timestamp computed from latest items.

- Route-change useEffect
  - Purpose: When location pathname enters appointments, mark appointments viewed (same logic to set lastViewedAppointments) — ensures badges clear when user navigates.

Notes: Sidebar maintains reliable badge state using localStorage timestamps and communication summary. Because this is client-side, the state is device-local.

---

6) Frontend: Layout component
file: src/components/common/Layout.jsx

Functions / handlers:

- playIncomingCallBeepGlobal (closure)
  - Purpose: Manage a repeating audio beep used to notify incoming calls. Uses Web Audio API to generate beep tones and an interval.
  - Methods: start() and stop(). Ensures multiple starts don't duplicate.

- useEffect(pollIncomingCalls)
  - Purpose: Polls /appointments and /communication/summary for incoming calls, sets incomingCall state and plays beep when there is an active incoming offer. It also computes upcomingAppointment for patients but was changed to not trigger intrusive notifications for Accepted appointments.

- handleAnswer(call)
  - Purpose: Answer an incoming call; navigate to /consultation?contactId=<id> and set call start options in location.state.

- handleDecline(call)
  - Purpose: Stop beep and call API to clear signaling state for the room.

Notes: Layout performs global background polling for incoming calls and fee notifications (doctors). It ensures the beep only plays when necessary and avoids duplicate beeps when on the consultation page.

---

7) Frontend: Communication (chat + call) page
file: src/pages/Communication.jsx

Key helper functions and behavior:

- mergeMessages(localMsgs, serverMsgs)
  - Purpose: Merge local optimistic messages (unsaved client messages without _id) with server messages so optimistic messages still appear while preventing duplication once server echoes them back.
  - Behavior: Keeps unsaved optimistic messages that are not found among the last few server messages appended to the server list.

- playIncomingCallBeep (closure)
  - Purpose: Local audio beep similar to Layout's global one; used inside the communication component when an offer arrives and the user isn't on a live call.

- selectContact(appt, startCallImmediately)
  - Purpose: Selects an appointment as the active contact — sets roomId = `room-${appt._id}`, resets optimistic state, and optionally starts a call.

- fetchMessagesAndSignal (in useEffect)
  - Purpose: Poll room API /communication/:roomId to get messages and signaling state; mark messages as seen via ?markAsSeen=true; merge messages and manage active offer.

- createPeer(currentStream)
  - Purpose: Create RTCPeerConnection, attach tracks, configure onicecandidate, ontrack and connection-state handlers. Returns peer.

- initiateCall(fullscreenMode)
  - Purpose: Starts call flow (setHasJoined(true)), manages fullscreen if requested.

- startMediaAndPolling (inside effect when hasJoined)
  - Purpose: Acquire getUserMedia, create peer, create offer if initiator, then start polling the room for signaling updates and messages — handles answer/offer exchange and ICE candidates by posting to /communication/:roomId/signal.

- endCall()
  - Purpose: Stop tracks, close peer, clear polling interval, post clearSignal to backend, and reset local call state back to grid list.

- handleSend(e)
  - Purpose: Post a chat message to /communication/:roomId/message with optimistic UI update.

- generateAINotes()
  - Purpose: Send the collected transcription to an AI endpoint to generate notes (calls external AI service via axios). This is auxiliary and optional.

Notes: Communication.jsx implements a robust WebRTC flow with polling-based signaling and optimistic messaging. The component also supports speech recognition, AI note generation, and careful scroll/DOM management for chat.

---

8) Frontend: Fees page
file: src/pages/Fees.jsx

Functions / behavior:

- fetchAppointments()
  - Purpose: Load appointments into the Fees page; also computes the latest paid fee timestamp and writes it to localStorage.lastViewedFees for doctors so fees badges/dots clear when they view the page.

- handleUpdateFee(e)
  - Purpose: Doctor UI to set or update fee for an appointment. Calls PUT /appointments/:id/fee.

- handlePayFee(id, feeId, pendingAmount)
  - Purpose: Prepare activePaymentAppt and launch the payment modal UI. Payment details are collected (card, UPI, netbanking) and then submitGatewayPayment posts to /appointments/:id/pay.

- submitGatewayPayment()
  - Purpose: Simulates payment processing, calls api.put(`/appointments/${id}/pay`, ...), and shows client-side success modal with transaction id and amount.

- Payment UX: After payment success, the frontend calls fetchAppointments() to refresh feeHistory and amounts.

---

9) Other important files & helpers

- src/pages/PatientAppointments.jsx and src/pages/DoctorAppointments.jsx
  - Behavior: When fetching appointments, they compute the maximum updatedAt timestamp and set localStorage.lastViewedAppointments so appointment badges clear on view.

- src/components/common/Logo.jsx
  - Purpose: SVG or inline logo component used in the Navbar and sidebar.

- index.html and favicon.svg
  - The index includes a circular favicon.svg and meta tags; the favicon was changed to a circular SVG to display as round in browser tabs.

---

10) Interview prep: Per-function talking points
For each of the above functions, be ready to explain:
- Why the function exists (problem it solves)
- Main inputs and outputs
- Error/edge-case handling
- Security considerations (e.g., server-side checks for payments)
- Tests you would write (unit tests for controllers, integration tests for endpoints, e2e for payment flow)

Example explanation (payAppointmentFee):
- "payAppointmentFee verifies the gateway response, updates the appointment feeHistory and amountPaid, marks status as Paid/Partial as needed, and returns the updated appointment. Previously it also notified the doctor via a Room message, but to avoid mixing payment events with consultation chat we've removed that behavior and instead rely on feeHistory-based badges. The endpoint performs domain validation (amount numeric, feeId presence) and delegates gateway verification to a helper. In production the gateway integration would be via secure server-to-server verification and webhooks, not a mock POST."

---

Appendix: How to create a one-page PDF from this document
- Locally: Use pandoc or a Node script with pdfkit to render the markdown to PDF.
- If you want, I can generate the PDF here and commit it to the repo; confirm and I will run a small script that uses pdfkit to convert this markdown into a plain-text PDF and push it.

---

If you want expanded, line-by-line descriptions for any specific file (more functions than in this overview), tell me which file(s) and I will produce a per-function doc that includes the code snippet and a short explanation for each function.