// WelcomeScreen.tsx - Neumorphic Welcome Screen
// Features Kenyan-themed neumorphic design with smooth animations

import React, { useState } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';
import { getProjectLoader } from '../project/ProjectLoader';
import { useAppStore } from '../../store/store';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_BLACK = '#0F0F0F';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface WelcomeScreenProps {
  onAudioLoaded: () => void;
  onProjectLoaded?: () => void;
}

// SVG Icons
const MusicIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const WaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h2l2-5 4 10 4-8 2 3h6"/>
  </svg>
);

const MarkerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const SpeedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={KENYAN_RED} stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAudioLoaded, onProjectLoaded }) => {
  const { loadFile, isLoading, resumeAudioContext } = useAudioEngine();
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  
  // Neumorphic colors based on theme
  const neuBg = isLightMode ? '#e4ebf5' : '#1e1e1e';
  const shadowDark = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  const shadowLight = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(50, 50, 50, 0.3)';
  
  const neuRaised = `8px 8px 16px ${shadowDark}, -6px -6px 14px ${shadowLight}`;
  const neuPressed = `inset 4px 4px 8px ${shadowDark}, inset -4px -4px 8px ${shadowLight}`;
  
  const [projectLoader] = useState(() => getProjectLoader(
    (message: string, type: 'success' | 'error') => {
      if (type === 'error') setError(message);
    }
  ));

  const handleStartNewProject = async () => {
    try {
      setError(null);
      const store = useAppStore.getState();
      store.resetProject();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) store.toggleMute();
      store.setZoomLevel(1);
      
      await resumeAudioContext();
      const file = await pickAudioFile();
      if (!file) return;

      const validation = validateAudioFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      await loadFile(file);
      setTimeout(() => {
        const audioStore = useAppStore.getState();
        if (audioStore.audio.isLoaded && audioStore.audio.duration > 0) {
          audioStore.setViewport(0, audioStore.audio.duration);
        }
      }, 500);
      
      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start new project');
    }
  };

  const handleLoadProject = async () => {
    try {
      setError(null);
      setIsLoadingProject(true);
      await resumeAudioContext();
      const loaded = await projectLoader.loadProject(loadFile);
      if (loaded) {
        onProjectLoaded ? onProjectLoaded() : onAudioLoaded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const validation = validateAudioFile(file);
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      setError(null);
      const store = useAppStore.getState();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) store.toggleMute();
      store.setZoomLevel(1);
      
      await resumeAudioContext();
      await loadFile(file);
      
      setTimeout(() => {
        const audioStore = useAppStore.getState();
        if (audioStore.audio.isLoaded && audioStore.audio.duration > 0) {
          audioStore.setViewport(0, audioStore.audio.duration);
        }
      }, 500);
      
      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio');
    }
  };

  const features = [
    { icon: <WaveIcon />, text: 'Waveform Visualization', color: KENYAN_GREEN },
    { icon: <MarkerIcon />, text: 'Section Markers', color: KENYAN_RED },
    { icon: <SpeedIcon />, text: 'Speed Control', color: KENYAN_GREEN },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: neuBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        overflow: 'hidden',
        fontFamily: HANDWRITTEN_FONT
      }}
    >
      {/* Subtle background pattern */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.03,
        background: `
          radial-gradient(circle at 20% 30%, ${KENYAN_GREEN} 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, ${KENYAN_RED} 0%, transparent 40%)
        `,
        pointerEvents: 'none'
      }} />

      {/* Main Card */}
      <div
        className="welcome-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 'clamp(1.25rem, 4vw, 3rem)',
          background: neuBg,
          borderRadius: 'clamp(16px, 4vw, 30px)',
          boxShadow: neuRaised,
          animation: 'fadeInUp 0.6s ease-out',
          position: 'relative',
          zIndex: 1,
          maxWidth: '520px',
          width: '92%',
          gap: 'clamp(1rem, 3vw, 2rem)',
          margin: '0 auto',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Logo/Title Section */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          {/* Neumorphic Logo Circle */}
          <div style={{
            width: 'clamp(60px, 15vw, 80px)',
            height: 'clamp(60px, 15vw, 80px)',
            borderRadius: '50%',
            background: neuBg,
            boxShadow: neuRaised,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto clamp(0.75rem, 2vw, 1.5rem)',
          }}>
            <svg width="clamp(28px, 8vw, 40px)" height="clamp(28px, 8vw, 40px)" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5l12-2v13" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="18" r="3" fill={KENYAN_GREEN}/>
              <circle cx="18" cy="16" r="3" fill={KENYAN_RED}/>
            </svg>
          </div>
          
          <h1 style={{
            fontSize: 'clamp(1.25rem, 5vw, 2rem)',
            fontWeight: '700',
            fontFamily: HANDWRITTEN_FONT,
            color: isLightMode ? '#2d3748' : KENYAN_WHITE,
            marginBottom: '0.35rem',
            letterSpacing: '-0.5px'
          }}>
            Transcription Pro
          </h1>
          <p style={{
            color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
            fontSize: 'clamp(0.75rem, 2.5vw, 0.95rem)',
            fontFamily: HANDWRITTEN_FONT,
          }}>
            Professional Audio Transcription
          </p>
        </div>

        {/* Features - Neumorphic Chips */}
        <div style={{
          display: 'flex',
          gap: 'clamp(6px, 2vw, 12px)',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%'
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(4px, 1.5vw, 8px)',
                padding: 'clamp(5px, 1.5vw, 8px) clamp(8px, 2.5vw, 14px)',
                background: neuBg,
                borderRadius: '20px',
                boxShadow: `3px 3px 6px ${shadowDark}, -2px -2px 4px ${shadowLight}`,
                fontSize: 'clamp(0.65rem, 2vw, 0.8rem)',
                color: feature.color,
                fontWeight: '500'
              }}
            >
              <span style={{ display: 'flex', transform: 'scale(clamp(0.75, 2vw, 1))' }}>{feature.icon}</span>
              <span className="hide-on-small-mobile">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%'
        }}>
          {/* New Project Button */}
          <button
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleStartNewProject}
            onMouseEnter={() => setHoveredButton('new')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={isLoading || isLoadingProject}
            style={{
              width: '100%',
              padding: 'clamp(0.75rem, 3vw, 1.25rem) clamp(0.75rem, 3vw, 1.5rem)',
              border: 'none',
              borderRadius: 'clamp(12px, 3vw, 16px)',
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(0.5rem, 2vw, 1rem)',
              cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
              background: neuBg,
              transition: 'all 0.3s ease',
              boxShadow: (isDragging || hoveredButton === 'new') ? neuPressed : neuRaised,
              transform: (isDragging || hoveredButton === 'new') ? 'scale(0.98)' : 'scale(1)',
              opacity: (isLoading || isLoadingProject) ? 0.6 : 1,
              fontFamily: HANDWRITTEN_FONT,
              minHeight: '60px',
              touchAction: 'manipulation'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: 'clamp(32px, 10vw, 40px)',
                  height: 'clamp(32px, 10vw, 40px)',
                  borderRadius: '50%',
                  background: neuBg,
                  boxShadow: neuPressed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: 'clamp(18px, 6vw, 24px)',
                    height: 'clamp(18px, 6vw, 24px)',
                    border: `3px solid ${KENYAN_GREEN}30`,
                    borderTopColor: KENYAN_GREEN,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ 
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE, 
                    fontSize: 'clamp(0.85rem, 3vw, 1rem)',
                    fontWeight: '600',
                    margin: 0
                  }}>Loading audio...</p>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: 'clamp(40px, 12vw, 50px)',
                  height: 'clamp(40px, 12vw, 50px)',
                  borderRadius: 'clamp(10px, 3vw, 14px)',
                  background: neuBg,
                  boxShadow: `4px 4px 8px ${shadowDark}, -3px -3px 6px ${shadowLight}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MusicIcon />
                </div>
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                    fontSize: 'clamp(0.9rem, 3.5vw, 1.1rem)',
                    fontWeight: '600',
                    marginTop: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    marginBottom: '2px'
                  }}>
                    {isDragging ? 'Drop audio file' : 'New Project'}
                  </p>
                  <p style={{
                    color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: 'clamp(0.65rem, 2.5vw, 0.8rem)',
                    margin: 0
                  }}>
                    Click or drag & drop audio file
                  </p>
                </div>
                <svg width="clamp(16px, 5vw, 20px)" height="clamp(16px, 5vw, 20px)" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
          </button>

          {/* Load Project Button */}
          <button
            onClick={handleLoadProject}
            onMouseEnter={() => setHoveredButton('load')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={isLoading || isLoadingProject}
            style={{
              width: '100%',
              padding: 'clamp(0.75rem, 3vw, 1.25rem) clamp(0.75rem, 3vw, 1.5rem)',
              border: 'none',
              borderRadius: 'clamp(12px, 3vw, 16px)',
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(0.5rem, 2vw, 1rem)',
              cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
              background: neuBg,
              transition: 'all 0.3s ease',
              boxShadow: (isLoadingProject || hoveredButton === 'load') ? neuPressed : neuRaised,
              transform: (isLoadingProject || hoveredButton === 'load') ? 'scale(0.98)' : 'scale(1)',
              opacity: (isLoading || isLoadingProject) ? 0.6 : 1,
              fontFamily: HANDWRITTEN_FONT,
              minHeight: '60px',
              touchAction: 'manipulation'
            }}
          >
            {isLoadingProject ? (
              <>
                <div style={{
                  width: 'clamp(32px, 10vw, 40px)',
                  height: 'clamp(32px, 10vw, 40px)',
                  borderRadius: '50%',
                  background: neuBg,
                  boxShadow: neuPressed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: 'clamp(18px, 6vw, 24px)',
                    height: 'clamp(18px, 6vw, 24px)',
                    border: `3px solid ${KENYAN_RED}30`,
                    borderTopColor: KENYAN_RED,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ 
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE, 
                    fontSize: 'clamp(0.85rem, 3vw, 1rem)',
                    fontWeight: '600',
                    margin: 0
                  }}>Loading project...</p>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: 'clamp(40px, 12vw, 50px)',
                  height: 'clamp(40px, 12vw, 50px)',
                  borderRadius: 'clamp(10px, 3vw, 14px)',
                  background: neuBg,
                  boxShadow: `4px 4px 8px ${shadowDark}, -3px -3px 6px ${shadowLight}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FolderIcon />
                </div>
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                    fontSize: 'clamp(0.9rem, 3.5vw, 1.1rem)',
                    fontWeight: '600',
                    margin: 0,
                    marginBottom: '2px'
                  }}>
                    Load Project
                  </p>
                  <p style={{
                    color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: 'clamp(0.65rem, 2.5vw, 0.8rem)',
                    margin: 0
                  }}>
                    Open saved .tsproj file
                  </p>
                </div>
                <svg width="clamp(16px, 5vw, 20px)" height="clamp(16px, 5vw, 20px)" viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Supported Formats */}
        <p style={{
          color: isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)',
          fontSize: '0.75rem',
          textAlign: 'center',
          margin: 0
        }}>
          Supports MP3, WAV, OGG, FLAC, M4A, AAC, WEBM
        </p>

        {/* Error Message */}
        {error && (
          <div style={{
            color: KENYAN_RED,
            fontSize: '0.85rem',
            padding: '0.75rem 1rem',
            background: neuBg,
            borderRadius: '12px',
            boxShadow: neuPressed,
            width: '100%',
            textAlign: 'center',
            animation: 'shake 0.4s ease-in-out'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: 'clamp(0.75rem, 3vw, 1.5rem)',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(4px, 1.5vw, 8px)',
        color: isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)',
        fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)',
        fontFamily: HANDWRITTEN_FONT,
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '0 1rem'
      }}>
        <span>Made with</span>
        <HeartIcon />
        <span>in Kenya</span>
        <div style={{
          display: 'flex',
          gap: '2px',
          marginLeft: 'clamp(4px, 1.5vw, 8px)'
        }}>
          <span style={{ width: 'clamp(8px, 2.5vw, 10px)', height: 'clamp(5px, 1.5vw, 6px)', background: KENYAN_BLACK, borderRadius: '2px 0 0 2px' }} />
          <span style={{ width: 'clamp(8px, 2.5vw, 10px)', height: 'clamp(5px, 1.5vw, 6px)', background: KENYAN_RED }} />
          <span style={{ width: 'clamp(8px, 2.5vw, 10px)', height: 'clamp(5px, 1.5vw, 6px)', background: KENYAN_GREEN }} />
          <span style={{ width: 'clamp(8px, 2.5vw, 10px)', height: 'clamp(5px, 1.5vw, 6px)', background: KENYAN_WHITE, borderRadius: '0 2px 2px 0' }} />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merienda:wght@300;400;500;600;700&display=swap');
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        
        /* Mobile responsive styles for welcome screen */
        @media (max-width: 480px) {
          .hide-on-small-mobile {
            display: none !important;
          }
        }
        
        @media (max-width: 360px) {
          .welcome-card {
            padding: 1rem !important;
            gap: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
