// Waveform.tsx - Julius - Week 1
// Waveform rendering component using Canvas

import React from 'react';

const Waveform: React.FC = () => {
  return (
    <div className="waveform-container" style={{ 
      width: '100%', 
      flex: '0 0 45%',
      minHeight: '0',
      background: 'rgba(222, 41, 16, 0.15)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(222, 41, 16, 0.3)',
      borderRadius: 'var(--radius-md)',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(222, 41, 16, 0.2)',
      transition: 'all var(--transition-normal)',
      overflow: 'hidden'
    }}>
      <div style={{ 
        color: 'var(--text-accent-red)', 
        fontSize: '1.2rem', 
        fontWeight: '600',
        textShadow: '0 2px 8px rgba(222, 41, 16, 0.3)'
      }}>
        Waveform - Week 1 (Julius)
      </div>
    </div>
  );
};

export default Waveform;









