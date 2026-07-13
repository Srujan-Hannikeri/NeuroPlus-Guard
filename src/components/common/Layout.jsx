import React, { useState, useEffect, useContext } from 'react';
import Sidebar from './Sidebar';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { Phone, PhoneOff } from 'lucide-react';

const playIncomingCallBeepGlobal = (() => {
  let audioCtx = null;
  let intervalId = null;

  return {
    start: () => {
      if (intervalId) return; // Already playing
      const playBeep = () => {
        try {
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, audioCtx.currentTime);
          gain.gain.setValueAtTime(0, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime + 0.35);
          gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.45);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.45);
        } catch (e) {
          console.error("Audio beep error:", e);
        }
      };
      playBeep();
      intervalId = setInterval(playBeep, 1800);
    },
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };
})();

const Layout = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [incomingCall, setIncomingCall] = useState(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);

  const isConsultation = location.pathname === '/consultation';
  const isChatting = isConsultation && searchParams.get('contactId');

  useEffect(() => {
    if (user && user.role === 'Patient' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Don't poll in layout if we are already on the consultation page to avoid duplicate intervals/beeps
    if (location.pathname === '/consultation') {
      playIncomingCallBeepGlobal.stop();
      setIncomingCall(null);
      return;
    }

    let isMounted = true;
    const pollIncomingCalls = async () => {
      try {
        const { data: appointments } = await api.get('/appointments');
        if (!isMounted) return;
        
        const apptList = Array.isArray(appointments) ? appointments : [];
        if (apptList.length === 0) {
          setUpcomingAppointment(null);
          return;
        }
        
        const roomIds = apptList.map(appt => `room-${appt._id}`);
        const { data: rooms } = await api.post('/communication/summary', { roomIds });
        if (!isMounted) return;
        
        let activeIncoming = null;
        rooms.forEach(room => {
          const appt = apptList.find(a => `room-${a._id}` === room.roomId);
          if (!appt) return;
          
          if (room.offer && !room.answer && room.offer.senderId !== user._id) {
            activeIncoming = {
              appointment: appt,
              roomId: room.roomId,
              offer: room.offer
            };
          }
        });
        
        setIncomingCall(activeIncoming);
        if (activeIncoming) {
          playIncomingCallBeepGlobal.start();
        } else {
          playIncomingCallBeepGlobal.stop();
        }

        // Check for upcoming accepted patient appointments in the next 15 mins (or started in last 1 hour)
        if (user.role === 'Patient') {
          const now = Date.now();
          const upcoming = apptList.find(appt => {
            if (appt.status !== 'Accepted' || !appt.scheduledAt) return false;
            const scheduledTime = new Date(appt.scheduledAt).getTime();
            return (scheduledTime - now <= 15 * 60 * 1000) && (now - scheduledTime <= 60 * 60 * 1000);
          });
          
          setUpcomingAppointment(upcoming || null);
          
          if (upcoming) {
            const notifiedKey = `notified-appt-${upcoming._id}`;
            if (!localStorage.getItem(notifiedKey)) {
              localStorage.setItem(notifiedKey, 'true');
              
              if (Notification.permission === 'granted') {
                new Notification("Upcoming Appointment Reminder", {
                  body: `Your appointment with Dr. ${upcoming.doctor?.name || 'Doctor'} is scheduled for ${new Date(upcoming.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                });
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    new Notification("Upcoming Appointment Reminder", {
                      body: `Your appointment with Dr. ${upcoming.doctor?.name || 'Doctor'} is scheduled for ${new Date(upcoming.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                    });
                  }
                });
              }
            }
          }
        } else if (user.role === 'Doctor') {
          const lastViewedFees = localStorage.getItem('lastViewedFees') || 0;
          apptList.forEach(appt => {
            const feesToCheck = appt.feeHistory && appt.feeHistory.length > 0
              ? appt.feeHistory
              : (appt.feeAmount > 0 ? [{ _id: 'legacy', amount: appt.feeAmount, status: appt.feeStatus, date: appt.updatedAt || appt.createdAt }] : []);

            feesToCheck.forEach(fee => {
              if (fee.status === 'Paid') {
                const payTime = new Date(fee.date || appt.updatedAt).getTime();
                if (payTime > new Date(lastViewedFees).getTime()) {
                  const feeId = fee._id === 'legacy' ? appt._id : fee._id;
                  const notifiedKey = `notified-payment-${feeId}`;
                  if (!localStorage.getItem(notifiedKey)) {
                    localStorage.setItem(notifiedKey, 'true');
                    if (Notification.permission === 'granted') {
                      new Notification("Payment Received", {
                        body: `Patient ${appt.patient?.name || 'Patient'} paid ₹${fee.amount} for consultation.`
                      });
                    }
                  }
                }
              }
            });
          });
        }
      } catch (err) {
        console.error("Error polling incoming calls in layout:", err);
      }
    };
    
    pollIncomingCalls();
    const interval = setInterval(pollIncomingCalls, 15000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
      playIncomingCallBeepGlobal.stop();
    };
  }, [user, location.pathname]);

  // Prescription Dosage Notifications
  useEffect(() => {
    if (!user || user.role !== 'Patient') return;
    
    let isMounted = true;
    const checkPrescriptions = async () => {
      try {
        const { data: prescriptions } = await api.get('/prescriptions');
        if (!isMounted) return;
        
        const now = new Date();
        const hours = now.getHours();
        
        // Define time windows
        const isMorning = hours >= 8 && hours < 10; // 8:00 AM - 9:59 AM
        const isAfternoon = hours >= 14 && hours < 16; // 2:00 PM - 3:59 PM
        const isNight = hours >= 21 && hours < 23; // 9:00 PM - 10:59 PM
        
        if (!isMorning && !isAfternoon && !isNight) return;
        
        const currentWindow = isMorning ? 'Morning (8am - 10am)' : isAfternoon ? 'Afternoon (2pm - 4pm)' : 'Night (9pm - 11pm)';
        const dosageKey = isMorning ? 'morning' : isAfternoon ? 'afternoon' : 'night';
        const notifiedKeyDate = now.toLocaleDateString();
        
        prescriptions.forEach(prescription => {
          prescription.medications.forEach(med => {
            if (med.dosage && med.dosage[dosageKey]) {
              const notifKey = `med-notif-${prescription._id}-${med._id}-${dosageKey}-${notifiedKeyDate}`;
              
              if (!localStorage.getItem(notifKey)) {
                localStorage.setItem(notifKey, 'true');
                const title = `Medication Reminder: ${currentWindow}`;
                const body = `It's time to take your medication: ${med.medicineName}`;
                
                if (Notification.permission === 'granted') {
                  new Notification(title, { body });
                } else if (Notification.permission !== 'denied') {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      new Notification(title, { body });
                    }
                  });
                }
              }
            }
          });
        });
      } catch (err) {
        console.error("Error checking prescription notifications:", err);
      }
    };
    
    checkPrescriptions();
    const interval = setInterval(checkPrescriptions, 60000); // Check every minute
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Global online heartbeat ping every 20 seconds
  useEffect(() => {
    if (!user) return;
    const ping = () => api.post('/communication/heartbeat').catch(() => {});
    ping();
    const interval = setInterval(ping, 20000);
    return () => clearInterval(interval);
  }, [user]);


  const handleAnswer = (call) => {
    playIncomingCallBeepGlobal.stop();
    setIncomingCall(null);
    const contactId = user.role === 'Doctor' ? call.appointment.patient?._id : call.appointment.doctor?._id;
    navigate(`/consultation?contactId=${contactId}`, {
      state: {
        autoSelectAppointmentId: call.appointment._id,
        startCallImmediately: true,
        isAudioCall: !!call.offer.isAudioCall
      }
    });
  };

  const handleDecline = async (call) => {
    playIncomingCallBeepGlobal.stop();
    setIncomingCall(null);
    try {
      await api.post(`/communication/${call.roomId}/signal`, { clearSignal: true });
    } catch (err) {
      console.error("Failed to decline call:", err);
    }
  };

  return (
    <div className={`app-layout${isConsultation ? ' consultation-layout-active' : ''}${isChatting ? ' chatting-active' : ''}`}>
      <style>{`
        @keyframes slideDownGlobal {
          from { transform: translate(-50%, -100px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
      
      {incomingCall && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '450px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1.5px solid var(--primary)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
          borderRadius: '16px',
          padding: '16px',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          color: '#fff',
          animation: 'slideDownGlobal 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              {((user?.role === 'Doctor' ? incomingCall.appointment?.patient?.name : incomingCall.appointment?.doctor?.name) || 'U')
                .replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()}
            </div>
            <div>
              <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                Incoming consultation call...
              </h5>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
                {user?.role === 'Doctor' ? (incomingCall.appointment?.patient?.name || 'Patient') : `Dr. ${(incomingCall.appointment?.doctor?.name || 'Doctor').replace(/^Dr\.\s*/i, '')}`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button 
              onClick={() => handleAnswer(incomingCall)}
              style={{
                background: '#10b981',
                border: 'none',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '24px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              Answer
            </button>
            <button 
              onClick={() => handleDecline(incomingCall)}
              style={{
                background: '#ef4444',
                border: 'none',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '24px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {upcomingAppointment && !isConsultation && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '450px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          border: '1.5px solid var(--glass-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
          borderRadius: '16px',
          padding: '16px',
          zIndex: 99998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          color: '#fff',
          animation: 'slideDownGlobal 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#fff'
            }}>
              🔔
            </div>
            <div>
              <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                Upcoming Appointment
              </h5>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
                With Dr. {upcomingAppointment.doctor?.name || 'Doctor'} at {new Date(upcomingAppointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {upcomingAppointment.feeAmount > 0 && upcomingAppointment.feeStatus !== 'Paid' ? (
              <button 
                onClick={() => navigate('/fees')}
                style={{
                  background: '#f59e0b',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: '24px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
              >
                Pay Fee
              </button>
            ) : (
              <button 
                onClick={() => navigate('/consultation', { state: { autoSelectAppointmentId: upcomingAppointment._id } })}
                style={{
                  background: '#10b981',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: '24px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                Join Call
              </button>
            )}
          </div>
        </div>
      )}

      <Sidebar />
      <main
        className={`main-content${isConsultation ? ' consultation-main' : ''}`}
        style={isChatting ? { padding: '16px', maxWidth: '100%', flex: 1 } : undefined}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
