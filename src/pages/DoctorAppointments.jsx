import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { Calendar, CheckCircle, XCircle, Clock, User, Home, FileText, Video, Pill, IndianRupee, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

const DoctorAppointments = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [feeAmount, setFeeAmount] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const { data } = await api.get('/appointments');
        setAppointments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const openScheduleModal = (appt) => {
    setSelectedAppointment(appt);
    setScheduleModalOpen(true);
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return alert('Select date & time');
    try {
      await api.put(`/appointments/${selectedAppointment._id}/status`, {
        status: 'Accepted',
        scheduledAt: scheduleDate,
      });
      if (feeAmount) {
        await api.put(`/appointments/${selectedAppointment._id}/fee`, { feeAmount: Number(feeAmount) });
      }
      alert('Appointment updated');
      setScheduleModalOpen(false);
      setSelectedAppointment(null);
      setScheduleDate('');
      setFeeAmount('');
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (e) {
      console.error(e);
      alert('Failed to update');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/appointments/${id}/status`, { status: 'Rejected' });
      alert('Rejected');
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (e) {
      console.error(e);
      alert('Failed');
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/appointments/${id}/status`, { status: 'Completed' });
      alert('Consultation Completed');
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (e) {
      console.error(e);
      alert('Failed to complete');
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo width={40} height={40} />
          <h2>Doctor - Appointments</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/about" onClick={e => { e.preventDefault(); navigate('/about'); }} style={{ color: 'var(--primary)', textDecoration: 'none' }}>About</a>
        </div>
      </nav>

      {loading ? <p>Loading...</p> : (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {appointments.length === 0 ? (
            <p>No appointments.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {appointments.map(appt => (
                <div key={appt._id} className="glass-panel" style={{ padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4>{appt.patient?.name || 'Unknown'} {appt.isEmergency && <span style={{ background: 'var(--error)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>EMERGENCY</span>}</h4>
                      <p>{appt.notes}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {appt.status === 'Pending' && (
                        <>
                          <button onClick={() => openScheduleModal(appt)} className="btn-primary" style={{ background: '#10b981' }}>Schedule</button>
                          <button onClick={() => handleReject(appt._id)} className="btn-primary" style={{ background: 'var(--error)' }}>Reject</button>
                        </>
                      )}
                      {appt.status === 'Accepted' && (
                        <button onClick={() => handleComplete(appt._id)} className="btn-primary" style={{ background: '#10b981' }}>Complete Consultation</button>
                      )}
                      {appt.status !== 'Pending' && (
                        <span style={{ background: '#e5e7eb', color: '#111', padding: '2px 8px', borderRadius: '4px' }}>{appt.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalOpen && selectedAppointment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h3>Schedule & Fee</h3>
            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ width: '100%', marginBottom: '12px' }} />
            <input type="number" placeholder="Fee (₹)" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} style={{ width: '100%', marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSchedule} className="btn-primary" style={{ flex: 1 }}>Save</button>
              <button onClick={() => setScheduleModalOpen(false)} className="btn-primary" style={{ flex: 1, background: '#cbd5e1' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;
