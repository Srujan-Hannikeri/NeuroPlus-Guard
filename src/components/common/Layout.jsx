import React from 'react';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const isConsultation = location.pathname === '/consultation';

  return (
    <div className={`app-layout${isConsultation ? ' chatting-active' : ''}`}>
      <Sidebar />
      <main
        className={`main-content${isConsultation ? ' consultation-main' : ''}`}
        style={isConsultation ? { padding: '16px', maxWidth: '100%', flex: 1 } : undefined}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
