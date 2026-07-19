import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Logo from './Logo';
import api from '../../services/api';
import { Home, FileText, MessageSquare, LogOut, Video, ChevronUp, ChevronDown, User, Pill, IndianRupee, Code, Calendar } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
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
        // Run appointments, prescriptions, and reports fetches in parallel to make it much faster!
        const [appointmentsRes, prescriptionsRes, reportsRes] = await Promise.all([
          api.get('/appointments').catch(() => ({ data: [] })),
          api.get('/prescriptions').catch(() => ({ data: [] })),
          api.get('/reports').catch(() => ({ data: [] }))
        ]);

        if (!isMounted) return;

        const apptList = Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [];
        setAppointments(apptList);

        // compute all counts locally
        const lastViewedAppts = localStorage.getItem('lastViewedAppointments') || 0;
        const unseenCount = apptList.filter(a => new Date(a.updatedAt || a.createdAt).getTime() > new Date(lastViewedAppts).getTime()).length;

        // 2. Fetch room summaries in parallel if there are appointments
        let unreadChatCount = 0;
        if (apptList.length > 0) {
          const roomIds = apptList.map(appt => `room-${appt._id}`);
          try {
            const { data: rooms } = await api.post('/communication/summary', { roomIds });
            (rooms || []).forEach(room => {
              // EXCLUDE payment confirmation type messages from counting towards the communication unread chat badge
              unreadChatCount += (room.messages?.filter(msg => msg.senderId !== user._id && msg.type !== 'payment' && !msg.seen).length) || 0;
            });
          } catch (e) {
            console.error("Sidebar summary polling error", e);
          }
        }

        // 3. Fetch prescriptions count
        const lastViewedPresc = localStorage.getItem('lastViewedPrescriptions') || 0;
        const newPrescCount = (prescriptionsRes.data || []).filter(p => new Date(p.createdAt).getTime() > new Date(lastViewedPresc).getTime()).length;

        // 4. Fetch reports count
        const lastViewedReps = localStorage.getItem('lastViewedReports') || 0;
        const newRepsCount = (reportsRes.data || []).filter(r => new Date(r.createdAt).getTime() > new Date(lastViewedReps).getTime()).length;

        // 5. Calculate unseen fees based on seenPayments array
        let newFeesCount = 0;
        try {
          const seenPaymentsRaw = localStorage.getItem('seenPayments');
          const seenPayments = seenPaymentsRaw ? JSON.parse(seenPaymentsRaw) : [];
          apptList.forEach(appt => {
            const feesToCheck = appt.feeHistory && appt.feeHistory.length > 0
              ? appt.feeHistory
              : (appt.feeAmount > 0 ? [{ _id: 'legacy', amount: appt.feeAmount, amountPaid: appt.amountPaid || 0, status: appt.feeStatus, date: appt.updatedAt || appt.createdAt }] : []);

            feesToCheck.forEach(fee => {
              if (fee.status === 'Paid') {
                const feeId = fee._id === 'legacy' ? appt._id : fee._id;
                if (!seenPayments.includes(feeId)) {
                  newFeesCount += 1;
                }
              }
            });
          });
        } catch(e) {
          console.error("Sidebar fees calculation error", e);
        }

        if (isMounted) {
          setBadges({
            appointments: unseenCount,
            consultation: unreadChatCount,
            prescriptions: newPrescCount,
            reports: newRepsCount,
            fees: newFeesCount,
          });
        }
      } catch (err) {
        console.error("Error fetching badges in sidebar:", err);
      }
    };

    fetchBadges();
    
    // Poll every 12 seconds for fast but lightweight updates
    const interval = setInterval(fetchBadges, 12000);

    const handleFeesUpdate = () => {
      fetchBadges();
    };

    // Listen to live fees-updated events to immediately sync badge count without waiting for poller
    window.addEventListener('fees-updated', handleFeesUpdate);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('fees-updated', handleFeesUpdate);
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

  // When the route changes to appointments, mark them as viewed so badge clears immediately
  useEffect(() => {
    const path = location.pathname || '';
    if (path.includes('appointments')) {
      try {
        if (appointments && appointments.length > 0) {
          const maxTs = appointments.reduce((max, a) => {
            const t = new Date(a.updatedAt || a.createdAt).getTime();
            return Math.max(max, isNaN(t) ? 0 : t);
          }, 0);
          const stamp = maxTs > 0 ? new Date(maxTs).toISOString() : new Date().toISOString();
          localStorage.setItem('lastViewedAppointments', stamp);
        } else {
          localStorage.setItem('lastViewedAppointments', new Date().toISOString());
        }
      } catch (e) {
        console.error('markViewed on route change error', e);
        localStorage.setItem('lastViewedAppointments', new Date().toISOString());
      }
    }
  }, [location.pathname, appointments]);

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
            const isAppointmentsPath = item.path && item.path.includes('appointments');
            const isFeesPath = item.path && item.path.includes('/fees');
            const handleNavClick = () => {
              // If user clicks Appointments in sidebar, mark appointments viewed immediately
              if (isAppointmentsPath) {
                try {
                  if (appointments && appointments.length > 0) {
                    const maxTs = appointments.reduce((max, a) => {
                      const t = new Date(a.updatedAt || a.createdAt).getTime();
                      return Math.max(max, isNaN(t) ? 0 : t);
                    }, 0);
                    const stamp = maxTs > 0 ? new Date(maxTs).toISOString() : new Date().toISOString();
                    localStorage.setItem('lastViewedAppointments', stamp);
                  } else {
                    localStorage.setItem('lastViewedAppointments', new Date().toISOString());
                  }
                } catch (e) {
                  console.error('markViewed on click error', e);
                  localStorage.setItem('lastViewedAppointments', new Date().toISOString());
                }
              }

              // If user clicks Fees in sidebar, mark fees as viewed up to the latest paid fee timestamp
              if (isFeesPath) {
                try {
                  if (appointments && appointments.length > 0) {
                    // compute latest paid fee timestamp across appointments
                    const allFees = appointments.flatMap(appt => {
                      if (appt.feeHistory && appt.feeHistory.length > 0) return appt.feeHistory;
                      if (appt.feeAmount > 0) return [{ _id: 'legacy', amount: appt.feeAmount, amountPaid: appt.amountPaid || 0, status: appt.feeStatus, date: appt.updatedAt || appt.createdAt }];
                      return [];
                    });
                    const paidTimestamps = allFees.filter(f => f.status === 'Paid').map(f => new Date(f.date || f.updatedAt || f.createdAt || Date.now()).getTime());
                    const maxTs = paidTimestamps.length > 0 ? Math.max(...paidTimestamps) : Date.now();
                    const stamp = new Date(maxTs).toISOString();
                    localStorage.setItem('lastViewedFees', stamp);
                  } else {
                    localStorage.setItem('lastViewedFees', new Date().toISOString());
                  }
                } catch (e) {
                  console.error('markViewed fees on click error', e);
                  localStorage.setItem('lastViewedFees', new Date().toISOString());
                }
              }
            };

            return (
              <NavLink 
                key={item.name} 
                to={item.path} 
                onClick={handleNavClick}
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
