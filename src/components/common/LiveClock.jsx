import React, { useState, useEffect } from 'react';

const LiveClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString();

  return (
    <div 
      className="desktop-only"
      style={{
        fontSize: '0.85rem',
        fontWeight: '600',
        color: 'var(--text-muted)',
        background: 'rgba(15, 130, 135, 0.06)',
        padding: '6px 14px',
        borderRadius: '20px',
        border: '1px solid var(--glass-border)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
        marginLeft: 'auto',
        marginRight: '16px'
      }}
    >
      📅 {dateStr} | ⏰ {timeStr}
    </div>
  );
};

export default LiveClock;
