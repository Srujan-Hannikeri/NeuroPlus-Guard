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

  // Fetch patient‑specific appointments
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/appointments/me'); // endpoint returns appointments for logged‑in patient
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

  const openPaymentModal = (appt) => {
    setPaymentApptId(appt._id);
    setPaymentAmount(appt.feeAmount);
    setPaymentSuccess(false);
    setPaymentModalOpen(true);
  };

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      await api.put(`/appointments/${paymentApptId}/pay`, { amount: paymentAmount });
      setPaymentSuccess(true);
      const { data } = await api.get('/appointments/me');
      setAppointments(data);
      setTimeout(() => {
        setPaymentModalOpen(false);
        setIsProcessing(false);
      }, 1500);
    } catch (e) {
      alert('Payment failed');
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

      {loading ? (
        <p>Loading appointments…</p>
      ) : (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {appointments.length === 0 ? (
            <p>No appointments scheduled.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {appointments.map(appt => (
                <div key={appt._id} className="glass-panel" style={{ padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{appt.doctor?.name || 'Doctor'} – {new Date(appt.scheduledAt).toLocaleString()}</h4>
                    <p style={{ margin: '4px 0' }}>{appt.notes}</p>
                    <span style={{ fontSize: '0.85rem', color: '#555' }}>Status: {appt.status}</span>
                  </div>
                  <div>
                    {appt.status === 'Accepted' && (!appt.feeStatus || appt.feeStatus === 'Pending') && (
                      <button onClick={() => openPaymentModal(appt)} className="btn-primary" style={{ background: 'var(--primary)' }}>
                        Pay ₹{appt.feeAmount}
                      </button>
                    )}
                    {appt.status === 'Completed' && (
                      <span style={{ color: '#10b981' }}>Done</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.95)' }}>
            <h3 style={{ marginBottom: '12px' }}>Secure Payment</h3>
            <p>Pay ₹{paymentAmount} to confirm your appointment.</p>
            {paymentSuccess ? (
              <div style={{ color: '#10b981', textAlign: 'center' }}>
                <CheckCircle size={48} />
                <h4>Payment Successful!</h4>
              </div>
            ) : (
              <>
                <input type="text" placeholder="Card Number" className="input-field" style={{ width: '100%', marginBottom: '12px' }} />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input type="text" placeholder="MM/YY" className="input-field" style={{ flex: 1 }} />
                  <input type="password" placeholder="CVV" className="input-field" style={{ flex: 1 }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={processPayment} disabled={isProcessing} className="btn-primary" style={{ flex: 1 }}>
                    {isProcessing ? <Loader size={18} className="pulse-incoming-call" /> : `Pay ₹${paymentAmount}`}
                  </button>
                  <button onClick={() => setPaymentModalOpen(false)} disabled={isProcessing} className="btn-primary" style={{ flex: 1, background: '#e2e8f0', color: 'var(--text-main)' }}>
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

export default PatientAppointments;
