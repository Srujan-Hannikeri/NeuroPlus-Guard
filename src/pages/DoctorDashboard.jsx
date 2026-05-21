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
  }, []);

  const openScheduleModal = (appt) => {
    setSelectedAppointment(appt);
    setScheduleModalOpen(true);
  };

  const handleScheduleAppointment = async () => {
    if (!scheduleDate) return alert("Please select a date and time.");
    if (feeAmount === '' || isNaN(feeAmount) || Number(feeAmount) < 0) return alert("Please enter a valid consultation fee amount (0 for free).");
    
    if (selectedAppointment?.isEmergency) {
      const selected = new Date(scheduleDate);
      const maxDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (selected > maxDate) {
        return alert("Emergency appointments MUST be scheduled within 24 hours.");
      }
    }

    try {
      await api.put(`/appointments/${selectedAppointment._id}/status`, { 
        status: 'Accepted',
        scheduledAt: scheduleDate
      });
      
      // Update the fee amount immediately after accepting
      await api.put(`/appointments/${selectedAppointment._id}/fee`, {
        feeAmount: Number(feeAmount)
      });
      
      // Refresh appointments
      const appointmentsRes = await api.get('/appointments');
      setAppointments(appointmentsRes.data);
      setScheduleModalOpen(false);
      setSelectedAppointment(null);
      setFeeAmount('');
      alert('Appointment Scheduled successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept appointment');
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



  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo width={40} height={40} />
          <h2>NeuroPlus Guard - Doctor Dashboard</h2>
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
                <div key={appt._id} style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ color: 'var(--secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {appt.patient?.profilePic ? (
                        <img src={appt.patient.profilePic} alt="Patient" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                      )}
                      Patient: {appt.patient?.name || 'Unknown'}
                      {appt.isEmergency && <span style={{ marginLeft: '8px', background: 'var(--error)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>EMERGENCY</span>}
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {appt.scheduledAt ? `Scheduled for ${new Date(appt.scheduledAt).toLocaleString()}` : `Requested at ${new Date(appt.createdAt).toLocaleString()}`}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: appt.status === 'Pending' ? 'var(--error)' : 'var(--primary)', fontWeight: 'bold' }}>Status: {appt.status}</p>
                    {appt.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>"{appt.notes}"</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {appt.status === 'Pending' && (
                      <>
                        <button 
                          onClick={() => openScheduleModal(appt)}
                          className="btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '0.9rem', background: '#10b981' }}>
                          Schedule
                        </button>
                        <button 
                          onClick={() => handleRejectAppointment(appt._id)}
                          className="btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'var(--error)' }}>
                          Reject
                        </button>
                      </>
                    )}
                     <button 
                      onClick={() => navigate('/consultation', { state: { autoSelectAppointmentId: appt._id } })}
                      className="btn-primary" 
                      disabled={appt.status === 'Pending'}
                      style={{ padding: '8px 16px', fontSize: '0.9rem', opacity: appt.status === 'Pending' ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary)' }}>
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
              min={new Date().toISOString().slice(0, 16)}
              max={selectedAppointment?.isEmergency ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) : undefined}
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
