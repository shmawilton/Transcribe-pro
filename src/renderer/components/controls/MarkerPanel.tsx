// MarkerPanel.tsx - Julius - Week 2-3
// Marker management panel (List + Editor)

import React from 'react';

const MarkerPanel: React.FC = () => {
  return (
    <div className="marker-panel" style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 102, 68, 0.15)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(0, 102, 68, 0.3)',
      borderRadius: 'var(--radius-md)',
      transition: 'all var(--transition-normal)'
    }}>
      <div style={{ 
        color: 'var(--text-accent-green)', 
        fontSize: '0.9rem', 
        fontWeight: '600',
        textAlign: 'center',
        textShadow: '0 1px 4px rgba(0, 102, 68, 0.3)'
      }}>
        Marker Management<br />
        (List + Editor)<br />
        Week 2-3 (Julius)
      </div>
    </div>
  );
};

export default MarkerPanel;

