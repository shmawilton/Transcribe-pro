// MarkerTimeline.tsx - Wilton - Week 1
// Marker timeline component

import React from 'react';

const MarkerTimeline: React.FC = () => {
  return (
    <div className="marker-timeline" style={{ 
      width: '100%', 
      height: '60px',
      background: 'rgba(0, 102, 68, 0.2)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(0, 102, 68, 0.4)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 12px rgba(0, 102, 68, 0.2)',
      transition: 'all var(--transition-normal)'
    }}>
      <div style={{ 
        color: 'var(--text-accent-green)', 
        fontSize: '1rem', 
        fontWeight: '600',
        textShadow: '0 2px 6px rgba(0, 102, 68, 0.3)'
      }}>
        Marker Timeline - Week 1 (Wilton)
      </div>
    </div>
  );
};

export default MarkerTimeline;

