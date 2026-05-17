import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', role: 'Patient',
    age: '', bloodGroup: '', specialization: '', upiId: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, formData);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
        {success && <div style={{ color: 'var(--secondary)', marginBottom: '16px', textAlign: 'center' }}>{success}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" name="name" placeholder="Full Name" className="input-field" onChange={handleChange} required />
          <input type="text" name="phone" placeholder="Phone Number" className="input-field" onChange={handleChange} required />
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              placeholder="Password" 
              className="input-field" 
              onChange={handleChange} 
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
          
          <select name="role" className="input-field" onChange={handleChange} value={formData.role}>
            <option value="Patient">Patient</option>
            <option value="Doctor">Doctor</option>
          </select>

          {formData.role === 'Patient' && (
            <>
              <input type="number" name="age" placeholder="Age" className="input-field" onChange={handleChange} />
              <input type="text" name="bloodGroup" placeholder="Blood Group" className="input-field" onChange={handleChange} />
            </>
          )}

          {formData.role === 'Doctor' && (
            <>
              <input type="text" name="specialization" placeholder="Specialization" className="input-field" onChange={handleChange} />
              <input type="text" name="upiId" placeholder="UPI ID for Payments" className="input-field" onChange={handleChange} />
            </>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>Register</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)' }}>
          Already have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span>
        </p>
        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }} onClick={() => navigate('/developer')}>Contact Developer</span>
        </p>
      </div>
    </div>
  );
};

export default Register;
