import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Logo from '../components/common/Logo';
import LiveClock from '../components/common/LiveClock';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const REPORT_CATEGORIES = [
  'Auto-Detect / General Clinical Report',
  'Complete Blood Count & Hematology (CBC)',
  'Neurological & Spine Imaging (MRI / CT / EEG)',
  'Cardiology Diagnostics (ECG / Echocardiogram)',
  'Glycemic & Diabetic Panel (Blood Sugar / HbA1c)',
  'Lipid Profile & Cholesterol Panel',
  'Liver Function Test (LFT) & Hepatic Panel',
  'Kidney Function Test (KFT / RFT) & Renal Panel',
  'Urine Routine & Microscopy (Urinalysis)',
  'Thyroid Function Profile (TSH / T3 / T4)',
  'Chest X-Ray & Pulmonary Diagnostic Report',
  'Abdominal Ultrasound & Sonography',
  'Orthopedic Imaging & Bone Health (X-Ray / DEXA)'
];

const Reports = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    localStorage.setItem('lastViewedReports', new Date().toISOString());
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data } = await api.get('/reports');
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports", error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        await api.post('/reports/upload', {
          fileBase64: base64data,
          fileType: file.type,
          fileName: file.name
        });
        
        alert('Report uploaded & analyzed by NeuroPlus AI!');
        setFile(null);
        fetchReports();
        setLoading(false);
      };
      reader.onerror = () => {
        alert('Error reading file');
        setLoading(false);
      };
    } catch (error) {
      alert('Upload failed.');
      setLoading(false);
    }
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech not supported in your browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const generateAiDescription = async (reportId, customCat, customNotes, customTitle) => {
    try {
      setReports(reports.map(r => r._id === reportId ? { ...r, aiSummary: 'Generating...' } : r));
      
      const payload = {};
      if (customCat && !customCat.startsWith('Auto-Detect')) payload.category = customCat;
      if (customNotes !== undefined) payload.notes = customNotes;
      if (customTitle) payload.reportTitle = customTitle;

      const { data } = await api.put(`/reports/${reportId}/summary`, payload);
      setReports(reports.map(r => r._id === reportId ? data : r));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to analyze report with AI. Please try again.");
      fetchReports();
    }
  };

  // Group reports by patient for Doctors
  const groupedReports = reports.reduce((acc, report) => {
    const patientName = report.patient?.name || 'Unknown Patient';
    if (!acc[patientName]) acc[patientName] = [];
    acc[patientName].push(report);
    return acc;
  }, {});

  // Sort each patient's reports by date descending
  Object.keys(groupedReports).forEach(patientName => {
    groupedReports[patientName].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <Logo width={40} height={40} />
          <h2>NeuroPlus Guard - Medical Reports</h2>
        </div>
        <LiveClock />
      </nav>

      {user?.role === 'Patient' && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '14px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📤</span> Upload New Medical Report
          </h3>

          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Select Medical File (PDF or Image) *
              </label>
              <input 
                type="file" 
                accept=".pdf,image/*" 
                onChange={(e) => setFile(e.target.files[0] || null)} 
                className="input-field" 
                style={{ width: '100%', cursor: 'pointer', padding: '10px 14px' }}
                required
              />
              {file && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#0369a1', background: '#f0f9ff', padding: '6px 12px', borderRadius: '8px', width: 'fit-content', border: '1px solid #bae6fd' }}>
                  <span>📎 Selected:</span>
                  <strong>{file.name}</strong>
                  <span>({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
                ⚡ Automatic analysis: Our AI automatically detects the disease, generates concise precautions, and matches the treating doctor directly from your file.
              </p>
            </div>

            <div>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading || !file} 
                style={{ padding: '12px 28px', fontSize: '0.9rem', fontWeight: 600 }}>
                {loading ? '⏳ Uploading & Analyzing...' : '🚀 Upload & Analyze Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ color: 'var(--secondary)', margin: 0 }}>Report History</h3>
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
        
        {reports.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No reports found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {user?.role === 'Doctor' ? (
              Object.keys(groupedReports)
                .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(patientName => (
                <div key={patientName} style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Patient: {patientName}</h4>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {groupedReports[patientName].map(report => (
                      <ReportCard 
                        key={report._id} 
                        report={report} 
                        speakText={speakText} 
                        onGenerate={(cat, n, t) => generateAiDescription(report._id, cat, n, t)} 
                        userRole={user?.role} 
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {reports.map((report) => (
                  <ReportCard 
                    key={report._id} 
                    report={report} 
                    speakText={speakText} 
                    onGenerate={(cat, n, t) => generateAiDescription(report._id, cat, n, t)} 
                    userRole={user?.role} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ClinicalSummaryViewer = ({ text }) => {
  if (!text) return <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic', fontSize: '0.84rem' }}>Analysis pending...</p>;

  // Split lines and filter empty lines
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem' }}>
      {lines.map((line, idx) => {
        const isHeader = line.startsWith('###') || line.startsWith('##') || line.startsWith('📋') || line.startsWith('🛡️') || line.startsWith('⚠️') || line.startsWith('👨‍⚕️') || line.startsWith('🩺');
        const cleaned = line.replace(/^#{1,6}\s*/, '').trim();
        
        if (isHeader) {
          let badgeBg = '#f1f5f9';
          let textColor = '#0f172a';
          let borderCol = '#cbd5e1';
          if (cleaned.includes('📋') || cleaned.includes('🩺')) {
            badgeBg = '#f0f9ff'; textColor = '#0369a1'; borderCol = '#bae6fd';
          } else if (cleaned.includes('🛡️')) {
            badgeBg = '#f0fdf4'; textColor = '#15803d'; borderCol = '#bbf7d0';
          } else if (cleaned.includes('⚠️')) {
            badgeBg = '#fff1f2'; textColor = '#be123c'; borderCol = '#fecdd3';
          } else if (cleaned.includes('👨‍⚕️')) {
            badgeBg = '#faf5ff'; textColor = '#6b21a8'; borderCol = '#e9d5ff';
          }

          return (
            <div key={idx} style={{ 
              background: badgeBg, 
              color: textColor, 
              fontWeight: 700, 
              fontSize: '0.8rem', 
              padding: '3px 8px', 
              borderRadius: '5px', 
              marginTop: idx === 0 ? '0' : '6px',
              border: `1px solid ${borderCol}`,
              display: 'inline-flex',
              alignItems: 'center',
              width: 'fit-content'
            }}>
              {cleaned}
            </div>
          );
        }

        const isBullet = cleaned.startsWith('•') || cleaned.startsWith('*') || cleaned.startsWith('-');
        const content = isBullet ? cleaned.substring(1).trim() : cleaned;

        // Render bold text properly
        const parts = content.split(/(\*\*.*?\*\*)/g);
        const formatted = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} style={{ color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        return (
          <div key={idx} style={{ 
            paddingLeft: isBullet ? '8px' : '2px', 
            color: '#334155', 
            lineHeight: '1.42',
            display: isBullet ? 'flex' : 'block',
            gap: '6px'
          }}>
            {isBullet && <span style={{ color: '#0284c7', fontWeight: 'bold' }}>•</span>}
            <div>{formatted}</div>
          </div>
        );
      })}
    </div>
  );
};

const ReportCard = ({ report, speakText, onGenerate, userRole }) => {
  const [selectedCat, setSelectedCat] = useState(report.category || REPORT_CATEGORIES[0]);
  const [customNote, setCustomNote] = useState(report.notes || '');
  const [customTitle, setCustomTitle] = useState(report.reportTitle || report.fileName || '');
  const [showOptions, setShowOptions] = useState(false);

  const displayName = report.reportTitle && !report.reportTitle.startsWith('aa9e') && !report.reportTitle.includes('-')
    ? report.reportTitle
    : (report.category || report.fileName || 'Medical Report');

  return (
    <div style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📄</span> {displayName}
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              🏷️ {report.category || 'Clinical Report'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              📅 {new Date(report.createdAt).toLocaleDateString()}
            </span>
            {report.notes && (
              <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px' }}>
                📝 {report.notes}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowOptions(!showOptions)}
            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', cursor: 'pointer' }}>
            ✏️ Change Disease / Options
          </button>
          <button 
            onClick={() => onGenerate(selectedCat, customNote, customTitle)}
            disabled={report.aiSummary === 'Generating...'}
            className="btn-primary" 
            style={{ padding: '6px 14px', fontSize: '0.82rem', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {report.aiSummary === 'Generating...' ? '⏳ Analyzing...' : (report.aiSummary && !report.aiSummary.startsWith('Analysis pending') ? '🔄 Re-Analyze Report' : '✨ Analyze with AI')}
          </button>
          <button 
            onClick={() => speakText(report.aiSummary || "Analysis pending")}
            className="btn-primary" 
            style={{ padding: '6px 14px', fontSize: '0.82rem', background: 'var(--secondary)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
            🔊 Speak
          </button>
        </div>
      </div>

      {showOptions && (
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                Disease / Test Name (e.g. Dengue, Brain MRI, CBC):
              </label>
              <input 
                type="text" 
                placeholder="e.g. Dengue, Brain MRI, Diabetes" 
                value={customTitle} 
                onChange={(e) => setCustomTitle(e.target.value)} 
                className="input-field" 
                style={{ width: '100%', fontSize: '0.82rem', padding: '6px 10px' }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                Report Category:
              </label>
              <select 
                value={selectedCat} 
                onChange={(e) => setSelectedCat(e.target.value)} 
                className="input-field" 
                style={{ width: '100%', fontSize: '0.82rem', padding: '6px 10px' }}>
                {REPORT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                Reported Values / Lab Findings:
              </label>
              <input 
                type="text" 
                placeholder="e.g. Platelets 40,000, Hb 9.5" 
                value={customNote} 
                onChange={(e) => setCustomNote(e.target.value)} 
                className="input-field" 
                style={{ width: '100%', fontSize: '0.82rem', padding: '6px 10px' }} 
              />
            </div>
          </div>
          <div>
            <button 
              onClick={() => {
                onGenerate(selectedCat, customNote, customTitle);
                setShowOptions(false);
              }}
              style={{ padding: '6px 16px', fontSize: '0.82rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
              ✓ Apply & Re-Analyze Now
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
          <span style={{ fontSize: '0.95rem' }}>🤖</span>
          <strong style={{ color: 'var(--primary)', fontSize: '0.86rem' }}>AI Clinical Summary & Suggested Doctors:</strong>
        </div>
        <ClinicalSummaryViewer text={report.aiSummary} />
      </div>
      <a href={report.fileUrl?.startsWith('data:') ? report.fileUrl : `${API_URL}${report.fileUrl}`} download={report.fileUrl?.startsWith('data:') ? (report.fileName || 'report') : undefined} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '10px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.82rem' }}>
        View Original File
      </a>
    </div>
  );
};

export default Reports;
