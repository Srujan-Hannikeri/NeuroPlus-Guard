import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import DoctorDashboard from './pages/DoctorDashboard';
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
import Layout from './components/common/Layout';

const App = () => {
  return (
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
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="/ai-chatbot" element={<Layout><AIChatbot /></Layout>} />
          <Route path="/consultation" element={<Layout><Communication /></Layout>} />
          <Route path="/prescriptions" element={<Layout><Prescriptions /></Layout>} />
          <Route path="/fees" element={<Layout><Fees /></Layout>} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />
          <Route path="/developer" element={<DeveloperDetails />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
