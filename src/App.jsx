import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorAppointments from './pages/DoctorAppointments';
import PatientDashboard from './pages/PatientDashboard';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Reports from './pages/Reports';
import AIChatbot from './pages/AIChatbot';
import Communication from './pages/Communication';
import Prescriptions from './pages/Prescriptions';
import Fees from './pages/Fees';
import Profile from './pages/Profile';
import DeveloperDetails from './pages/DeveloperDetails';
import About from './pages/About';
import PatientAppointments from './pages/PatientAppointments';
import Layout from './components/common/Layout';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif', gap: '16px', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Something went wrong</h2>
          <p style={{ color: '#64748b', maxWidth: '400px' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={() => { this.setState({ hasError: false }); try { const userInfo = localStorage.getItem('userInfo'); if (userInfo) { const role = JSON.parse(userInfo).role; window.location.href = role === 'Doctor' ? '/doctor-dashboard' : '/patient-dashboard'; } else { window.location.href = '/login'; } } catch (e) { window.location.href = '/login'; } }} style={{ background: '#0f8287', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Authenticated Routes wrapped in Layout */}
            <Route path="/doctor-dashboard" element={<Layout><DoctorDashboard /></Layout>} />
            <Route path="/patient-dashboard" element={<Layout><PatientDashboard /></Layout>} />
            <Route path="/doctor-appointments" element={<Layout><DoctorAppointments /></Layout>} />
            <Route path="/patient-appointments" element={<Layout><PatientAppointments /></Layout>} />
            <Route path="/reports" element={<Layout><Reports /></Layout>} />
            <Route path="/ai-chatbot" element={<Layout><AIChatbot /></Layout>} />
            <Route path="/consultation" element={<Layout><Communication /></Layout>} />
            <Route path="/prescriptions" element={<Layout><Prescriptions /></Layout>} />
            <Route path="/fees" element={<Layout><Fees /></Layout>} />
            <Route path="/profile" element={<Layout><Profile /></Layout>} />
            <Route path="/developer" element={<DeveloperDetails />} />
            <Route path="/about" element={<Layout><About /></Layout>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
