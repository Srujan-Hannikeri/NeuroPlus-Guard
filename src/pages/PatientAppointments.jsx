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
    const fetch = async () => {
      try {
        const { data } = await api.get('/appointments'); // endpoint returns appointments for logged‑in patient
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
            <div style={{ display: 'grid', gap: '12px' }}>
              {appointments.map(appt => (
                <div key={appt._id} className="glass-panel" style={{ padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{appt.doctor?.name || 'Doctor'} – {new Date(appt.scheduledAt || appt.createdAt).toLocaleDateString()} <span style={{ color: '#555', fontSize: '0.85rem' }}>{new Date(appt.scheduledAt || appt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></h4>
                    <p style={{ margin: '4px 0' }}>{appt.notes}</p>
                    <span style={{ fontSize: '0.85rem', color: '#555' }}>Status: {appt.status}</span>
                    <p style={{ fontSize: '0.75rem', color: '#555', textAlign: 'right', marginTop: '4px' }}>{new Date(appt.scheduledAt || appt.createdAt).toLocaleString()}</p>
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

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '32px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.95)', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}></div>
            
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={24} color="var(--primary)" /> Secure Checkout
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Please complete your payment to confirm your appointment.
            </p>
            
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{paymentAmount}</span>
            </div>
            
            {paymentSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', color: '#10b981' }}>
                <CheckCircle size={48} style={{ marginBottom: '16px' }} />
                <h4 style={{ margin: 0 }}>Payment Successful!</h4>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Confirming appointment...</p>
              </div>
            ) : (
              <>
                {/* Payment Method Selector Tab */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2px', gap: '8px', marginBottom: '16px' }}>
                  {['card', 'upi', 'netbanking'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        borderBottom: paymentMethod === method ? '2px solid var(--primary)' : '2px solid transparent',
                        color: paymentMethod === method ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: 'bold',
                        padding: '8px 0',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {method === 'upi' ? 'UPI' : method === 'netbanking' ? 'Net Banking' : 'Card'}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  {paymentMethod === 'card' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Cardholder Name</label>
                        <input 
                          type="text" 
                          placeholder="John Doe" 
                          className="input-field" 
                          value={cardName} 
                          onChange={(e) => setCardName(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Card Number</label>
                        <input 
                          type="text" 
                          placeholder="•••• •••• •••• ••••" 
                          maxLength="19"
                          className="input-field" 
                          value={cardNumber} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                            setCardNumber(val);
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Expiry</label>
                          <input 
                            type="text" 
                            placeholder="MM/YY" 
                            maxLength="5"
                            className="input-field" 
                            value={cardExpiry} 
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 2) val = val.substring(0,2) + '/' + val.substring(2,4);
                              setCardExpiry(val);
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>CVV</label>
                          <input 
                            type="password" 
                            placeholder="•••" 
                            maxLength="3"
                            className="input-field" 
                            value={cardCvv} 
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Enter UPI ID</label>
      <input 
        type="text" 
        placeholder="username@bank" 
        className="input-field" 
        value={upiId} 
        onChange={(e) => setUpiId(e.target.value)}
      />
    </div>
    {upiId && (
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiId)}&size=150x150`}
        alt="UPI QR"
        style={{ marginTop: '12px', borderRadius: '8px' }}
      />
    )}
    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
      You will receive a collect request on your GPay/PhonePe/Paytm app.
    </p>
    {upiId && (
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
        UPI ID: <span style={{ fontWeight: 'bold' }}>{upiId}</span>
      </p>
    )}
  </div>
)}

                  {paymentMethod === 'netbanking' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Select Bank</label>
                      <select 
                        className="input-field" 
                        value={selectedBank} 
                        onChange={(e) => setSelectedBank(e.target.value)}
                      >
                        <option value="">Choose Bank</option>
                        <option value="SBI">State Bank of India</option>
                        <option value="HDFC">HDFC Bank</option>
                        <option value="ICICI">ICICI Bank</option>
                        <option value="AXIS">Axis Bank</option>
                        <option value="KOTAK">Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}
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

export default PatientAppointments;
