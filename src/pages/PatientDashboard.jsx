import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { Search, FileText, Bot, Video, User, MessageSquare, Info, CreditCard, CheckCircle, Loader } from 'lucide-react';

const PatientDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState('');
  
  // Payment Gateway State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentApptId, setPaymentApptId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get('/doctors');
        setDoctors(data);
      } catch (error) {
        console.error("Failed to fetch doctors", error);
      }
    };
    
    const fetchPrescriptions = async () => {
      try {
        const { data } = await api.get('/prescriptions');
        setPrescriptions(data);
      } catch (error) {
        console.error("Failed to fetch prescriptions", error);
      }
    };

    const fetchAppointments = async () => {
      try {
        const { data } = await api.get('/appointments');
        setAppointments(data);
      } catch (error) {
        console.error("Failed to fetch appointments", error);
      }
    };

    const determineTimeOfDay = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setCurrentTimeOfDay('Morning');
      else if (hour >= 12 && hour < 17) setCurrentTimeOfDay('Afternoon');
      else setCurrentTimeOfDay('Night');
    };

    fetchDoctors();
    fetchPrescriptions();
    fetchAppointments();
    determineTimeOfDay();
  }, []);

  // Helper to check if a dose is pending for the current time
  const getPendingMedicines = () => {
    const pending = [];
    const todayObj = new Date();
    if (!Array.isArray(prescriptions)) return pending;
    prescriptions.forEach(p => {
      // Check if logged today for the current timeOfDay
      const logged = p.history?.some(h => {
        const hDate = new Date(h.date);
        return hDate.getDate() === todayObj.getDate() &&
               hDate.getMonth() === todayObj.getMonth() &&
               hDate.getFullYear() === todayObj.getFullYear() &&
               h.timeOfDay === currentTimeOfDay;
      });
      if (!logged) {
        if (Array.isArray(p.medicines)) {
          p.medicines.forEach(m => {
            if ((currentTimeOfDay === 'Morning' && m.morning) ||
                (currentTimeOfDay === 'Afternoon' && m.afternoon) ||
                (currentTimeOfDay === 'Night' && m.night)) {
              pending.push({ prescId: p._id, medName: m.name });
            }
          });
        }
      }
    });
    return pending;
  };

  const pendingMeds = getPendingMedicines();

  const openPaymentModal = (appt) => {
    setPaymentApptId(appt._id);
    setPaymentAmount(appt.feeAmount);
    setPaymentSuccess(false);
    setPaymentModalOpen(true);
  };

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      // Simulate secure modern payment gateway processing delay
      await new Promise(r => setTimeout(r, 2000));
      await api.put(`/appointments/${paymentApptId}/pay`, { amount: paymentAmount });
      setPaymentSuccess(true);
      
      const { data } = await api.get('/appointments');
      setAppointments(data);
      
      setTimeout(() => {
        setPaymentModalOpen(false);
        setIsProcessing(false);
      }, 1500);
    } catch (error) {
      alert("Payment processing failed");
      setIsProcessing(false);
    }
  };

  const requestAppointment = async (doctorId, isEmergency = false) => {
    try {
      await api.post('/appointments/request', {
        doctorId,
        isEmergency,
        notes: isEmergency ? "Emergency Consultation Request" : "General Consultation"
      });
      alert(isEmergency ? 'Emergency Appointment Requested!' : 'Appointment Requested Successfully!');
      // Refresh appointments to hide buttons
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (error) {
      alert('Failed to request appointment');
    }
  };

  const formatDoctorName = (name) => {
    if (!name) return '';
    const cleanName = name.replace(/^Dr\.\s*/i, '');
    return `Dr. ${cleanName}`;
  };

  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo width={40} height={40} />
          <h2>NeuroPlus Guard - Patient Dashboard</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><Info size={18} /> About Us</a>
          <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)' }}>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color='#e1306c'} onMouseOut={e => e.currentTarget.style.color='inherit'}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color='#1da1f2'} onMouseOut={e => e.currentTarget.style.color='inherit'}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg></a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color='#0a66c2'} onMouseOut={e => e.currentTarget.style.color='inherit'}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
          </div>
        </div>
      </nav>

      {pendingMeds.length > 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ color: '#b45309', marginBottom: '4px' }}>🔔 {currentTimeOfDay} Medication Reminder</h4>
            <p style={{ color: '#92400e', fontSize: '0.9rem' }}>You have pending medications: {pendingMeds.map(m => m.medName).join(', ')}</p>
          </div>
          <button onClick={() => navigate('/prescriptions')} className="btn-primary" style={{ background: '#d97706', padding: '8px 16px', fontSize: '0.9rem' }}>
            Log Dose
          </button>
        </div>
      )}

      <div className="grid-cards" style={{ marginBottom: '40px' }}>
        <div className="glass-panel stat-card" onClick={() => window.scrollTo(0, 500)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Search size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <h3>Find Doctor</h3>
          <p>Search and book consultation</p>
        </div>
        <div className="glass-panel stat-card" onClick={() => navigate('/reports')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FileText size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <h3>My Reports</h3>
          <p>Upload and view medical reports</p>
        </div>
        <div className="glass-panel stat-card" onClick={() => navigate('/ai-chatbot')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Bot size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <h3>AI Chatbot</h3>
          <p>Check symptoms instantly</p>
        </div>
        <div className="glass-panel stat-card" onClick={() => navigate('/consultation')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Video size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <h3>Video Call</h3>
          <p>Join active consultation</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Available Doctors</h3>
        {doctors.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No doctors found at the moment.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {doctors.map(doctor => {
              const apptList = Array.isArray(appointments) ? appointments : [];
              const activeAppointment = apptList.find(a => a.doctor?._id === doctor._id && (a.status === 'Pending' || a.status === 'Accepted'));
              return (
              <div key={doctor._id} style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  {doctor.profilePic ? (
                    <img src={doctor.profilePic} alt="Doctor" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} />
                    </div>
                  )}
                  <div>
                    <h4 style={{ color: 'var(--secondary)', margin: 0 }}>{formatDoctorName(doctor.name)}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{doctor.specialization || 'General Physician'}</p>
                  </div>
                </div>
                
                {activeAppointment ? (
                  <div style={{ marginTop: '12px', padding: '8px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: activeAppointment.status === 'Accepted' ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                      Status: {activeAppointment.status}
                    </p>
                    {activeAppointment.status === 'Accepted' && activeAppointment.scheduledAt && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '4px' }}>
                        Scheduled: {new Date(activeAppointment.scheduledAt).toLocaleString()}
                      </p>
                    )}
                    {activeAppointment.status === 'Accepted' && (
                      <>
                        {activeAppointment.feeAmount > 0 && (!activeAppointment.feeStatus || activeAppointment.feeStatus === 'Pending' || activeAppointment.amountPaid < activeAppointment.feeAmount) ? (
                          <button 
                            onClick={() => openPaymentModal(activeAppointment)}
                            className="btn-primary" 
                            style={{ marginTop: '8px', width: '100%', padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--primary)', boxShadow: '0 4px 12px rgba(15,130,135,0.3)' }}
                          >
                            <CreditCard size={16} /> Pay ₹{activeAppointment.feeAmount} to Start Call
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate('/consultation', { state: { autoSelectAppointmentId: activeAppointment._id } })}
                            className="btn-primary" 
                            style={{ marginTop: '8px', width: '100%', padding: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#10b981', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                          >
                            <MessageSquare size={16} /> Start Call & Chat
                          </button>
                        )}
                      </>
                    )}
                    {activeAppointment.status === 'Pending' && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Waiting for doctor's approval.
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button 
                      onClick={() => requestAppointment(doctor._id, false)}
                      className="btn-primary" 
                      style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}>
                      Consultation
                    </button>
                    <button 
                      onClick={() => requestAppointment(doctor._id, true)}
                      className="btn-primary" 
                      style={{ flex: 1, padding: '8px', fontSize: '0.9rem', background: 'var(--error)' }}>
                      Emergency
                    </button>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
      {paymentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '32px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.95)', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}></div>
            
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={24} color="var(--primary)" /> Secure Checkout
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Please complete your payment to join the consultation.
            </p>
            
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Consultation Fee:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{paymentAmount}</span>
            </div>
            
            {paymentSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', color: '#10b981' }}>
                <CheckCircle size={48} style={{ marginBottom: '16px' }} />
                <h4 style={{ margin: 0 }}>Payment Successful!</h4>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Redirecting to room...</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Card Number</label>
                  <input type="text" placeholder="•••• •••• •••• ••••" className="input-field" style={{ width: '100%', boxSizing: 'border-box', background: '#fff' }} />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Expiry</label>
                      <input type="text" placeholder="MM/YY" className="input-field" style={{ width: '100%', boxSizing: 'border-box', background: '#fff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>CVV</label>
                      <input type="password" placeholder="•••" className="input-field" style={{ width: '100%', boxSizing: 'border-box', background: '#fff' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={processPayment} 
                    disabled={isProcessing}
                    className="btn-primary" 
                    style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isProcessing ? 0.7 : 1 }}>
                    {isProcessing ? <Loader size={18} className="pulse-incoming-call" style={{ borderRadius: '50%' }} /> : `Pay ₹${paymentAmount}`}
                  </button>
                  <button 
                    onClick={() => setPaymentModalOpen(false)} 
                    disabled={isProcessing}
                    className="btn-primary" 
                    style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0 20px', opacity: isProcessing ? 0.5 : 1 }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
