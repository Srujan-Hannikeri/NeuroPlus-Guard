import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { Users, Clock, CheckCircle, User, MessageSquare, Video, Info } from 'lucide-react';

const DoctorDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalPatients: 0, pendingRequests: 0, consultedPatients: 0 });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [feeAmount, setFeeAmount] = useState('');

  useEffect(() => {
    const fetchDashboardAndAppointments = async () => {
      try {
        const dashboardRes = await api.get('/doctors/dashboard');
        setStats(dashboardRes.data);
        
        const appointmentsRes = await api.get('/appointments');
        setAppointments(appointmentsRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard or appointments", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardAndAppointments();
    
    // Auto-refresh every 10 seconds to make the dashboard fully interactive
    const interval = setInterval(fetchDashboardAndAppointments, 10000);
    return () => clearInterval(interval);
  }, []);

  const openScheduleModal = (appt) => {
    setSelectedAppointment(appt);
    // Pre‑fill date picker with existing scheduled time if present (ISO format for datetime‑local)
    const prefill = appt.scheduledAt ? new Date(appt.scheduledAt).toISOString().slice(0, 16) : '';
    setScheduleDate(prefill);
    setScheduleModalOpen(true);
  };

  const handleScheduleAppointment = async () => {
    if (!scheduleDate) return alert('Please select a date and time.');
    if (feeAmount === '' || isNaN(feeAmount) || Number(feeAmount) < 0) return alert('Please enter a valid consultation fee amount (0 for free).');

    try {
      if (selectedAppointment?.status === 'Pending') {
        await api.put(`/appointments/${selectedAppointment._id}/status`, { scheduledAt: scheduleDate, status: 'Accepted' });
      } else {
        await api.put(`/appointments/${selectedAppointment._id}/reschedule`, { scheduledAt: scheduleDate });
      }

      // Update the fee amount regardless of status change.
      await api.put(`/appointments/${selectedAppointment._id}/fee`, { feeAmount: Number(feeAmount) });

      const appointmentsRes = await api.get('/appointments');
      setAppointments(appointmentsRes.data);
      setScheduleModalOpen(false);
      setSelectedAppointment(null);
      setFeeAmount('');
      alert('Appointment schedule updated successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to schedule appointment');
      console.error(error);
    }
  };

  const handleRejectAppointment = async (id) => {
    try {
      await api.put(`/appointments/${id}/status`, { status: 'Rejected' });
      // Refresh appointments
      const appointmentsRes = await api.get('/appointments');
      setAppointments(appointmentsRes.data);
      alert('Appointment Rejected.');
    } catch (error) {
      alert('Failed to reject appointment');
      console.error(error);
    }
  };

  const handleCompleteAppointment = async (id) => {
    try {
      await api.put(`/appointments/${id}/status`, { status: 'Completed' });
      // Refresh appointments
      const appointmentsRes = await api.get('/appointments');
      setAppointments(appointmentsRes.data);
      alert('Appointment marked as Consulted (Completed).');
    } catch (error) {
      alert('Failed to complete appointment');
      console.error(error);
    }
  };



  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo width={40} height={40} />
          <h2>NeuroPlus Guard - Doctor Dashboard</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><Info size={18} /> About Us</a>
        </div>
      </nav>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <div className="grid-cards">
          <div className="glass-panel stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Users size={32} color="var(--primary)" style={{ marginBottom: '8px' }} />
            <h3>{stats.totalPatients}</h3>
            <p>Total Patients</p>
          </div>
          <div className="glass-panel stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Clock size={32} color="var(--error)" style={{ marginBottom: '8px' }} />
            <h3>{stats.pendingRequests}</h3>
            <p>Pending Requests</p>
          </div>
          <div className="glass-panel stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckCircle size={32} color="#10b981" style={{ marginBottom: '8px' }} />
            <h3>{stats.consultedPatients}</h3>
            <p>Consultations</p>
          </div>
        </div>
      )}
      
      {/* Appointments Section */}
      <div style={{ marginTop: '40px' }} className="glass-panel">
        <div style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '16px' }}>Upcoming & Pending Consultations</h3>
          
          {(!Array.isArray(appointments) || appointments.length === 0) ? (
            <p style={{ color: 'var(--text-muted)' }}>No consultations available at the moment.</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {appointments.map((appt) => (
                <div key={appt._id} className="appointment-card glass-panel">
                  <div>
                    <h4 style={{ color: 'var(--secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {appt.patient?.profilePic ? (
                        <img src={appt.patient.profilePic} alt="Patient" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                      )}
                      {appt.patient?.name || 'Unknown'}{appt.isEmergency && (
                        <span style={{ marginLeft: '8px', background: 'var(--error)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>EMERGENCY</span>
                      )}
                    </h4>
                    <p className="appointment-time" style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      — {new Date(appt.scheduledAt || appt.createdAt).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: appt.status === 'Pending' ? 'var(--error)' : 'var(--primary)', fontWeight: 'bold' }}>
                      Status: {appt.status}
                    </p>
                    {appt.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>"{appt.notes}"</p>}

                  </div>
                  <div className="appointment-actions">
                    {appt.status === 'Pending' && (
                      <>
                        <button 
                          onClick={() => openScheduleModal(appt)} 
                          className="btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '0.9rem', background: '#10b981' }}>
                          Reschedule
                        </button>
                        <button 
                          onClick={() => handleRejectAppointment(appt._id)} 
                          className="btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'var(--error)' }}>
                          Reject
                        </button>
                      </>
                    )}
                     {appt.status === 'Accepted' && (
                      <>
                        <button 
                          onClick={() => handleCompleteAppointment(appt._id)}
                          className="btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '0.9rem', background: '#10b981' }}
                        >
                          Complete Consultation
                        </button>
                        <button 
                          onClick={() => openScheduleModal(appt)}
                          className="btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'var(--secondary)', marginLeft: '8px' }}
                        >
                          Reschedule
                        </button>
                      </>
                     )}
                     <button 
                      onClick={() => navigate('/consultation', { state: { autoSelectAppointmentId: appt._id } })}
                      className="btn-primary" 
                      disabled={appt.status === 'Pending' || appt.status === 'Completed'}
                      style={{ padding: '8px 16px', fontSize: '0.9rem', opacity: (appt.status === 'Pending' || appt.status === 'Completed') ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary)' }}>
                      <MessageSquare size={14} /> Start Call & Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {scheduleModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '24px', width: '100%', maxWidth: '400px', background: '#fff' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Schedule Appointment</h3>
            {selectedAppointment?.isEmergency && (
              <p style={{ color: 'var(--error)', fontSize: '0.9rem', marginBottom: '16px' }}>
                ⚠️ Emergency request. Must be scheduled within 24 hours.
              </p>
            )}
            <input 
              type="datetime-local" 
              className="input-field" 
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16)}
              max={selectedAppointment?.isEmergency ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 24 * 60 * 60 * 1000).toISOString().slice(0,16) : undefined}
              style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Consultation Fee (₹)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="e.g. 500 (Set 0 for free)"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              min="0"
              style={{ width: '100%', marginBottom: '24px', boxSizing: 'border-box' }}
            />
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" onClick={handleScheduleAppointment} style={{ flex: 1 }}>Confirm</button>
              <button className="btn-primary" onClick={() => setScheduleModalOpen(false)} style={{ flex: 1, background: '#cbd5e1', color: '#1e293b' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
