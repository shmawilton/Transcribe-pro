// PlaybackPanel.tsx - Julius - Week 1-2
// Playback controls panel with Kenyan-themed styling, glassmorphism, and animations

import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { useAppStore } from '../../store/store';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family
const HANDWRITTEN_FONT = "'Caveat', 'Patrick Hand', 'Kalam', 'Indie Flower', cursive";

const PlaybackPanel: React.FC = () => {
  const { 
    play, 
    pause, 
    stop, 
    seek,
    isAudioLoaded,
    isPlaying,
    resumeAudioContext
  } = useAudioEngine();
  
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  
  const audio = useAppStore((state) => state.audio) || {
    file: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isLoaded: false,
  };
  
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  // Theme-aware colors
  const textColor = isLightMode ? '#1a1a1a' : '#FFFFFF';
  const bgPrimary = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'linear-gradient(145deg, rgba(15, 15, 15, 0.95), rgba(26, 26, 26, 0.9))';
  const glassBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.3)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const buttonBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';

  useEffect(() => {
    return () => {};
  }, []);

  const handlePlay = async () => {
    try {
      await resumeAudioContext();
      await play();
    } catch (err) {
      console.error('Play error:', err);
    }
  };

  const handlePause = () => {
    try {
      pause();
    } catch (err) {
      console.error('Pause error:', err);
    }
  };

  const handleStop = () => {
    try {
      stop();
    } catch (err) {
      console.error('Stop error:', err);
    }
  };

  const handleSkipBackward = async () => {
    if (!isAudioLoaded) return;
    const newTime = Math.max(0, (audio.currentTime || 0) - 5);
    await seek(newTime);
  };

  const handleSkipForward = async () => {
    if (!isAudioLoaded || !audio.duration) return;
    const newTime = Math.min(audio.duration, (audio.currentTime || 0) + 5);
    await seek(newTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    // Note: Actual speed change will be implemented in Week 2 with audio engine
    console.log('[PlaybackPanel] Speed changed to:', speed);
  };

  const formatTime = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileType = (fileName: string | null): string => {
    if (!fileName) return '';
    const ext = fileName.split('.').pop()?.toUpperCase();
    return ext || '';
  };

  // Calculate progress percentage
  const progressPercent = audio.duration > 0 
    ? (audio.currentTime / audio.duration) * 100 
    : 0;

  // Speed presets
  const speedPresets = [0.5, 0.75, 1.0, 1.5, 2.0];

  // Glassmorphism button style
  const glassButtonStyle = (isActive: boolean, isDisabled: boolean, color: string = textColor) => ({
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: isActive 
      ? `linear-gradient(135deg, ${KENYAN_GREEN}40, ${KENYAN_RED}40)`
      : buttonBg,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `2px solid ${isActive ? KENYAN_GREEN : borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isActive 
      ? `0 0 20px ${KENYAN_GREEN}60, 0 4px 15px rgba(0, 0, 0, 0.3)`
      : '0 4px 15px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    transform: 'scale(1)',
    color: color,
  });

  return (
    <div className="playback-panel" style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: '0.75rem',
      padding: '1rem',
      background: bgPrimary,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${isLightMode ? 'rgba(222, 41, 16, 0.3)' : 'rgba(222, 41, 16, 0.2)'}`,
      boxShadow: isLightMode 
        ? '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)' 
        : '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      transition: 'all 0.3s ease',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: HANDWRITTEN_FONT
    }}>
      {/* Animated background gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isLightMode 
          ? `radial-gradient(ellipse at 20% 20%, ${KENYAN_GREEN}08 0%, transparent 50%),
             radial-gradient(ellipse at 80% 80%, ${KENYAN_RED}08 0%, transparent 50%)`
          : `radial-gradient(ellipse at 20% 20%, ${KENYAN_GREEN}10 0%, transparent 50%),
             radial-gradient(ellipse at 80% 80%, ${KENYAN_RED}10 0%, transparent 50%)`,
        pointerEvents: 'none',
        animation: 'backgroundPulse 4s ease-in-out infinite alternate'
      }} />

      {/* Title */}
      <div style={{ 
        color: textColor, 
        fontSize: '1.1rem', 
        fontWeight: '700',
        textAlign: 'center',
        flexShrink: 0,
        letterSpacing: '0.05em',
        textShadow: isLightMode ? 'none' : `0 0 10px ${KENYAN_RED}60`,
        position: 'relative',
        zIndex: 1,
        fontFamily: HANDWRITTEN_FONT
      }}>
        Playback Controls
      </div>

      {/* Time Progress Display - Now at top */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          background: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${KENYAN_GREEN}, ${KENYAN_RED})`,
            borderRadius: '4px',
            transition: 'width 0.1s linear',
            boxShadow: `0 0 10px ${KENYAN_GREEN}60`
          }} />
        </div>
        
        {/* Time and File Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.3rem 0.5rem',
          background: glassBg,
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {/* Clock icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{
              fontSize: '1.2rem',
              fontWeight: '700',
              fontFamily: HANDWRITTEN_FONT,
              color: textColor,
              textShadow: isLightMode ? 'none' : `0 0 10px ${KENYAN_GREEN}60`
            }}>
              {formatTime(audio?.currentTime)} / {formatTime(audio?.duration)}
            </span>
          </div>
          {audio.file && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              {/* Audio file icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
              <span style={{
                fontSize: '0.85rem',
                fontFamily: HANDWRITTEN_FONT,
                color: textColor,
                opacity: 0.7,
                background: `${KENYAN_RED}30`,
                padding: '0.15rem 0.4rem',
                borderRadius: '4px'
              }}>
                {getFileType(audio.file.name)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Playback Controls */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1
      }}>
        {/* Skip Backward -5s */}
        <button
          onClick={handleSkipBackward}
          disabled={!isAudioLoaded}
          style={{
            ...glassButtonStyle(false, !isAudioLoaded),
            width: '36px',
            height: '36px',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded) e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Skip -5 seconds"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
        </button>

        {/* Play Button */}
        <button
          onClick={handlePlay}
          disabled={!isAudioLoaded || isPlaying}
          style={glassButtonStyle(false, !isAudioLoaded || isPlaying, KENYAN_GREEN)}
          onMouseEnter={(e) => {
            if (isAudioLoaded && !isPlaying) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = `0 0 25px ${KENYAN_GREEN}80`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          }}
          title="Play"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={KENYAN_GREEN}>
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
        
        {/* Pause Button */}
        <button
          onClick={handlePause}
          disabled={!isAudioLoaded || !isPlaying}
          style={glassButtonStyle(isPlaying, !isAudioLoaded || !isPlaying, textColor)}
          onMouseEnter={(e) => {
            if (isAudioLoaded && isPlaying) {
              e.currentTarget.style.transform = 'scale(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Pause"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        
        {/* Stop Button */}
        <button
          onClick={handleStop}
          disabled={!isAudioLoaded}
          style={glassButtonStyle(false, !isAudioLoaded, KENYAN_RED)}
          onMouseEnter={(e) => {
            if (isAudioLoaded) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = `0 0 25px ${KENYAN_RED}60`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
          }}
          title="Stop"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={KENYAN_RED}>
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>

        {/* Skip Forward +5s */}
        <button
          onClick={handleSkipForward}
          disabled={!isAudioLoaded}
          style={{
            ...glassButtonStyle(false, !isAudioLoaded),
            width: '36px',
            height: '36px',
          }}
          onMouseEnter={(e) => {
            if (isAudioLoaded) e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Skip +5 seconds"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 6v12l8.5-6L13 6zM4 18l8.5-6L4 6v12z"/>
          </svg>
        </button>
      </div>

      {/* Speed Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Speed Slider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {/* Speed icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, minWidth: '16px' }}>
            <path d="M12 2v4"/>
            <path d="m16.2 7.8 2.9-2.9"/>
            <path d="M18 12h4"/>
            <path d="m16.2 16.2 2.9 2.9"/>
            <path d="M12 18v4"/>
            <path d="m4.9 19.1 2.9-2.9"/>
            <path d="M2 12h4"/>
            <path d="m4.9 4.9 2.9 2.9"/>
          </svg>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.05"
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: `linear-gradient(to right, ${KENYAN_GREEN} 0%, ${KENYAN_GREEN} ${((playbackSpeed - 0.25) / 3.75) * 100}%, ${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'} ${((playbackSpeed - 0.25) / 3.75) * 100}%, ${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'} 100%)`,
              outline: 'none',
              cursor: 'pointer',
              WebkitAppearance: 'none',
              appearance: 'none'
            }}
          />
          <span style={{
            fontSize: '1rem',
            fontWeight: '700',
            color: KENYAN_GREEN,
            minWidth: '50px',
            textAlign: 'right',
            fontFamily: HANDWRITTEN_FONT
          }}>
            {playbackSpeed.toFixed(2)}x
          </span>
        </div>

        {/* Speed Preset Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.3rem',
          justifyContent: 'center'
        }}>
          {speedPresets.map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                fontFamily: HANDWRITTEN_FONT,
                background: playbackSpeed === speed 
                  ? `linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_GREEN}CC)`
                  : buttonBg,
                border: `1px solid ${playbackSpeed === speed ? KENYAN_GREEN : borderColor}`,
                borderRadius: '6px',
                color: playbackSpeed === speed ? '#FFFFFF' : textColor,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: playbackSpeed === speed ? 'scale(1.05)' : 'scale(1)',
                boxShadow: playbackSpeed === speed ? `0 0 10px ${KENYAN_GREEN}60` : 'none'
              }}
              onMouseEnter={(e) => {
                if (playbackSpeed !== speed) {
                  e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (playbackSpeed !== speed) {
                  e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Patrick+Hand&family=Kalam:wght@400;700&display=swap');
        
        @keyframes backgroundPulse {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${KENYAN_GREEN};
          cursor: pointer;
          border: 2px solid ${KENYAN_WHITE};
          box-shadow: 0 0 10px ${KENYAN_GREEN}80;
          transition: all 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 15px ${KENYAN_GREEN};
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${KENYAN_GREEN};
          cursor: pointer;
          border: 2px solid ${KENYAN_WHITE};
          box-shadow: 0 0 10px ${KENYAN_GREEN}80;
        }
      `}</style>
    </div>
  );
};

export default PlaybackPanel;
