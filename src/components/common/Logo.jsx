import React from 'react';

const Logo = ({ width = 80, height = 80, style = {} }) => {
  return (
    <svg viewBox="0 0 100 100" width={width} height={height} style={{ overflow: 'visible', ...style }}>
      {/* Background Shield */}
      <path d="M50 5 L10 20 L10 50 C10 75 40 95 50 100 C60 95 90 75 90 50 L90 20 Z" fill="var(--primary)" />
      
      {/* Darker Inner Shadow/Half Shield (Optional for depth) */}
      <path d="M50 5 L50 100 C60 95 90 75 90 50 L90 20 Z" fill="#0f5f63" />
      
      {/* Medical Cross */}
      <path d="M30 45 L45 45 L45 30 L55 30 L55 45 L70 45 L70 55 L55 55 L55 70 L45 70 L45 55 L30 55 Z" fill="#ffffff" />
      
      {/* Heartbeat / Neuro Pulse */}
      <path d="M15 65 L30 65 L40 40 L50 75 L60 45 L70 65 L85 65" fill="none" stroke="#fef08a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Arrow Head */}
      <polygon points="85,65 75,58 78,72" fill="#fef08a" />
    </svg>
  );
};

export default Logo;
