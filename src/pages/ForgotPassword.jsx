import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { phone });
      setSuccess(res.data.message);
      if (res.data.mockOtp) {
        alert(`[TEST MODE] Your Mock OTP is: ${res.data.mockOtp}\nIn production, this would be sent to your phone via SMS.`);
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/reset-password`, { phone, otp, newPassword });
      setSuccess(res.data.message + '. Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>
          <span style={{ color: 'var(--primary)' }}>Reset</span> <span style={{ color: 'var(--secondary)' }}>Password</span>
        </h2>
        
        {error && <div style={{ color: 'var(--error)', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        {success && <div style={{ color: 'var(--secondary)', marginBottom: '16px', textAlign: 'center' }}>{success}</div>}
        
        {step === 1 ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Enter your registered phone number to receive an OTP.</p>
            <input 
              type="text" 
              placeholder="Phone Number" 
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required 
            />
            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
             <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Enter the OTP sent to your phone and your new password.</p>
             <input 
              type="text" 
              placeholder="OTP" 
              className="input-field"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required 
            />
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="New Password" 
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <div 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              Reset Password
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)' }}>
          Remember your password? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
