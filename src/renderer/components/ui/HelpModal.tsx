// HelpModal.tsx - Julius - Week 4
// Help modal component

import React from 'react';
import { useAppStore } from '../../store/store';

const HelpModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.ui.isHelpModalOpen);
  
  if (!isOpen) return null;
  
  return (
    <div className="help-modal" style={{
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
          Help Modal - Week 4 (Julius)
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

