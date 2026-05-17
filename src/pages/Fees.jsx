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

  const handlePayFee = async (id, pendingAmount) => {
    const amountToPay = paymentAmounts[id] || pendingAmount;
    if (amountToPay <= 0) return alert('Enter a valid amount');
    if (amountToPay > pendingAmount) return alert('Cannot pay more than pending amount');

    try {
      await api.put(`/appointments/${id}/pay`, { amount: amountToPay });
      alert('Payment confirmed successfully!');
      setPaymentAmounts(prev => ({ ...prev, [id]: '' }));
      fetchAppointments();
    } catch (error) {
      alert('Failed to confirm payment');
    }
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
              .filter(a => a.feeAmount > 0)
              .filter(a => user?.role !== 'Doctor' || (a.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
              .map((appt) => (
              <div key={appt._id} style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h4 style={{ color: 'var(--text-main)', marginBottom: '4px' }}>
                    {user?.role === 'Doctor' ? `Patient: ${appt.patient?.name}` : `Consultation with Dr. ${appt.doctor?.name}`}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Date: {new Date(appt.scheduledAt || appt.createdAt).toLocaleDateString()}</p>
                  <p style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 'bold', marginTop: '8px' }}>
                    Total Fee: ₹{appt.feeAmount}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>
                    Paid: ₹{appt.amountPaid || 0} <span style={{ color: 'var(--text-muted)' }}>(Pending: ₹{appt.feeAmount - (appt.amountPaid || 0)})</span>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: appt.feeStatus === 'Paid' ? '#10b981' : appt.feeStatus === 'Partial' ? '#f59e0b' : 'var(--error)', fontWeight: 'bold', marginTop: '4px' }}>
                    Status: {appt.feeStatus}
                  </p>
                </div>
                
                {user?.role === 'Patient' && appt.feeStatus !== 'Paid' && (
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
                        placeholder={`Amount (Max: ₹${appt.feeAmount - (appt.amountPaid || 0)})`} 
                        className="input-field" 
                        style={{ width: '120px', padding: '6px' }}
                        value={paymentAmounts[appt._id] !== undefined ? paymentAmounts[appt._id] : appt.feeAmount - (appt.amountPaid || 0)}
                        onChange={(e) => setPaymentAmounts({ ...paymentAmounts, [appt._id]: e.target.value })}
                      />
                      <button onClick={() => handlePayFee(appt._id, appt.feeAmount - (appt.amountPaid || 0))} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>Pay</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Fees;
