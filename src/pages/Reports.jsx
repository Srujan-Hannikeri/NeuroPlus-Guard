import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Logo from '../components/common/Logo';
import LiveClock from '../components/common/LiveClock';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

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
        
        alert('Report uploaded successfully!');
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
    window.speechSynthesis.cancel(); // Stop current speaking
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const generateAiDescription = async (reportId) => {
    try {
      const originalReports = [...reports];
      // Optimistic update to show loading state
      setReports(reports.map(r => r._id === reportId ? { ...r, aiSummary: 'Generating...' } : r));
      
      const { data } = await api.put(`/reports/${reportId}/summary`);
      setReports(reports.map(r => r._id === reportId ? data : r));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to analyze report with AskMyDoc AI. Please try again.");
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

  // Sort each patient's reports by date descending (recent first)
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
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Upload New Report</h3>
          <form onSubmit={handleUpload} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <input 
              type="file" 
              accept=".pdf,image/*" 
              onChange={(e) => setFile(e.target.files[0])} 
              className="input-field" 
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-primary" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Upload'}
            </button>
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
                      <ReportCard key={report._id} report={report} speakText={speakText} onGenerate={() => generateAiDescription(report._id)} userRole={user?.role} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {reports.map((report) => (
                  <ReportCard key={report._id} report={report} speakText={speakText} onGenerate={() => generateAiDescription(report._id)} userRole={user?.role} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ReportCard = ({ report, speakText, onGenerate, userRole }) => (
  <div style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: '#fff' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
      <h4 style={{ color: 'var(--text-main)', margin: 0 }}>Report from {new Date(report.createdAt).toLocaleDateString()}</h4>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button 
          onClick={onGenerate}
          disabled={report.aiSummary === 'Generating...'}
          className="btn-primary" 
          style={{ padding: '6px 14px', fontSize: '0.82rem', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {report.aiSummary === 'Generating...' ? '⏳ Analyzing...' : (report.aiSummary && !report.aiSummary.startsWith('Analysis pending') ? '🔄 Re-Analyze with AskMyDoc' : '✨ Analyze with AskMyDoc AI')}
        </button>
        <button 
          onClick={() => speakText(report.aiSummary || "Analysis pending")}
          className="btn-primary" 
          style={{ padding: '6px 14px', fontSize: '0.82rem', background: 'var(--secondary)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
          🔊 Speak
        </button>
      </div>
    </div>
    <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.65', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ fontSize: '1.1rem' }}>🤖</span>
        <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>AskMyDoc Clinical Analysis & Precautions:</strong>
      </div>
      <div style={{ margin: '0', whiteSpace: 'pre-wrap', color: '#1e293b' }}>{report.aiSummary || 'Analysis pending...'}</div>
    </div>
    <a href={report.fileUrl?.startsWith('data:') ? report.fileUrl : `${API_URL}${report.fileUrl}`} download={report.fileUrl?.startsWith('data:') ? 'report' : undefined} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '12px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>
      View Original File
    </a>
  </div>
);

export default Reports;
