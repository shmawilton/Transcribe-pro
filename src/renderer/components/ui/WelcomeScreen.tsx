// WelcomeScreen.tsx - Initial screen before audio is loaded
// Features Kenyan-themed design with glassmorphism and animations

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

// Handwritten font family - Merienda from Google Fonts
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface WelcomeScreenProps {
  onAudioLoaded: () => void;
  onProjectLoaded?: () => void;
}

// Feature icons as SVG components
const WaveformIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h2l2-5 4 10 4-8 2 3h6"/>
  </svg>
);

const MarkerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const TranscriptionIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={KENYAN_WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
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
  
  // Initialize project loader (use useState to ensure it's only created once)
  const [projectLoader] = useState(() => getProjectLoader(
    (message: string, type: 'success' | 'error') => {
      if (type === 'error') {
        setError(message);
      }
    }
  ));

  const handleStartNewProject = async () => {
    try {
      setError(null);
      // Reset project state (fresh start)
      const store = useAppStore.getState();
      store.resetProject();
      
      // Reset all settings to defaults
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) {
        store.toggleMute();
      }
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
      
      // Reset viewport to full duration after audio loads
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
        if (onProjectLoaded) {
          onProjectLoaded();
        } else {
          onAudioLoaded(); // Fallback to audio loaded callback
        }
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
      // Reset all settings to defaults when loading audio
      const store = useAppStore.getState();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) {
        store.toggleMute();
      }
      store.setZoomLevel(1);
      
      await resumeAudioContext();
      await loadFile(file);
      
      // Reset viewport to full duration after audio loads
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
    { icon: <WaveformIcon />, text: 'Waveform Visualization' },
    { icon: <MarkerIcon />, text: 'Marker Timeline' },
    { icon: <TranscriptionIcon />, text: 'Fast Transcription' }
  ];

  // Neumorphic Theme Toggle Component
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const isLight = theme === 'light';
  const lightThemeColors = {
    bg: '#FCF2EB',
    sun: '#EFB099',
    moon: '#D6C2B5',
    shadow: '#cac2bc',
    light: '#fff'
  };
  const darkThemeColors = {
    bg: '#396273',
    sun: '#8DC4D1',
    moon: '#fff',
    shadow: '#2e4e5c',
    light: '#4d7281'
  };
  const colors = isLight ? lightThemeColors : darkThemeColors;

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '7rem',
        height: '3.5rem',
        borderRadius: '30px',
        border: `3px solid ${colors.bg}`,
        fontSize: '0.5rem',
        padding: '0.5rem',
        overflow: 'hidden',
        cursor: 'pointer',
        outline: 'none',
        background: 'none',
        boxShadow: `-3px -3px 3px ${colors.light},
          3px 3px 3px ${colors.shadow},
          inset 2px 2px 3px ${colors.shadow},
          inset 2px 2px 20px ${colors.shadow}`,
        transition: 'all 0.3s ease',
        zIndex: 10,
      }}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      <div
        style={{
          position: 'absolute',
          height: '2.4rem',
          width: '2.4rem',
          borderRadius: '50%',
          transform: isLight ? 'translateX(0)' : 'translateX(3.2rem)',
          transition: 'transform 0.3s, background-color 0.1s ease',
          background: colors.bg,
          boxShadow: `inset 2px 2px 2px ${colors.light},
            5px 6px 6px ${colors.shadow}`,
        }}
      />
      <svg
        style={{
          position: 'relative',
          borderRadius: '50%',
          height: '2.4rem',
          width: '2.4rem',
          padding: '7px',
          zIndex: 9,
        }}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"
          fill={colors.sun}
          opacity={isLight ? 1 : 0.6}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11 0H13V4.06189C12.6724 4.02104 12.3387 4 12 4C11.6613 4 11.3276 4.02104 11 4.06189V0ZM7.0943 5.68018L4.22173 2.80761L2.80752 4.22183L5.6801 7.09441C6.09071 6.56618 6.56608 6.0908 7.0943 5.68018ZM4.06189 11H0V13H4.06189C4.02104 12.6724 4 12.3387 4 12C4 11.6613 4.02104 11.3276 4.06189 11ZM5.6801 16.9056L2.80751 19.7782L4.22173 21.1924L7.0943 18.3198C6.56608 17.9092 6.09071 17.4338 5.6801 16.9056ZM11 19.9381V24H13V19.9381C12.6724 19.979 12.3387 20 12 20C11.6613 20 11.3276 19.979 11 19.9381ZM16.9056 18.3199L19.7781 21.1924L21.1923 19.7782L18.3198 16.9057C17.9092 17.4339 17.4338 17.9093 16.9056 18.3199ZM19.9381 13H24V11H19.9381C19.979 11.3276 20 11.6613 20 12C20 12.3387 19.979 12.6724 19.9381 13ZM18.3198 7.0943L21.1923 4.22183L19.7781 2.80762L16.9056 5.6801C17.4338 6.09071 17.9092 6.56608 18.3198 7.0943Z"
          fill={colors.sun}
          opacity={isLight ? 1 : 0.6}
        />
      </svg>
      <svg
        style={{
          position: 'relative',
          borderRadius: '50%',
          height: '2.4rem',
          width: '2.4rem',
          padding: '7px',
          zIndex: 9,
        }}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.2256 2.00253C9.59172 1.94346 6.93894 2.9189 4.92893 4.92891C1.02369 8.83415 1.02369 15.1658 4.92893 19.071C8.83418 22.9763 15.1658 22.9763 19.0711 19.071C21.0811 17.061 22.0565 14.4082 21.9975 11.7743C21.9796 10.9772 21.8669 10.1818 21.6595 9.40643C21.0933 9.9488 20.5078 10.4276 19.9163 10.8425C18.5649 11.7906 17.1826 12.4053 15.9301 12.6837C14.0241 13.1072 12.7156 12.7156 12 12C11.2844 11.2844 10.8928 9.97588 11.3163 8.0699C11.5947 6.81738 12.2094 5.43511 13.1575 4.08368C13.5724 3.49221 14.0512 2.90664 14.5935 2.34046C13.8182 2.13305 13.0228 2.02041 12.2256 2.00253ZM17.6569 17.6568C18.9081 16.4056 19.6582 14.8431 19.9072 13.2186C16.3611 15.2643 12.638 15.4664 10.5858 13.4142C8.53361 11.362 8.73568 7.63895 10.7814 4.09281C9.1569 4.34184 7.59434 5.09193 6.34315 6.34313C3.21895 9.46732 3.21895 14.5326 6.34315 17.6568C9.46734 20.781 14.5327 20.781 17.6569 17.6568Z"
          fill={colors.moon}
          opacity={isLight ? 0.6 : 1}
        />
      </svg>
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--neu-bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        overflow: 'hidden',
        fontFamily: HANDWRITTEN_FONT
      }}
    >
      {/* Neumorphic Theme Toggle - Hidden for now (dark mode only) */}
      {/* <ThemeToggle /> */}
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        {/* Floating circles */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${KENYAN_GREEN}20 0%, transparent 70%)`,
          top: '-100px',
          left: '-100px',
          animation: 'float 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${KENYAN_RED}20 0%, transparent 70%)`,
          bottom: '-50px',
          right: '-50px',
          animation: 'float 6s ease-in-out infinite reverse'
        }} />
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${KENYAN_WHITE}10 0%, transparent 70%)`,
          top: '50%',
          left: '70%',
          animation: 'float 10s ease-in-out infinite'
        }} />
      </div>

      {/* Main content - Horizontal layout for desktop */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: '3rem',
          padding: '2.5rem 4rem',
          background: 'var(--neu-bg-base)',
          borderRadius: '24px',
          border: 'none',
          boxShadow: 'var(--neu-raised)',
          animation: 'fadeInUp 0.8s ease-out',
          position: 'relative',
          zIndex: 1,
          maxWidth: '1200px',
          width: '90%'
        }}
      >
        {/* Left side - Logo/Title and Features */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          flex: '0 0 320px',
          gap: '2rem'
        }}>
          {/* Logo/Title */}
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              fontFamily: HANDWRITTEN_FONT,
              background: `linear-gradient(135deg, ${KENYAN_WHITE} 0%, ${KENYAN_GREEN} 50%, ${KENYAN_RED} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem',
              textShadow: `0 0 30px ${KENYAN_GREEN}40`,
              animation: 'glow 2s ease-in-out infinite alternate',
              lineHeight: '1.2'
            }}>
              Transcription Pro
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '1rem',
              letterSpacing: '0.05em',
              fontFamily: HANDWRITTEN_FONT,
              marginTop: '0.5rem'
            }}>
              Professional Audio Transcription Tool
            </p>
          </div>

          {/* Features */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.95rem',
                  animation: `fadeIn 0.5s ease-out ${0.3 + index * 0.1}s both`,
                  fontFamily: HANDWRITTEN_FONT
                }}
              >
                {feature.icon}
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{
          width: '1px',
          background: 'rgba(255, 255, 255, 0.1)',
          margin: '1rem 0'
        }} />

        {/* Right side - Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          flex: '1 1 auto',
          minWidth: '400px'
        }}>
          {/* Start New Project Button */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleStartNewProject}
            style={{
              width: '100%',
              minHeight: '140px',
              border: 'none',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '1.5rem',
              padding: '1.5rem',
              cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
              background: 'var(--neu-bg-base)',
              transition: 'all 0.3s ease',
              transform: isDragging ? 'scale(1.01)' : 'scale(1)',
              boxShadow: isDragging ? 'var(--neu-pressed)' : 'var(--neu-raised)',
              opacity: (isLoading || isLoadingProject) ? 0.6 : 1
            }}
          >
            {isLoading ? (
              <>
                {/* Loading spinner */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: `4px solid ${KENYAN_GREEN}30`,
                    borderTopColor: KENYAN_GREEN,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <div style={{
                    position: 'absolute',
                    width: '70%',
                    height: '70%',
                    top: '15%',
                    left: '15%',
                    border: `4px solid ${KENYAN_RED}30`,
                    borderTopColor: KENYAN_RED,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite reverse'
                  }} />
                </div>
                <div>
                  <p style={{ 
                    color: KENYAN_WHITE, 
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    marginBottom: '0.25rem',
                    fontFamily: HANDWRITTEN_FONT 
                  }}>Loading audio...</p>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.9rem',
                    fontFamily: HANDWRITTEN_FONT
                  }}>Please wait</p>
                </div>
              </>
            ) : (
              <>
                {/* Upload icon */}
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDragging ? KENYAN_GREEN : 'rgba(255, 255, 255, 0.5)'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transition: 'all 0.3s ease',
                    transform: isDragging ? 'translateY(-3px)' : 'translateY(0)',
                    animation: 'bounce 2s ease-in-out infinite',
                    flexShrink: 0
                  }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div style={{ flex: 1 }}>
                  <p style={{
                    color: KENYAN_WHITE,
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    fontFamily: HANDWRITTEN_FONT
                  }}>
                    {isDragging ? 'Drop your audio file here' : 'Start New Project'}
                  </p>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.9rem',
                    marginBottom: '0.25rem',
                    fontFamily: HANDWRITTEN_FONT
                  }}>
                    Click, drag & drop, or browse to select
                  </p>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.8rem',
                    fontFamily: HANDWRITTEN_FONT
                  }}>
                    MP3, WAV, OGG, FLAC, M4A, AAC, WEBM
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Load Project Button */}
          <button
            onClick={handleLoadProject}
            disabled={isLoading || isLoadingProject}
            style={{
              width: '100%',
              minHeight: '140px',
              border: 'none',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '1.5rem',
              padding: '1.5rem',
              cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
              background: 'var(--neu-bg-base)',
              transition: 'all 0.3s ease',
              boxShadow: isLoadingProject ? 'var(--neu-pressed)' : 'var(--neu-raised)',
              opacity: (isLoading || isLoadingProject) ? 0.6 : 1,
              fontFamily: HANDWRITTEN_FONT
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !isLoadingProject) {
                e.currentTarget.style.boxShadow = 'var(--neu-pressed)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && !isLoadingProject) {
                e.currentTarget.style.boxShadow = 'var(--neu-raised)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {isLoadingProject ? (
              <>
                <div style={{
                  width: '50px',
                  height: '50px',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: `4px solid ${KENYAN_GREEN}30`,
                    borderTopColor: KENYAN_GREEN,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
                <div>
                  <p style={{ 
                    color: KENYAN_WHITE, 
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    marginBottom: '0.25rem',
                    fontFamily: HANDWRITTEN_FONT 
                  }}>Loading project...</p>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.9rem',
                    fontFamily: HANDWRITTEN_FONT
                  }}>Please wait</p>
                </div>
              </>
            ) : (
              <>
                {/* Folder icon */}
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transition: 'all 0.3s ease',
                    flexShrink: 0
                  }}
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <path d="M12 11v6" />
                  <path d="M9 14l3-3 3 3" />
                </svg>
                <div style={{ flex: 1 }}>
                  <p style={{
                    color: KENYAN_WHITE,
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    fontFamily: HANDWRITTEN_FONT
                  }}>
                    Load Project
                  </p>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.9rem',
                    fontFamily: HANDWRITTEN_FONT
                  }}>
                    Open a saved .tsproj project file
                  </p>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Error message - positioned below buttons */}
        {error && (
          <div style={{
            color: KENYAN_RED,
            fontSize: '0.9rem',
            padding: '0.75rem 1rem',
            background: `${KENYAN_RED}20`,
            borderRadius: '8px',
            border: `1px solid ${KENYAN_RED}40`,
            animation: 'shake 0.5s ease-in-out',
            fontFamily: HANDWRITTEN_FONT,
            marginTop: '0.5rem'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontFamily: HANDWRITTEN_FONT
      }}>
        <span>Made with</span>
        <HeartIcon />
        <span>in Kenya</span>
        <span style={{
          display: 'flex',
          gap: '2px',
          marginLeft: '0.5rem'
        }}>
          <span style={{ width: '12px', height: '8px', background: KENYAN_BLACK, borderRadius: '2px 0 0 2px', border: '1px solid rgba(255,255,255,0.2)' }} />
          <span style={{ width: '12px', height: '8px', background: KENYAN_RED }} />
          <span style={{ width: '12px', height: '8px', background: KENYAN_GREEN }} />
          <span style={{ width: '12px', height: '8px', background: KENYAN_WHITE, borderRadius: '0 2px 2px 0' }} />
        </span>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merienda:wght@300;400;500;600;700&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow {
          from { filter: drop-shadow(0 0 20px ${KENYAN_GREEN}40); }
          to { filter: drop-shadow(0 0 30px ${KENYAN_RED}40); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
