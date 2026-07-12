import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { Calendar, CheckCircle, XCircle, Clock, CreditCard, Loader, Info } from 'lucide-react';

const PatientAppointments = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentApptId, setPaymentApptId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'upi', 'netbanking'
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  // Fetch patient‑specific appointments
  useEffect(() => {
    localStorage.setItem('lastViewedAppointments', new Date().toISOString());
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
  }, []);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [isEmergencyReq, setIsEmergencyReq] = useState(false);
  // Assuming a list of doctors can be fetched; for demo we use placeholder array
  const [doctors, setDoctors] = useState([]);

  // Fetch doctors list when component mounts
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get('/doctors'); // endpoint should return [{_id, name}]
        setDoctors(data);
      } catch (e) {
        console.error('Failed to fetch doctors', e);
      }
    };
    fetchDoctors();
  }, []);

  const openRequestModal = () => setRequestModalOpen(true);

  const submitRequest = async () => {
    if (!selectedDoctorId) return alert('Select a doctor');
    try {
      await api.post('/appointments/request', {
        doctorId: selectedDoctorId,
        notes: requestNotes,
        isEmergency: isEmergencyReq,
      });
      setRequestModalOpen(false);
      // Refresh appointments list
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to request appointment');
    }
  };

  const openPaymentModal = (appt) => {
    setPaymentApptId(appt._id);
    setPaymentAmount(appt.feeAmount);
    setPaymentSuccess(false);
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardName('');
    setUpiId(appt.doctor?.upiId || '');
    setSelectedBank('');
    setPaymentModalOpen(true);
  };

  const processPayment = async () => {
    let details = {};
    if (paymentMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
        return alert('Please fill in all card details');
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        return alert('Please enter a valid 16-digit card number');
      }
      details = { cardNumber, cardExpiry, cvv: cardCvv, cardName };
    } else if (paymentMethod === 'upi') {
      if (!upiId) {
        return alert('Please enter a valid UPI ID');
      }
      if (!upiId.includes('@')) {
        return alert('UPI ID must contain the @ symbol');
      }
      details = { upiId };
    } else if (paymentMethod === 'netbanking') {
      if (!selectedBank) {
        return alert('Please select your bank');
      }
      details = { bank: selectedBank };
    }

    setIsProcessing(true);
    try {
      await api.put(`/appointments/${paymentApptId}/pay`, { 
        amount: paymentAmount,
        paymentMethod: paymentMethod,
        paymentDetails: details
      });
      setPaymentSuccess(true);
      const { data } = await api.get('/appointments');
      setAppointments(data);
      setTimeout(() => {
        setPaymentModalOpen(false);
        setIsProcessing(false);
      }, 1500);
    } catch (e) {
      const errMsg = e.response?.data?.message || 'Payment failed';
      alert(errMsg);
      setIsProcessing(false);
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo width={40} height={40} />
          <h2>My Appointments</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/about" onClick={e => { e.preventDefault(); navigate('/about'); }} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            <Info size={18} /> About
          </a>
        </div>
      </nav>

          <button onClick={openRequestModal} className="btn-primary" style={{ background: 'var(--secondary)', marginBottom: '16px' }}>
            Request New Appointment
          </button>
      {loading ? (
        <p>Loading appointments…</p>
      ) : (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {appointments.length === 0 ? (
            <p>No appointments scheduled.</p>
          ) : (
            <div className="grid-cards">
              {appointments.map(appt => (
                <div key={appt._id} className="appointment-card">
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                      Doctor: {appt.doctor?.name || 'Unknown'}
                    </h4>
                    <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <strong>Time:</strong> {appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending Confirmation'}
                    </p>
                    <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <strong>Reason:</strong> {appt.notes || 'No reason provided'}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>
                      <strong>Status:</strong> <span style={{ 
                        background: appt.status === 'Accepted' ? '#d1fae5' : appt.status === 'Pending' ? '#fef3c7' : '#e5e7eb', 
                        color: appt.status === 'Accepted' ? '#059669' : appt.status === 'Pending' ? '#d97706' : '#374151',
                        padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' 
                      }}>{appt.status}</span>
                    </p>
                  </div>
                  <div className="appointment-actions" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                    {appt.status === 'Accepted' && (!appt.feeStatus || appt.feeStatus === 'Pending') && appt.feeAmount > 0 && (
                      <button onClick={() => navigate('/fees')} className="btn-primary" style={{ width: '100%' }}>
                        Pay ₹{appt.feeAmount}
                      </button>
                    )}
                    {appt.status === 'Completed' && (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                        <CheckCircle size={18} /> Completed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        {/* Request Appointment Modal */}
        {requestModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '32px', borderRadius: '16px', background: 'rgba(255,255,255,0.95)', position: 'relative' }}>
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary)' }}>Request Appointment</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Select Doctor</label>
                <select className="input-field" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Choose Doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Notes (optional)</label>
                <textarea className="input-field" rows={3} value={requestNotes} onChange={(e) => setRequestNotes(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Emergency?</label>
                <input type="checkbox" checked={isEmergencyReq} onChange={(e) => setIsEmergencyReq(e.target.checked)} style={{ marginLeft: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button onClick={submitRequest} className="btn-primary" style={{ flex: 1 }}>
                  Submit Request
                </button>
                <button onClick={() => setRequestModalOpen(false)} className="btn-primary" style={{ flex: 1, background: '#cbd5e1', color: '#1e293b' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Removed Redundant Payment Modal (Redirects to /fees instead) */}
    </div>
  );
};

export default PatientAppointments;
