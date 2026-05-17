import React, { useState, useContext } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(phone, password);
    if (res.success) {
      if (res.role === 'Doctor') navigate('/doctor-dashboard');
      else navigate('/patient-dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg viewBox="0 0 100 100" width="80" height="80" style={{ marginBottom: '16px' }}>
          <path d="M50 5 L10 20 L10 50 C10 75 45 90 50 95 C55 90 90 75 90 50 L90 20 Z" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinejoin="round" />
          <path d="M35 50 L65 50 M50 35 L50 65" stroke="var(--secondary)" strokeWidth="8" strokeLinecap="round" />
          <path d="M25 55 L40 55 L45 35 L55 75 L60 50 L75 50" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinejoin="round" />
          <path d="M68 40 L78 30 L88 40" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M78 30 L78 50" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>
          <span style={{ color: 'var(--primary)' }}>NeuroPlus</span> <span style={{ color: 'var(--secondary)' }}>Guard</span>
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '24px', fontStyle: 'italic' }}>
          Your Health, Our Focus
        </p>
        {error && <div style={{ color: 'var(--error)', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            placeholder="Phone Number" 
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required 
          />
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <span style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => navigate('/forgot-password')}>
              Forgot Password?
            </span>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
            Login
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)' }}>
          Don't have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/register')}>Register here</span>
        </p>
        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }} onClick={() => navigate('/developer')}>Contact Developer</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
