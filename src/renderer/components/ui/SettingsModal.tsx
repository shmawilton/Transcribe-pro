// SettingsModal.tsx - Wilton - Week 4
// Settings modal component

import React from 'react';
import { useAppStore } from '../../store/store';

const SettingsModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.ui.isSettingsModalOpen);
  
  if (!isOpen) return null;
  
  return (
    <div className="settings-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        border: '2px solid var(--color-gold)',
        borderRadius: '8px',
        padding: '2rem',
        minWidth: '400px'
      }}>
        <div style={{ color: 'var(--color-gold)', fontSize: '1.2rem', fontWeight: 'bold' }}>
          Settings Modal - Week 4 (Wilton)
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

