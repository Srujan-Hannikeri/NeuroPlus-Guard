import React from 'react';
import Sidebar from './Sidebar';
import { useLocation, useSearchParams } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isChatting = location.pathname === '/consultation' && searchParams.get('contactId');

  return (
    <div className={`app-layout${isChatting ? ' chatting-active' : ''}`}>
      <Sidebar />
      <main
        className={`main-content${isChatting || location.pathname === '/consultation' ? ' consultation-main' : ''}`}
        style={isChatting ? { padding: '16px', maxWidth: '100%', flex: 1 } : undefined}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
