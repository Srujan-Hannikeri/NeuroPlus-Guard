import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const Fees = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Doctor Form State
  // Doctor Form State
  const [selectedApptId, setSelectedApptId] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Patient Payment State
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [activePaymentAppt, setActivePaymentAppt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'upi', 'netbanking'
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await api.get('/appointments');
      // For doctors, we might want all, for patients we want only accepted/completed with fees
      setAppointments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFee = async (e) => {
    e.preventDefault();
    if (!selectedApptId || !feeAmount) return alert('Select appointment and enter fee');
    try {
      await api.put(`/appointments/${selectedApptId}/fee`, { feeAmount: Number(feeAmount) });
      alert('Fee updated successfully');
      setSelectedApptId('');
      setFeeAmount('');
      fetchAppointments();
    } catch (error) {
      alert('Failed to update fee');
    }
  };

  const handlePayFee = (id, feeId, pendingAmount) => {
    const amountToPay = Number(paymentAmounts[feeId || id] !== undefined ? paymentAmounts[feeId || id] : pendingAmount);
    if (amountToPay <= 0) return alert('Enter a valid amount');
    if (amountToPay > pendingAmount) return alert('Cannot pay more than pending amount');

    const appt = appointments.find(a => a._id === id);
    setActivePaymentAppt({
      id,
      feeId,
      amount: amountToPay,
      doctorName: appt?.doctor?.name || 'Doctor',
      patientName: appt?.patient?.name || 'Patient'
    });
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardName('');
    setUpiId(appt?.doctor?.upiId || '');
    setSelectedBank('');
    setPaymentSuccessData(null);
  };

  const submitGatewayPayment = async () => {
    if (paymentMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
        return alert('Please fill in all card details');
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        return alert('Please enter a valid 16-digit card number');
      }
    } else if (paymentMethod === 'upi') {
      if (!upiId) {
        return alert('Please enter a valid UPI ID');
      }
      if (!upiId.includes('@')) {
        return alert('UPI ID must contain the @ symbol');
      }
    } else if (paymentMethod === 'netbanking') {
      if (!selectedBank) {
        return alert('Please select your bank');
      }
    }

    setIsProcessingPayment(true);
    
    // Simulate gateway API processing
    setTimeout(async () => {
      try {
        await api.put(`/appointments/${activePaymentAppt.id}/pay`, { 
          amount: activePaymentAppt.amount,
          feeId: activePaymentAppt.feeId 
        });
        
        setPaymentSuccessData({
          transactionId: 'TXN' + Math.floor(Math.random() * 90000000 + 10000000),
          amount: activePaymentAppt.amount,
          date: new Date().toLocaleString()
        });
        
        setPaymentAmounts(prev => ({ ...prev, [activePaymentAppt.feeId || activePaymentAppt.id]: '' }));
        fetchAppointments();
      } catch (error) {
        alert('Payment processing failed. Please check your credentials and try again.');
        setActivePaymentAppt(null);
      } finally {
        setIsProcessingPayment(false);
      }
    }, 2000);
  };

  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <Logo width={40} height={40} />
          <h2>Consultation Fees</h2>
        </div>
      </nav>

      {user?.role === 'Doctor' && (
        <div className="grid-cards" style={{ marginBottom: '24px', gridTemplateColumns: '1fr 1fr' }}>
          <div className="glass-panel stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Earnings Today</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              ₹{appointments.filter(a => a.feeAmount > 0 && new Date(a.updatedAt).toDateString() === new Date().toDateString()).reduce((sum, a) => sum + (a.amountPaid || 0), 0)}
            </p>
          </div>
          <div className="glass-panel stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Earnings This Month</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
              ₹{appointments.filter(a => a.feeAmount > 0 && new Date(a.updatedAt).getMonth() === new Date().getMonth() && new Date(a.updatedAt).getFullYear() === new Date().getFullYear()).reduce((sum, a) => sum + (a.amountPaid || 0), 0)}
            </p>
          </div>
        </div>
      )}

      {user?.role === 'Doctor' && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Update Consultation Fee</h3>
          <form onSubmit={handleUpdateFee} style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input-field" value={selectedApptId} onChange={(e) => setSelectedApptId(e.target.value)} required style={{ flex: 2, minWidth: '200px' }}>
              <option value="">Select Patient Appointment</option>
              {appointments.filter(a => a.status === 'Accepted' || a.status === 'Completed').map(a => (
                <option key={a._id} value={a._id}>{a.patient?.name} ({new Date(a.scheduledAt).toLocaleDateString()})</option>
              ))}
            </select>
            <input 
              type="number" 
              placeholder="Fee Amount (₹)" 
              className="input-field" 
              value={feeAmount} 
              onChange={(e) => setFeeAmount(e.target.value)} 
              required 
              style={{ flex: 1, minWidth: '120px' }} 
            />
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px' }}>Update</button>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ color: 'var(--secondary)', margin: 0 }}>Fee History</h3>
          {user?.role === 'Doctor' && (
            <input 
              type="text" 
              placeholder="Search by Patient Name..." 
              className="input-field" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '250px' }}
            />
          )}
        </div>
        
        {loading ? <p>Loading...</p> : appointments.filter(a => a.feeAmount > 0).length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No fees recorded.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {appointments
              .filter(a => user?.role !== 'Doctor' || (a.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
              .flatMap(appt => {
                 if (appt.feeHistory && appt.feeHistory.length > 0) {
                   return appt.feeHistory.map(fee => ({ appt, fee }));
                 } else if (appt.feeAmount > 0) {
                   return [{ appt, fee: { _id: 'legacy', amount: appt.feeAmount, amountPaid: appt.amountPaid || 0, status: appt.feeStatus, date: appt.scheduledAt || appt.createdAt } }];
                 }
                 return [];
              })
              .sort((a, b) => new Date(b.fee.date) - new Date(a.fee.date))
              .map(({ appt, fee }, index) => {
                const uniqueKey = fee._id === 'legacy' ? appt._id : fee._id;
                const pendingBal = fee.amount - (fee.amountPaid || 0);
                
                return (
              <div key={`${appt._id}-${uniqueKey}-${index}`} style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h4 style={{ color: 'var(--text-main)', marginBottom: '4px' }}>
                    {user?.role === 'Doctor' ? `Patient: ${appt.patient?.name}` : `Consultation with Dr. ${appt.doctor?.name}`}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Date: {new Date(fee.date).toLocaleDateString()}</p>
                  <p style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '8px' }}>
                    Total Fee: ₹{fee.amount}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>
                    Paid: ₹{fee.amountPaid || 0} <span style={{ color: 'var(--text-muted)' }}>(Pending: ₹{pendingBal})</span>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: fee.status === 'Paid' ? '#10b981' : fee.status === 'Partial' ? '#f59e0b' : 'var(--error)', fontWeight: 'bold', marginTop: '4px' }}>
                    Status: {fee.status}
                  </p>
                </div>
                
                {user?.role === 'Patient' && fee.status !== 'Paid' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Pay via UPI</p>
                    {appt.doctor?.upiQrCode ? (
                       <img src={appt.doctor.upiQrCode?.startsWith('data:') ? appt.doctor.upiQrCode : `${API_URL}${appt.doctor.upiQrCode}`} alt="UPI QR" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
                    ) : (
                       <div style={{ width: '100px', height: '100px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', textAlign: 'center' }}>No QR Uploaded</div>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>UPI ID: {appt.doctor?.upiId || 'N/A'}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input 
                        type="number" 
                        placeholder={`Amount (Max: ₹${pendingBal})`} 
                        className="input-field" 
                        style={{ width: '120px', padding: '6px' }}
                        value={paymentAmounts[uniqueKey] !== undefined ? paymentAmounts[uniqueKey] : pendingBal}
                        onChange={(e) => setPaymentAmounts({ ...paymentAmounts, [uniqueKey]: e.target.value })}
                      />
                      <button onClick={() => handlePayFee(appt._id, fee._id === 'legacy' ? null : fee._id, pendingBal)} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>Pay</button>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Premium Payment Gateway Checkout Modal */}
      {activePaymentAppt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '450px',
            width: '100%',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--glass-border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--glass-border)',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>Secure Payment Gateway</h3>
              {!isProcessingPayment && !paymentSuccessData && (
                <button 
                  onClick={() => setActivePaymentAppt(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', opacity: 0.8 }}
                >
                  &times;
                </button>
              )}
            </div>

            {/* Content Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isProcessingPayment ? (
                /* Processing State Spinner */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '16px' }}>
                  <svg style={{ animation: 'spin 1s linear infinite', width: '48px', height: '48px' }} viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" strokeDasharray="31.4 31.4"></circle>
                  </svg>
                  <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 'bold' }}>Processing Secure Transaction...</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Please do not close this window or click refresh.</p>
                </div>
              ) : paymentSuccessData ? (
                /* Payment Success Data view */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px 0', gap: '12px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '8px', fontWeight: 'bold' }}>
                    ✓
                  </div>
                  <h3 style={{ margin: 0, color: '#059669', fontWeight: 'bold', fontSize: '1.35rem' }}>Payment Successful!</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Your payment of <strong>₹{paymentSuccessData.amount}</strong> to Dr. {activePaymentAppt.doctorName} was processed successfully.
                  </p>
                  
                  <div style={{ width: '100%', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span> <strong style={{ color: 'var(--text-main)' }}>{paymentSuccessData.transactionId}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span> <strong style={{ color: 'var(--text-main)' }}>₹{paymentSuccessData.amount}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Timestamp:</span> <strong style={{ color: 'var(--text-main)' }}>{paymentSuccessData.date}</strong></div>
                  </div>

                  <button 
                    onClick={() => setActivePaymentAppt(null)}
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '16px', padding: '10px 0', background: '#059669' }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Payment Details Forms */
                <>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Paying for Consultation with:</span>
                      <h4 style={{ margin: '2px 0 0', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 'bold' }}>Dr. {activePaymentAppt.doctorName}</h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Amount:</span>
                      <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>₹{activePaymentAppt.amount}</h3>
                    </div>
                  </div>

                  {/* Payment Method Selector Tab */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2px', gap: '8px' }}>
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

                  {/* Payment Method Specific Inputs */}
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
                          placeholder="4111 2222 3333 4444" 
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
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Expiry Date</label>
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
                            placeholder="***" 
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Enter UPI ID</label>
                        <input 
                          type="text" 
                          placeholder="username@bank" 
                          className="input-field" 
                          value={upiId} 
                          onChange={(e) => setUpiId(e.target.value)}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        You will receive a collect request on your GPay/PhonePe/Paytm mobile app.
                      </p>
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

                  <button 
                    type="button"
                    onClick={submitGatewayPayment}
                    className="btn-primary" 
                    style={{ width: '100%', padding: '12px 0', marginTop: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}
                  >
                    Pay ₹{activePaymentAppt.amount} Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;
