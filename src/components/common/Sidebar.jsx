import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Logo from './Logo';
import { Home, FileText, MessageSquare, LogOut, Video, ChevronUp, ChevronDown, User, Pill, IndianRupee, Code } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const formatDoctorName = (name, role) => {
    if (!name) return '';
    if (role === 'Doctor') {
      const cleanName = name.replace(/^Dr\.\s*/i, '');
      return `Dr. ${cleanName}`;
    }
    return name;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role === 'Doctor' ? [
    { name: 'Dashboard', path: '/doctor-dashboard', icon: <Home size={20} /> },
    { name: 'Patient Reports', path: '/reports', icon: <FileText size={20} /> },
    { name: 'Consultations', path: '/consultation', icon: <Video size={20} /> },
    { name: 'Prescriptions', path: '/prescriptions', icon: <Pill size={20} /> },
    { name: 'Fees', path: '/fees', icon: <IndianRupee size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
  ] : [
    { name: 'Dashboard', path: '/patient-dashboard', icon: <Home size={20} /> },
    { name: 'My Reports', path: '/reports', icon: <FileText size={20} /> },
    { name: 'AI Symptom Checker', path: '/ai-chatbot', icon: <MessageSquare size={20} /> },
    { name: 'Video Call', path: '/consultation', icon: <Video size={20} /> },
    { name: 'My Prescriptions', path: '/prescriptions', icon: <Pill size={20} /> },
    { name: 'Consultation Fees', path: '/fees', icon: <IndianRupee size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
  ];

  return (
    <div className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <Logo width={40} height={40} />
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>NeuroPlus <span style={{ color: 'var(--secondary)' }}>Guard</span></h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>Your Health, Our Focus</p>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => (
          <NavLink 
            key={item.name} 
            to={item.path} 
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span className="sidebar-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ position: 'relative', marginTop: 'auto' }}>
        {isProfileOpen && (
          <div style={{ 
            position: 'absolute', 
            bottom: '100%', 
            left: 0, 
            width: '100%', 
            background: 'var(--card-bg)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '12px', 
            padding: '16px', 
            marginBottom: '8px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
               {user?.profilePic ? (
                 <img src={user.profilePic?.startsWith('data:') ? user.profilePic : user.profilePic} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <User size={20} />
                 </div>
               )}
               <div>
                  <p style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatDoctorName(user?.name, user?.role)}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.role}</p>
               </div>
            </div>
            
            {/* User Details Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{user?.phone}</span>
              </div>
              
              {user?.role === 'Patient' && (
                <>
                  {user?.age && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Age:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{user.age}</span>
                    </div>
                  )}
                  {user?.bloodGroup && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Blood Group:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{user.bloodGroup}</span>
                    </div>
                  )}
                </>
              )}

              {user?.role === 'Doctor' && (
                <>
                  {user?.specialization && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Specialization:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{user.specialization}</span>
                    </div>
                  )}
                  {user?.upiId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>UPI ID:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '500', wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>{user.upiId}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', margin: '12px 0' }}></div>
            <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '8px 0' }}>
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        )}
        
        <div 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          style={{ 
            padding: '12px', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            cursor: 'pointer',
            background: isProfileOpen ? 'rgba(15, 130, 135, 0.05)' : 'transparent',
            transition: 'background 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user?.profilePic ? (
               <img src={user.profilePic?.startsWith('data:') ? user.profilePic : user.profilePic} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
               <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <User size={16} />
               </div>
            )}
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1.2' }}>{formatDoctorName(user?.name, user?.role)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Profile</p>
            </div>
          </div>
          {isProfileOpen ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronUp size={16} color="var(--text-muted)" />}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
