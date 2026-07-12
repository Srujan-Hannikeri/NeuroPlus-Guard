import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Logo from '../components/common/Logo';
import { useNavigate } from 'react-router-dom';

const Prescriptions = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Doctor Form State
  const [patientId, setPatientId] = useState('');
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([{ name: '', numberOfTablets: '', morning: false, afternoon: false, night: false, durationDays: '' }]);

  useEffect(() => {
    localStorage.setItem('lastViewedPrescriptions', new Date().toISOString());
    fetchPrescriptions();
    if (user?.role === 'Doctor') {
      fetchPatients();
    }
  }, [user]);

  const fetchPrescriptions = async () => {
    try {
      const { data } = await api.get('/prescriptions');
      setPrescriptions(data);
      if (user?.role === 'Patient') {
        checkAndAutoMarkMissed(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getDoseStartTime = (timeOfDay) => {
    const now = new Date();
    const d = new Date(now);
    if (timeOfDay === 'Morning') {
      d.setHours(8, 0, 0, 0);
    } else if (timeOfDay === 'Afternoon') {
      d.setHours(14, 0, 0, 0);
    } else if (timeOfDay === 'Night') {
      if (now.getHours() < 21) {
        d.setDate(d.getDate() - 1);
      }
      d.setHours(21, 0, 0, 0);
    }
    return d;
  };

  const checkAndAutoMarkMissed = async (prescList) => {
    let updatedAny = false;
    const todayObj = new Date();
    const currentHour = todayObj.getHours();

    for (const presc of prescList) {
      const timesToCheck = ['Morning', 'Afternoon', 'Night'].filter(time => 
        presc.medicines.some(m => 
          (time === 'Morning' && m.morning) || 
          (time === 'Afternoon' && m.afternoon) || 
          (time === 'Night' && m.night)
        )
      );

      for (const time of timesToCheck) {
        // Skip if prescription was created after this slot's start time
        const doseStartTime = getDoseStartTime(time);
        const prescCreatedTime = new Date(presc.createdAt);
        doseStartTime.setSeconds(0, 0);
        prescCreatedTime.setSeconds(0, 0);
        
        if (prescCreatedTime.getTime() > doseStartTime.getTime()) {
          continue;
        }

        const hasLog = presc.history?.some(h => {
          const hDate = new Date(h.date);
          if (time === 'Night' && currentHour < 21) {
            const yesterday = new Date(todayObj);
            yesterday.setDate(yesterday.getDate() - 1);
            return hDate.getDate() === yesterday.getDate() &&
                   hDate.getMonth() === yesterday.getMonth() &&
                   hDate.getFullYear() === yesterday.getFullYear() &&
                   h.timeOfDay === time;
          }
          return hDate.getDate() === todayObj.getDate() &&
                 hDate.getMonth() === todayObj.getMonth() &&
                 hDate.getFullYear() === todayObj.getFullYear() &&
                 h.timeOfDay === time;
        });

        if (!hasLog) {
          let shouldMarkMissed = false;
          if (time === 'Morning' && currentHour >= 12) shouldMarkMissed = true;
          else if (time === 'Afternoon' && currentHour >= 18) shouldMarkMissed = true;
          else if (time === 'Night' && currentHour >= 1 && currentHour < 21) shouldMarkMissed = true;

          if (shouldMarkMissed) {
            try {
              await api.put(`/prescriptions/${presc._id}/status`, { status: 'Missed', timeOfDay: time });
              updatedAny = true;
            } catch (e) {
              console.error("Auto missed update failed", e);
            }
          }
        }
      }
    }

    if (updatedAny) {
      try {
        const { data } = await api.get('/prescriptions');
        setPrescriptions(data);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const fetchPatients = async () => {
    try {
      // Find patients from doctor's appointments
      const { data } = await api.get('/appointments');
      const uniquePatients = [];
      const seen = new Set();
      data.forEach(appt => {
        if (appt.patient && appt.status === 'Completed' && !seen.has(appt.patient._id)) {
          seen.add(appt.patient._id);
          uniquePatients.push(appt.patient);
        }
      });
      setPatients(uniquePatients);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: '', numberOfTablets: '', morning: false, afternoon: false, night: false, durationDays: '' }]);
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    if (!patientId) return alert('Select a patient');
    try {
      await api.post('/prescriptions', { patientId, medicines });
      alert('Prescription created successfully');
      setPatientId('');
      setMedicines([{ name: '', numberOfTablets: '', morning: false, afternoon: false, night: false, durationDays: '' }]);
      fetchPrescriptions();
    } catch (error) {
      alert('Failed to create prescription');
    }
  };

  const handleStatusUpdate = async (id, status, timeOfDay) => {
    try {
      await api.put(`/prescriptions/${id}/status`, { status, timeOfDay });
      alert(`Marked ${timeOfDay} dose as ${status}`);
      fetchPrescriptions();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <Logo width={40} height={40} />
          <h2>NeuroPlus Guard - Prescriptions</h2>
        </div>
      </nav>

      {user?.role === 'Doctor' && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Create Prescription</h3>
          <form onSubmit={handleCreatePrescription} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <select className="input-field" value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="">Select Patient</option>
              {patients.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {medicines.map((med, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                  <input type="text" placeholder="Medicine Name" className="input-field" value={med.name} onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)} required style={{ flex: 2, minWidth: '150px' }} />
                  <input type="number" placeholder="No. of Tablets" className="input-field" value={med.numberOfTablets} onChange={(e) => handleMedicineChange(idx, 'numberOfTablets', e.target.value)} required style={{ flex: 1, minWidth: '100px' }} />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={med.morning} onChange={(e) => handleMedicineChange(idx, 'morning', e.target.checked)} /> Morning</label>
                    <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={med.afternoon} onChange={(e) => handleMedicineChange(idx, 'afternoon', e.target.checked)} /> Afternoon</label>
                    <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={med.night} onChange={(e) => handleMedicineChange(idx, 'night', e.target.checked)} /> Night</label>
                  </div>
                  <input type="number" placeholder="Days" className="input-field" value={med.durationDays} onChange={(e) => handleMedicineChange(idx, 'durationDays', e.target.value)} required style={{ width: '80px' }} />
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={handleAddMedicine} className="btn-primary" style={{ background: 'var(--secondary)' }}>+ Add Medicine</button>
              <button type="submit" className="btn-primary">Save Prescription</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ color: 'var(--secondary)', margin: 0 }}>{user?.role === 'Doctor' ? 'Prescription History' : 'My Prescriptions'}</h3>
          {user?.role === 'Doctor' && (
            <input 
              type="text" 
              placeholder="Search by Patient Name..." 
              className="input-field" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '250px' }}
            />
          )}
        </div>
        
        {loading ? <p>Loading...</p> : prescriptions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No prescriptions found.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {prescriptions.filter(p => user?.role !== 'Doctor' || (p.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map((presc) => (
              <div key={presc._id} style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff' }}>
                <h4 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>
                  {user?.role === 'Doctor' ? `Patient: ${presc.patient?.name}` : `Prescribed by Dr. ${presc.doctor?.name}`}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                    {new Date(presc.createdAt).toLocaleDateString()}
                  </span>
                </h4>
                
                <table className="prescription-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Medicine</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Tablets</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Frequency</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presc.medicines.map((m, i) => (
                      <tr key={i}>
                        <td data-label="Medicine" style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{m.name}</td>
                        <td data-label="Tablets" style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{m.numberOfTablets}</td>
                        <td data-label="Frequency" style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                          {m.morning && <span style={{ background: '#fef08a', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Morning</span>}
                          {m.afternoon && <span style={{ background: '#fed7aa', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>Afternoon</span>}
                          {m.night && <span style={{ background: '#cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>Night</span>}
                        </td>
                        <td data-label="Duration" style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{m.durationDays} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {user?.role === 'Patient' && (
                  <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>Log Dose:</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {['Morning', 'Afternoon', 'Night'].filter(time => {
                        return presc.medicines.some(m => 
                          (time === 'Morning' && m.morning) || 
                          (time === 'Afternoon' && m.afternoon) || 
                          (time === 'Night' && m.night)
                        );
                      }).map(time => {
                        const todayObj = new Date();
                        const currentHour = todayObj.getHours();
                        
                        // Hide slot if the prescription was created after the slot started
                        const doseStartTime = getDoseStartTime(time);
                        const prescCreatedTime = new Date(presc.createdAt);
                        doseStartTime.setSeconds(0, 0);
                        prescCreatedTime.setSeconds(0, 0);
                        if (prescCreatedTime.getTime() > doseStartTime.getTime()) {
                          return null;
                        }

                        const log = presc.history?.find(h => {
                          const hDate = new Date(h.date);
                          if (time === 'Night' && currentHour < 21) {
                            const yesterday = new Date(todayObj);
                            yesterday.setDate(yesterday.getDate() - 1);
                            return hDate.getDate() === yesterday.getDate() &&
                                   hDate.getMonth() === yesterday.getMonth() &&
                                   hDate.getFullYear() === yesterday.getFullYear() &&
                                   h.timeOfDay === time;
                          }
                          return hDate.getDate() === todayObj.getDate() &&
                                 hDate.getMonth() === todayObj.getMonth() &&
                                 hDate.getFullYear() === todayObj.getFullYear() &&
                                 h.timeOfDay === time;
                        });

                        let statusDisplay = null;
                        if (log) {
                          statusDisplay = (
                            <span style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: 'bold', 
                              color: log.status === 'Taken' ? '#10b981' : 'var(--error)'
                            }}>
                              {log.status === 'Taken' ? 'Taken' : 'Missed'}
                            </span>
                          );
                        } else {
                          let isExpired = false;
                          if (time === 'Morning' && currentHour >= 12) isExpired = true;
                          else if (time === 'Afternoon' && currentHour >= 18) isExpired = true;
                          else if (time === 'Night' && currentHour >= 1 && currentHour < 21) isExpired = true;

                          if (isExpired) {
                            statusDisplay = (
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--error)' }}>
                                Missed ❌
                              </span>
                            );
                          } else {
                            statusDisplay = (
                              <>
                                <button onClick={() => handleStatusUpdate(presc._id, 'Taken', time)} className="btn-primary" style={{ background: '#10b981', padding: '4px 8px', fontSize: '0.75rem' }}>
                                  Taken
                                </button>
                                <button onClick={() => handleStatusUpdate(presc._id, 'Missed', time)} className="btn-primary" style={{ background: 'var(--error)', padding: '4px 8px', fontSize: '0.75rem' }}>
                                  Missed
                                </button>
                              </>
                            );
                          }
                        }
                        
                        return (
                          <div key={time} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{time}:</span>
                            {statusDisplay}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {presc.history?.length > 0 && (
                  <div style={{ marginTop: '16px', background: '#fef3c7', padding: '12px', borderRadius: '8px' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#92400e' }}>Patient Compliance History:</strong> 
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                      {presc.history.slice().reverse().map((h, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #fde68a' }}>
                          <span>{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - <strong>{h.timeOfDay}</strong></span>
                          <span style={{ fontWeight: 'bold', color: h.status === 'Taken' ? '#10b981' : 'var(--error)' }}>{h.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Prescriptions;
