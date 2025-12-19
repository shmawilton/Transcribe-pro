// PlaybackPanel.tsx - Julius - Week 1-2
// Playback controls panel (play, pause, stop, seek)

import React from 'react';

const PlaybackPanel: React.FC = () => {
  return (
    <div className="playback-panel" style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(222, 41, 16, 0.15)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(222, 41, 16, 0.3)',
      borderRadius: 'var(--radius-md)',
      transition: 'all var(--transition-normal)'
    }}>
      <div style={{ 
        color: 'var(--text-accent-red)', 
        fontSize: '0.9rem', 
        fontWeight: '600',
        textAlign: 'center',
        textShadow: '0 1px 4px rgba(222, 41, 16, 0.3)'
      }}>
        Playback Controls<br />
        Week 1-2 (Julius)
      </div>
    </div>
  );
};

export default PlaybackPanel;

