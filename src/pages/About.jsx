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

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '8px' }}>Join the Healthcare Revolution</h2>
          <p style={{ color: 'var(--text-muted)' }}>Experience NeuroPlus Guard today.</p>
        </div>
        <button className="btn-primary" onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
          Return to Dashboard <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default About;
