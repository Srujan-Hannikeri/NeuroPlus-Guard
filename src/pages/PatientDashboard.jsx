import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { Search, FileText, Bot, Video, User, MessageSquare } from 'lucide-react';

const PatientDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState('');

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
        p.medicines.forEach(m => {
          if ((currentTimeOfDay === 'Morning' && m.morning) ||
              (currentTimeOfDay === 'Afternoon' && m.afternoon) ||
              (currentTimeOfDay === 'Night' && m.night)) {
            pending.push({ prescId: p._id, medName: m.name });
          }
        });
      }
    });
    return pending;
  };

  const pendingMeds = getPendingMedicines();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <button onClick={handleLogout} className="btn-primary" style={{ background: 'var(--error)' }}>Logout</button>
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
              const activeAppointment = appointments.find(a => a.doctor?._id === doctor._id && (a.status === 'Pending' || a.status === 'Accepted'));
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
                      <button 
                        onClick={() => navigate('/consultation', { state: { autoSelectAppointmentId: activeAppointment._id } })}
                        className="btn-primary" 
                        style={{ marginTop: '8px', width: '100%', padding: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--primary)' }}
                      >
                        <MessageSquare size={14} /> Start Call & Chat
                      </button>
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
    </div>
  );
};

export default PatientDashboard;
