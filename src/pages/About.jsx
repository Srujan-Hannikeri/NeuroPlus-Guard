import React from 'react';
import { Activity, Shield, Users, Globe, ChevronRight } from 'lucide-react';

const About = () => {
  return (
    <div className="dashboard-container" style={{ padding: '24px' }}>
      <div className="glass-panel" style={{ padding: '48px 32px', textAlign: 'center', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}></div>
        <Activity size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: '2.5rem', color: 'var(--secondary)', marginBottom: '16px' }}>NeuroPlus Guard</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          Empowering the future of digital healthcare with seamless telemedicine, intelligent prescriptions, and secure doctor-patient connectivity.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Shield size={32} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--secondary)', marginBottom: '12px' }}>Secure & Private</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
            We utilize end-to-end encryption for all video consultations and chat messages, ensuring your medical data remains strictly confidential and secure.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Users size={32} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--secondary)', marginBottom: '12px' }}>Expert Professionals</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Connect with verified, world-class neurologists and physicians instantly. Quality care is now just a click away from the comfort of your home.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Globe size={32} color="#f59e0b" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--secondary)', marginBottom: '12px' }}>Modern Payments</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Experience hassle-free billing with our integrated modern payment gateway, dynamically unlocked upon doctor approval.
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '8px' }}>Join the Healthcare Revolution</h2>
          <p style={{ color: 'var(--text-muted)' }}>Experience NeuroPlus Guard today.</p>
        </div>
        <button className="btn-primary" onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
          Return to Dashboard <ChevronRight size={18} />
        </button>
      </div>

      {/* Social Media Footer */}
      <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid var(--glass-border)', marginTop: '24px' }}>
        <h4 style={{ color: 'var(--secondary)', marginBottom: '16px' }}>Connect With Us</h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', color: 'var(--text-muted)' }}>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color='#e1306c'} onMouseOut={e => e.currentTarget.style.color='inherit'}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color='#1da1f2'} onMouseOut={e => e.currentTarget.style.color='inherit'}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg></a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color='#0a66c2'} onMouseOut={e => e.currentTarget.style.color='inherit'}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
        </div>
      </div>
    </div>
  );
};

export default About;
