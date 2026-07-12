import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Logo from './Logo';
import api from '../../services/api';
import { Home, FileText, MessageSquare, LogOut, Video, ChevronUp, ChevronDown, User, Pill, IndianRupee, Code, Calendar } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);

  const [badges, setBadges] = useState({
    consultation: 0,
    prescriptions: 0,
    reports: 0,
    fees: 0,
    appointments: 0
  });

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const fetchBadges = async () => {
      try {
        // 1. Fetch appointments (for consultations and fees)
        const appointmentsRes = await api.get('/appointments');
        const apptList = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [];
        if (!isMounted) return;
        setAppointments(apptList);
        // fetch badge count for appointments (unread or pending)
        const lastViewedAppts = localStorage.getItem('lastViewedAppointments') || 0;
        const unseenCount = apptList.filter(a => new Date(a.updatedAt || a.createdAt).getTime() > new Date(lastViewedAppts).getTime()).length;
        setBadges(prev => ({ ...prev, appointments: unseenCount }));

        // 2. Fetch room summaries
        let unreadChatCount = 0;
        if (apptList.length > 0) {
          const roomIds = apptList.map(appt => `room-${appt._id}`);
          try {
            const { data: rooms } = await api.post('/communication/summary', { roomIds });
            rooms.forEach(room => {
              unreadChatCount += room.messages?.filter(msg => msg.senderId !== user._id && !msg.seen).length || 0;
              if (room.offer && !room.answer && room.offer.senderId !== user._id) {
                unreadChatCount += 1;
              }
            });
          } catch (e) {
            console.error("Sidebar summary polling error", e);
          }
        }

        // 3. Fetch prescriptions
        let newPrescCount = 0;
        try {
          const { data: prescriptions } = await api.get('/prescriptions');
          const lastViewedPresc = localStorage.getItem('lastViewedPrescriptions') || 0;
          newPrescCount = prescriptions.filter(p => new Date(p.createdAt).getTime() > new Date(lastViewedPresc).getTime()).length;
        } catch (e) {
          console.error("Sidebar prescriptions polling error", e);
        }

        // 4. Fetch reports
        let newRepsCount = 0;
        try {
          const { data: reports } = await api.get('/reports');
          const lastViewedReps = localStorage.getItem('lastViewedReports') || 0;
          newRepsCount = reports.filter(r => new Date(r.createdAt).getTime() > new Date(lastViewedReps).getTime()).length;
        } catch (e) {
          console.error("Sidebar reports polling error", e);
        }

        // 5. Calculate unpaid fees
        let unpaidFeesCount = 0;
        apptList.forEach(appt => {
          if (appt.feeHistory && appt.feeHistory.length > 0) {
            unpaidFeesCount += appt.feeHistory.filter(f => f.status !== 'Paid').length;
          } else if (appt.feeAmount > 0 && appt.feeStatus !== 'Paid') {
            unpaidFeesCount += 1;
          }
        });

        if (isMounted) {
          setBadges({
            consultation: unreadChatCount,
            prescriptions: newPrescCount,
            reports: newRepsCount,
            fees: unpaidFeesCount
          });
        }
      } catch (err) {
        console.error("Error fetching badges in sidebar:", err);
      }
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const getBadgeCount = (name) => {
    if (name.includes('Consultation') || name.includes('Video') || name === 'Video Call' || name === 'Consultations') {
      return badges.consultation;
    }
    if (name.includes('Prescription')) {
      return badges.prescriptions;
    }
    if (name.includes('Report')) {
      return badges.reports;
    }
    if (name.includes('Fee')) {
      return badges.fees;
    }
    if (name.includes('Appointment')) {
      return badges.appointments || 0; // new badge count
    }
    return 0;
  };

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
    { name: 'Appointments', path: '/doctor-appointments', icon: <Calendar size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
  ] : [
    { name: 'Dashboard', path: '/patient-dashboard', icon: <Home size={20} /> },
    { name: 'My Reports', path: '/reports', icon: <FileText size={20} /> },
    { name: 'AI Symptom Checker', path: '/ai-chatbot', icon: <MessageSquare size={20} /> },
    { name: 'Video Call', path: '/consultation', icon: <Video size={20} /> },
    { name: 'My Prescriptions', path: '/prescriptions', icon: <Pill size={20} /> },
    { name: 'Consultation Fees', path: '/fees', icon: <IndianRupee size={20} /> },
    { name: 'Appointments', path: '/patient-appointments', icon: <Calendar size={20} /> },
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
        {navItems.map((item) => {
          const count = getBadgeCount(item.name);
          return (
            <NavLink 
              key={item.name} 
              to={item.path} 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                {item.icon}
                {count > 0 && (
                  <span className="sidebar-icon-badge" style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '50%',
                    minWidth: '15px',
                    height: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    fontWeight: 'bold',
                    padding: '2px',
                    boxShadow: '0 0 0 2px #fff',
                    boxSizing: 'border-box',
                    zIndex: 2
                  }}>
                    {count}
                  </span>
                )}
              </div>
              <span className="sidebar-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginLeft: '12px' }}>
                {item.name}
                {count > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)'
                    }}></span>
                    <span style={{
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontSize: '0.68rem',
                      fontWeight: 'bold',
                      display: 'inline-block'
                    }}>
                      {count}
                    </span>
                  </div>
                )}
              </span>
            </NavLink>
          );
        })}
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
