// Waveform.tsx - Julius - Week 1
// Waveform rendering component using Canvas

import React from 'react';

const Waveform: React.FC = () => {
  return (
    <div className="waveform-container" style={{ 
      width: '100%', 
      height: '100%', 
      minHeight: '200px',
      background: 'rgba(26, 26, 26, 0.5)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 'var(--radius-md)',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      transition: 'all var(--transition-normal)'
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

