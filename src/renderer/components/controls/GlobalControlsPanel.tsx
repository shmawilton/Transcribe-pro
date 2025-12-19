// GlobalControlsPanel.tsx - Wilton - Week 2
// Global controls panel (Pitch/Volume)

import React from 'react';

const GlobalControlsPanel: React.FC = () => {
  return (
    <div className="global-controls-panel" style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: 'var(--radius-md)',
      transition: 'all var(--transition-normal)'
    }}>
      <div style={{ 
        color: 'var(--text-primary)', 
        fontSize: '0.9rem', 
        fontWeight: '600',
        textAlign: 'center',
        textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)'
      }}>
        Global Controls<br />
        (Pitch/Volume)<br />
        Week 2 (Wilton)
      </div>
    </div>
  );
};

export default GlobalControlsPanel;

