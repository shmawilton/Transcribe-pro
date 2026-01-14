// SettingsModal.tsx - Settings modal with glassmorphic and neumorphic design
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';

interface Settings {
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in minutes
  language: string;
}

const DEFAULT_SETTINGS: Settings = {
  autoSaveEnabled: true,
  autoSaveInterval: 5,
  language: 'English',
};

const SettingsModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.ui.isSettingsModalOpen);
  const setIsSettingsModalOpen = useAppStore((state) => state.setIsSettingsModalOpen);
  
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch (e) {
          console.error('Failed to parse settings:', e);
        }
      }
    }
  }, [isOpen]);

  const handleChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setHasChanges(false);
    setIsSettingsModalOpen(false);
  };

  const handleCancel = () => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
    setHasChanges(false);
    setIsSettingsModalOpen(false);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem('appSettings');
      setHasChanges(true);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '2rem',
          minWidth: '500px',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: `
            8px 8px 16px rgba(0, 0, 0, 0.4),
            -8px -8px 16px rgba(255, 255, 255, 0.02),
            inset 2px 2px 4px rgba(0, 0, 0, 0.3),
            inset -2px -2px 4px rgba(255, 255, 255, 0.01)
          `,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleCancel}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#ffffff',
            fontSize: '18px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>

        {/* Header */}
        <h2
          style={{
            color: '#ffffff',
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            fontFamily: "'Merienda', 'Caveat', cursive",
          }}
        >
          Settings
        </h2>

        {/* Auto-Save Settings */}
        <div style={{ marginBottom: '2rem' }}>
          <h3
            style={{
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '1rem',
              fontFamily: "'Merienda', 'Caveat', cursive",
            }}
          >
            Auto-Save
          </h3>
          
          {/* Enable/Disable Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <label
              style={{
                color: '#ffffff',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Enable Auto-Save
            </label>
            <button
              onClick={() => handleChange('autoSaveEnabled', !settings.autoSaveEnabled)}
              style={{
                width: '48px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                background: settings.autoSaveEnabled ? '#006644' : 'rgba(255, 255, 255, 0.2)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: settings.autoSaveEnabled
                  ? 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.05)'
                  : 'inset -2px -2px 4px rgba(0, 0, 0, 0.3), inset 2px 2px 4px rgba(255, 255, 255, 0.05)',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  top: '2px',
                  left: settings.autoSaveEnabled ? '26px' : '2px',
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
              />
            </button>
          </div>

          {/* Interval Input */}
          {settings.autoSaveEnabled && (
            <div
              style={{
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <label
                style={{
                  display: 'block',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  marginBottom: '0.5rem',
                }}
              >
                Auto-Save Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.autoSaveInterval}
                onChange={(e) => handleChange('autoSaveInterval', parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.02)',
                }}
              />
            </div>
          )}
        </div>

        {/* Language Settings */}
        <div style={{ marginBottom: '2rem' }}>
          <h3
            style={{
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '1rem',
              fontFamily: "'Merienda', 'Caveat', cursive",
            }}
          >
            Language
          </h3>
          <select
            value={settings.language}
            onChange={(e) => handleChange('language', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.02)',
            }}
          >
            <option value="English">English</option>
          </select>
        </div>

        {/* Keyboard Shortcuts */}
        <div style={{ marginBottom: '2rem' }}>
          <h3
            style={{
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '1rem',
              fontFamily: "'Merienda', 'Caveat', cursive",
            }}
          >
            Keyboard Shortcuts
          </h3>
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {[
              { key: 'Space', desc: 'Play/Pause' },
              { key: 'Ctrl+Z', desc: 'Undo' },
              { key: 'Ctrl+Y', desc: 'Redo' },
              { key: 'Ctrl+S', desc: 'Save Project' },
              { key: 'Ctrl+O', desc: 'Open Project' },
              { key: 'Ctrl+N', desc: 'New Project' },
            ].map((shortcut, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: idx < 5 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                }}
              >
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>
                  {shortcut.desc}
                </span>
                <kbd
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* About Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3
            style={{
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '1rem',
              fontFamily: "'Merienda', 'Caveat', cursive",
            }}
          >
            About
          </h3>
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>Version: </span>
              <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '500' }}>1.0.0</span>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(220, 53, 69, 0.2)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '12px',
              color: '#ff6b7a',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220, 53, 69, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(220, 53, 69, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Reset All Settings
          </button>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            style={{
              padding: '0.75rem 1.5rem',
              background: hasChanges ? '#006644' : 'rgba(0, 102, 68, 0.3)',
              border: '1px solid rgba(0, 102, 68, 0.5)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: hasChanges ? 1 : 0.5,
              boxShadow: hasChanges ? '0 2px 8px rgba(0, 102, 68, 0.3)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (hasChanges) {
                e.currentTarget.style.background = '#008855';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (hasChanges) {
                e.currentTarget.style.background = '#006644';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SettingsModal;
