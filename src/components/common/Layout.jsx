import React from 'react';
import Sidebar from './Sidebar';
import { useLocation, useSearchParams } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isConsultation = location.pathname === '/consultation';
  const isChatting = isConsultation && searchParams.get('contactId');

  return (
    <div className={`app-layout${isConsultation ? ' consultation-layout-active' : ''}${isChatting ? ' chatting-active' : ''}`}>
      <Sidebar />
      <main
        className={`main-content${isConsultation ? ' consultation-main' : ''}`}
        style={isChatting ? { padding: '16px', maxWidth: '100%', flex: 1 } : undefined}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
