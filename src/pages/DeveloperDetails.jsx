import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, ArrowLeft, Code2, ShieldCheck, Zap } from 'lucide-react';

const Instagram = ({ size = 24 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const Linkedin = ({ size = 24 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const DeveloperDetails = () => {
  const navigate = useNavigate();

  const details = [
    { icon: <User size={24} />, label: 'Developer', value: 'Srujan Hannikeri' },
    { icon: <Phone size={24} />, label: 'Phone', value: '+91 9886217143' },
    { icon: <Mail size={24} />, label: 'Email', value: 'srujanhannikeri@gmail.com' },
    { icon: <Linkedin size={24} />, label: 'LinkedIn', value: 'Srujan Hannikeri', link: 'https://www.linkedin.com/in/srujan-hannikeri-095936336/' },
    { icon: <Instagram size={24} />, label: 'Instagram', value: '@srujan_hannikeri', link: 'https://instagram.com/srujan_hannikeri' },
  ];

  return (
    <div className="auth-container" style={{ background: 'var(--bg-main)', padding: '20px' }}>
      <style>
        {`
          @media (max-width: 600px) {
            .developer-panel {
              padding: 24px !important;
            }
            .developer-header h1 {
              font-size: 1.8rem !important;
            }
            .developer-header p {
              font-size: 0.95rem !important;
            }
            .detail-card {
              padding: 15px !important;
              gap: 15px !important;
            }
            .detail-icon {
              width: 40px !important;
              height: 40px !important;
            }
            .detail-label {
              font-size: 0.8rem !important;
            }
            .detail-value {
              font-size: 1rem !important;
            }
            .mission-card {
              padding: 18px !important;
              margin-top: 24px !important;
            }
            .mission-tags {
              flex-wrap: wrap;
            }
          }
        `}
      </style>
      <div className="glass-panel developer-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px', position: 'relative', overflow: 'hidden' }}>
        {/* Background Decorative Elements */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--primary)', opacity: 0.05, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '100px', height: '100px', background: 'var(--secondary)', opacity: 0.05, borderRadius: '50%' }}></div>

        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--primary)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '32px',
            fontWeight: '600',
            padding: '0'
          }}
        >
          <ArrowLeft size={20} /> Back
        </button>

        <div className="developer-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
            margin: '0 auto 20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 10px 20px rgba(15, 130, 135, 0.2)'
          }}>
            <Code2 size={48} />
          </div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--text-main)' }}>Meet the Developer</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>The architect behind NeuroPlus Guard</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {details.map((detail, index) => (
            <div 
              key={index} 
              className="detail-card"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px', 
                padding: '20px', 
                borderRadius: '16px', 
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid var(--glass-border)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: detail.link ? 'pointer' : 'default'
              }}
              onClick={() => detail.link && window.open(detail.link, '_blank')}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="detail-icon" style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '12px', 
                background: 'rgba(15, 130, 135, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--primary)',
                flexShrink: 0
              }}>
                {detail.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="detail-label" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{detail.label}</p>
                <p className="detail-value" style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)', wordBreak: 'break-word' }}>{detail.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mission-card" style={{ 
          marginTop: '40px', 
          padding: '24px', 
          borderRadius: '16px', 
          background: 'linear-gradient(135deg, rgba(15, 130, 135, 0.05), rgba(33, 78, 120, 0.05))',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} /> Project Mission
          </h3>
          <p style={{ color: 'var(--text-main)', lineHeight: '1.6', fontSize: '0.95rem' }}>
            NeuroPlus Guard is designed to revolutionize neurological healthcare by providing a seamless, secure, and AI-driven platform for patients and doctors alike.
          </p>
          <div className="mission-tags" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'white', fontSize: '0.8rem', color: 'var(--primary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={14} /> High Performance
            </span>
            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'white', fontSize: '0.8rem', color: 'var(--primary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> Secure Data
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDetails;
