// PlaybackPanel.tsx - Julius - Week 1-2
// Playback controls panel (play, pause, stop, seek)

import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';
import { useAppStore } from '../../store/store';

const PlaybackPanel: React.FC = () => {
  const { 
    loadFile, 
    play, 
    pause, 
    stop, 
    isLoading,
    error,
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
  
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    return () => {};
  }, []);

  const handleLoadAudio = async () => {
    try {
      setLoadError(null);
      await resumeAudioContext();
      const file = await pickAudioFile();
      
      if (!file) return;

      const validation = validateAudioFile(file);
      
      if (!validation.valid) {
        setLoadError(validation.error || 'Invalid file');
        return;
      }

      await loadFile(file);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load audio');
    }
  };

  const handlePlay = async () => {
    try {
      await resumeAudioContext();
      await play();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to play');
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

  const formatTime = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileType = (fileName: string | null): string => {
    if (!fileName) return 'Unknown';
    const ext = fileName.split('.').pop()?.toUpperCase();
    return ext || 'Unknown';
  };

  // Theme-aware colors
  const textColor = isLightMode ? '#000000' : '#FFFFFF';
  const panelBg = isLightMode 
    ? 'rgba(255, 255, 255, 0.95)' 
    : 'rgba(26, 26, 26, 0.95)';

  return (
    <div className="playback-panel" style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: '0.5rem',
      padding: '0.75rem',
      background: panelBg,
      borderRadius: 'var(--radius-md)',
      transition: 'all var(--transition-normal)',
      overflow: 'hidden'
    }}>
      {/* Title */}
      <div style={{ 
        color: textColor, 
        fontSize: '0.85rem', 
        fontWeight: '600',
        textAlign: 'center',
        flexShrink: 0
      }}>
        Playback Controls
      </div>

      {/* Audio File Name (80%) + Load Button (20%) */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexShrink: 0
      }}>
        {/* File Name - 80% width */}
        {isAudioLoaded && audio.file && (
          <div style={{
            flex: '0 0 80%',
            fontSize: '0.7rem',
            color: textColor,
            textAlign: 'left',
            padding: '0.4rem 0.6rem',
            background: isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0
          }}>
            {audio.file.name}
          </div>
        )}

        {/* Load Audio Button */}
        <button
          onClick={handleLoadAudio}
          disabled={isLoading}
          style={{
            flex: isAudioLoaded ? '0 0 20%' : '1 1 auto',
            padding: '0.4rem 0.6rem',
            fontSize: '0.7rem',
            fontWeight: '600',
            background: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${isLightMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: 'var(--radius-sm)',
            color: textColor,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          {isLoading ? 'Loading...' : 'Load'}
        </button>
      </div>

      {/* Error Display */}
      {(error || loadError) && (
        <div style={{
          color: '#ff4444',
          fontSize: '0.65rem',
          textAlign: 'center',
          padding: '0.3rem',
          background: 'rgba(222, 41, 16, 0.1)',
          borderRadius: 'var(--radius-sm)',
          maxWidth: '100%',
          wordBreak: 'break-word',
          flexShrink: 0
        }}>
          {error || loadError}
        </div>
      )}

      {/* Playback Controls Row */}
      {isAudioLoaded && (
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          {/* Playback Buttons in Bubbles */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            {/* Play Button */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all var(--transition-fast)',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              opacity: isPlaying ? 0.5 : 1
            }}
            onClick={handlePlay}
            onMouseEnter={(e) => {
              if (!isPlaying) e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}>
              <svg width="35" height="35" viewBox="0 0 24 24" fill="#000000" strokeWidth="0">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            
            {/* Pause Button */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all var(--transition-fast)',
              cursor: !isPlaying ? 'not-allowed' : 'pointer',
              opacity: !isPlaying ? 0.5 : 1
            }}
            onClick={handlePause}
            onMouseEnter={(e) => {
              if (isPlaying) e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}>
              <svg width="35" height="35" viewBox="0 0 24 24" fill="#000000" strokeWidth="0">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            </div>
            
            {/* Stop Button */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer'
            }}
            onClick={handleStop}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}>
              <svg width="35" height="35" viewBox="0 0 24 24" fill="#000000" strokeWidth="0">
                <rect x="6" y="6" width="12" height="12" rx="2"></rect>
              </svg>
            </div>
          </div>

          {/* Duration and File Type */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.15rem',
            minWidth: '90px'
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: textColor,
              fontWeight: '600'
            }}>
              {formatTime(audio?.currentTime)} / {formatTime(audio?.duration)}
            </div>
            {audio.file && (
              <div style={{
                fontSize: '0.65rem',
                color: textColor,
                opacity: 0.7
              }}>
                {getFileType(audio.file.name)}
              </div>
            )}
          </div>
        </div>
      )}

      {!isAudioLoaded && (
        <div style={{
          fontSize: '0.7rem',
          color: textColor,
          opacity: 0.7,
          textAlign: 'center',
          marginTop: 'auto',
          paddingTop: '0.5rem',
          flexShrink: 0
        }}>
          Load an audio file to begin
        </div>
      )}
    </div>
  );
};

export default PlaybackPanel;
