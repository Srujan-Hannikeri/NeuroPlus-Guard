import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Logo from '../components/common/Logo';
import LiveClock from '../components/common/LiveClock';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { User } from 'lucide-react';

const Profile = () => {
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [qrFile, setQrFile] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let qrCodeBase64 = null;
      if (qrFile) {
        const reader = new FileReader();
        qrCodeBase64 = await new Promise((resolve, reject) => {
          reader.readAsDataURL(qrFile);
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      }

      let profilePicBase64 = null;
      if (profilePicFile) {
        const reader = new FileReader();
        profilePicBase64 = await new Promise((resolve, reject) => {
          reader.readAsDataURL(profilePicFile);
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      }

      const { data: updatedUser } = await api.put('/auth/profile', {
        upiId,
        qrCodeBase64,
        profilePicBase64
      });
      
      const newUserInfo = { ...user, ...updatedUser };
      localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
      setUser(newUserInfo);
      
      alert('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update profile.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <Logo width={40} height={40} />
          <h2>My Profile</h2>
        </div>
        <LiveClock />
        {!isEditing && (
          <button className="btn-primary" onClick={() => setIsEditing(true)}>
            Update Profile
          </button>
        )}
      </nav>

      <div className="glass-panel" style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', marginTop: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
           {user?.profilePic ? (
              <img src={user.profilePic?.startsWith('data:') ? user.profilePic : `${API_URL}${user.profilePic}`} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
           ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                 <User size={40} />
              </div>
           )}
           <div>
              <h2 style={{ color: 'var(--text-main)', margin: 0 }}>{user?.name}</h2>
              <p style={{ color: 'var(--text-muted)' }}>{user?.role}</p>
           </div>
        </div>

        {isEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Update Profile Picture</h3>
            <input 
              type="file" 
              className="input-field" 
              accept="image/*"
              onChange={(e) => setProfilePicFile(e.target.files[0])} 
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                <span style={{ fontWeight: 'bold' }}>{user?.phone}</span>
            </div>
            
            {user?.role === 'Patient' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Age:</span>
                        <span style={{ fontWeight: 'bold' }}>{user?.age || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Blood Group:</span>
                        <span style={{ fontWeight: 'bold' }}>{user?.bloodGroup || 'N/A'}</span>
                    </div>
                </>
            )}

            {user?.role === 'Doctor' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Specialization:</span>
                        <span style={{ fontWeight: 'bold' }}>{user?.specialization || 'General'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>{user?.verificationStatus || 'Verified'}</span>
                    </div>
                </>
            )}
        </div>

        {user?.role === 'Doctor' && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Payment Settings</h3>
                
                {user?.upiQrCode && (
                    <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Current QR Code:</p>
                        <img src={user.upiQrCode?.startsWith('data:') ? user.upiQrCode : `${API_URL}${user.upiQrCode}`} alt="UPI QR" style={{ width: '150px', height: '150px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px', background: '#fff' }} />
                    </div>
                )}

                {isEditing && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)', fontWeight: 'bold' }}>UPI ID</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={upiId} 
                        onChange={(e) => setUpiId(e.target.value)} 
                        placeholder="e.g. doctor@upi"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)', fontWeight: 'bold' }}>Update QR Code Image</label>
                      <input 
                        type="file" 
                        className="input-field" 
                        accept="image/*"
                        onChange={(e) => setQrFile(e.target.files[0])} 
                      />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Upload your payment QR code so patients can pay consultation fees.</p>
                    </div>
                  </div>
                )}
            </div>
        )}

        {isEditing && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button onClick={handleUpdate} className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Save All Changes'}
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-primary" style={{ flex: 1, background: '#cbd5e1', color: '#1e293b' }}>
              Cancel
            </button>
          </div>
        )}
        {!isEditing && (
          <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', marginTop: '24px', background: 'var(--error)' }}>
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
};

export default Profile;
