// PlaybackPanel.tsx - Julius - Week 1-2
// Playback controls panel with Kenyan-themed styling, glassmorphism, and animations

import React, { useState, useEffect, useRef } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { useAppStore } from '../../store/store';
import { MarkerManager } from '../markers/MarkerManager';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family - Merienda from Google Fonts
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', 'Patrick Hand', cursive";

const PlaybackPanel: React.FC = () => {
  const { 
    play, 
    pause, 
    stop, 
    seek,
    resumeAudioContext,
    setSpeed,
    getSpeed
  } = useAudioEngine();
  
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  
  // Use store state for reactive updates (not hook's ref-based values)
  const audio = useAppStore((state) => state.audio) || {
    file: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isLoaded: false,
  };
  
  // Get isAudioLoaded and isPlaying from store for reactivity
  const isAudioLoaded = audio.isLoaded;
  const isPlaying = audio.isPlaying;
  
  const storedSpeed = useAppStore((state) => state.globalControls.playbackRate);
  const [playbackSpeed, setPlaybackSpeed] = useState(storedSpeed || 1.0);
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);
  const speedPopupRef = useRef<HTMLDivElement>(null);
  
  // Sync playback speed with store
  useEffect(() => {
    if (storedSpeed !== undefined && Math.abs(storedSpeed - playbackSpeed) > 0.01) {
      setPlaybackSpeed(storedSpeed);
    }
  }, [storedSpeed]);
  
  // Close speed popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedPopupRef.current && !speedPopupRef.current.contains(e.target as Node)) {
        setShowSpeedPopup(false);
      }
    };
    if (showSpeedPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSpeedPopup]);
  
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
      
      // If a marker is active, seek to marker start before playing
      const store = useAppStore.getState();
      const selectedMarkerId = store.ui.selectedMarkerId;
      if (selectedMarkerId) {
        const marker = MarkerManager.getMarker(selectedMarkerId);
        if (marker) {
          // Seek to marker start before playing
          await seek(marker.start);
          console.log(`[PlaybackPanel] Seeking to marker start (${marker.start}s) before playing`);
        }
      }
      
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
    const clampedSpeed = Math.max(0.25, Math.min(4.0, Math.round(speed * 100) / 100));
    setPlaybackSpeed(clampedSpeed);
    
    // IMMEDIATE speed change - no debounce for instant response like YouTube!
    setSpeed(clampedSpeed);
    useAppStore.getState().setPlaybackRate(clampedSpeed);
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

  // Neumorphic button style
  const glassButtonStyle = (isActive: boolean, isDisabled: boolean, color: string = textColor) => ({
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: isActive 
      ? `linear-gradient(135deg, ${KENYAN_GREEN}40, ${KENYAN_RED}40)`
      : 'var(--neu-bg-base)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isActive 
      ? 'var(--neu-pressed), 0 0 20px rgba(0, 102, 68, 0.3)'
      : 'var(--neu-raised)',
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
      background: 'var(--neu-bg-base)',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      boxShadow: 'var(--neu-raised)',
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

      {/* Animated File Name */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        maxWidth: '100%',
        padding: '0.25rem 0.5rem',
        borderRadius: '8px',
        backgroundImage: isPlaying 
          ? `linear-gradient(90deg, ${KENYAN_RED}20, ${KENYAN_GREEN}20, ${KENYAN_RED}20)`
          : 'none',
        backgroundColor: isPlaying ? 'transparent' : 'transparent',
        backgroundSize: isPlaying ? '200% 100%' : 'auto',
        animation: isPlaying ? 'gradientSlide 3s ease-in-out infinite' : 'none'
      }}>
        {/* File name with marquee effect for long names */}
        <div style={{
          color: isPlaying 
            ? KENYAN_GREEN
            : textColor,
          fontSize: '0.85rem',
          fontWeight: '600',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '200px',
          fontFamily: HANDWRITTEN_FONT,
          textShadow: isPlaying 
            ? `0 0 10px ${KENYAN_GREEN}80, 0 0 20px ${KENYAN_GREEN}40`
            : 'none',
          animation: isPlaying ? 'textGlow 2s ease-in-out infinite' : 'none',
          transition: 'all 0.3s ease'
        }}>
          {audio.file?.name || 'No audio loaded'}
        </div>
        
        {/* Animated equalizer bars when playing */}
        {isPlaying && (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: '3px',
                  background: `linear-gradient(to top, ${KENYAN_RED}, ${KENYAN_GREEN})`,
                  borderRadius: '2px',
                  animation: `equalizer 0.${4 + i}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* CSS Animations for file name */}
      <style>{`
        @keyframes gradientSlide {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes textGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes equalizer {
          0% { height: 4px; }
          100% { height: 14px; }
        }
      `}</style>

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
          background: 'var(--neu-bg-base)',
          borderRadius: '8px',
          border: 'none',
          boxShadow: 'var(--neu-pressed)'
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
              e.currentTarget.style.boxShadow = 'var(--neu-pressed), 0 0 25px rgba(222, 41, 16, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'var(--neu-raised)';
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

        {/* Speed Control Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSpeedPopup(!showSpeedPopup)}
            disabled={!isAudioLoaded}
            style={{
              ...glassButtonStyle(playbackSpeed !== 1.0, !isAudioLoaded, playbackSpeed !== 1.0 ? '#f39c12' : textColor),
              width: '36px',
              height: '36px',
              border: playbackSpeed !== 1.0 ? `2px solid #f39c12` : undefined,
              boxShadow: playbackSpeed !== 1.0 ? `0 0 15px #f39c1260` : undefined,
            }}
            onMouseEnter={(e) => {
              if (isAudioLoaded) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = 'var(--neu-pressed), 0 0 25px rgba(243, 156, 18, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = playbackSpeed !== 1.0 ? 'var(--neu-pressed), 0 0 15px rgba(243, 156, 18, 0.3)' : 'var(--neu-raised)';
            }}
            title={`Playback Speed: ${playbackSpeed.toFixed(2)}x`}
          >
            {/* Speed Gauge Icon - More Descriptive */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={playbackSpeed !== 1.0 ? '#f39c12' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {/* Speedometer/Gauge */}
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity="0.3"/>
              <circle cx="12" cy="12" r="9" fill="none"/>
              {/* Needle pointing based on speed */}
              <line 
                x1="12" 
                y1="12" 
                x2={12 + 7 * Math.cos((playbackSpeed - 0.25) / 3.75 * Math.PI - Math.PI / 2)} 
                y2={12 + 7 * Math.sin((playbackSpeed - 0.25) / 3.75 * Math.PI - Math.PI / 2)}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Speed indicator dots */}
              <circle cx="12" cy="3" r="1.5" fill={playbackSpeed >= 3.0 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed >= 3.0 ? 1 : 0.3}/>
              <circle cx="21" cy="12" r="1.5" fill={playbackSpeed >= 2.0 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed >= 2.0 ? 1 : 0.3}/>
              <circle cx="12" cy="21" r="1.5" fill={playbackSpeed <= 0.5 ? '#f39c12' : 'currentColor'} opacity={playbackSpeed <= 0.5 ? 1 : 0.3}/>
            </svg>
          </button>

          {/* Speed Popup Slider */}
          {showSpeedPopup && (
            <div 
              ref={speedPopupRef}
              style={{
                position: 'absolute',
                bottom: '100%',
                right: 0,
                left: 'auto',
                marginBottom: '8px',
                padding: '16px',
                width: '260px',
                maxWidth: 'calc(100vw - 40px)',
                background: 'rgba(26, 26, 26, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'fadeInScale 0.2s ease-out',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                minWidth: 0
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: isLightMode ? '#666' : '#aaa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  Speed
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: isLightMode ? '#1a1a1a' : '#ffffff',
                    fontFamily: HANDWRITTEN_FONT,
                    whiteSpace: 'nowrap'
                  }}>
                    {playbackSpeed.toFixed(2)}x
                  </span>
                  <button
                    onClick={() => {
                      handleSpeedChange(1.0);
                    }}
                    disabled={!isAudioLoaded || playbackSpeed === 1.0}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.65rem',
                      background: playbackSpeed === 1.0 ? (isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)') : 'transparent',
                      border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '4px',
                      color: isLightMode ? '#666' : '#aaa',
                      cursor: (!isAudioLoaded || playbackSpeed === 1.0) ? 'not-allowed' : 'pointer',
                      opacity: (!isAudioLoaded || playbackSpeed === 1.0) ? 0.4 : 1,
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                    title="Reset to 1.0x"
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              {/* Speed Labels */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: isLightMode ? '#999' : '#666',
                fontWeight: '500'
              }}>
                <span>0.25x</span>
                <span>1.0x</span>
                <span>2.0x</span>
                <span>4.0x</span>
              </div>
              
              <input
                type="range"
                min="0.25"
                max="4.0"
                step="0.01"
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                onInput={(e) => handleSpeedChange(parseFloat((e.target as HTMLInputElement).value))}
                disabled={!isAudioLoaded}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  position: 'relative',
                  display: 'block',
                  background: isLightMode 
                    ? `linear-gradient(to right, #ccc 0%, #ccc ${((playbackSpeed - 0.25) / 3.75) * 100}%, #e0e0e0 ${((playbackSpeed - 0.25) / 3.75) * 100}%, #e0e0e0 100%)`
                    : `linear-gradient(to right, #555 0%, #555 ${((playbackSpeed - 0.25) / 3.75) * 100}%, #333 ${((playbackSpeed - 0.25) / 3.75) * 100}%, #333 100%)`,
                  outline: 'none',
                  cursor: isAudioLoaded ? 'pointer' : 'not-allowed',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  opacity: isAudioLoaded ? 1 : 0.4,
                  transition: 'background 0.1s ease'
                }}
                className="speed-popup-slider"
              />
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merienda:wght@300;400;500;600;700&display=swap');
        
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
        .speed-popup-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${isLightMode ? '#ffffff' : '#e0e0e0'};
          cursor: pointer;
          border: 2px solid ${isLightMode ? '#999' : '#666'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5);
          transition: all 0.2s ease;
          margin-top: -6px;
        }
        .speed-popup-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          background: ${isLightMode ? '#f5f5f5' : '#f0f0f0'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .speed-popup-slider::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }
        .speed-popup-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${isLightMode ? '#ffffff' : '#e0e0e0'};
          cursor: pointer;
          border: 2px solid ${isLightMode ? '#999' : '#666'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          margin-top: -6px;
        }
      `}</style>
    </div>
  );
};

export default PlaybackPanel;
