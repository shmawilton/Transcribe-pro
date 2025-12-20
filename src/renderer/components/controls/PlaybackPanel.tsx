// PlaybackPanel.tsx - Julius - Week 1-2
// Playback controls panel (play, pause, stop, seek)

import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';
import { useAppStore } from '../../store/store';

const PlaybackPanel: React.FC = () => {
  console.log('[PlaybackPanel] Component rendering...');
  
  const { 
    loadFile, 
    play, 
    pause, 
    stop, 
    seek,
    isLoading,
    error,
    isAudioLoaded,
    isPlaying,
    resumeAudioContext
  } = useAudioEngine();
  
  console.log('[PlaybackPanel] Hook values:', {
    isLoading,
    error,
    isAudioLoaded,
    isPlaying
  });
  
  const audio = useAppStore((state) => state.audio) || {
    file: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isLoaded: false,
  };
  
  console.log('[PlaybackPanel] Audio state:', {
    file: audio?.file?.name || 'null',
    duration: audio?.duration,
    currentTime: audio?.currentTime,
    isPlaying: audio?.isPlaying,
    isLoaded: audio?.isLoaded
  });
  
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[PlaybackPanel] Component mounted');
    return () => {
      console.log('[PlaybackPanel] Component unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('[PlaybackPanel] Audio state changed:', audio);
  }, [audio]);

  const handleLoadAudio = async () => {
    console.log('[PlaybackPanel] handleLoadAudio called');
    try {
      console.log('[PlaybackPanel] Step 1: Clearing previous errors');
      setLoadError(null);
      
      console.log('[PlaybackPanel] Step 2: Resuming audio context');
      await resumeAudioContext();
      console.log('[PlaybackPanel] Step 2: Audio context resumed');
      
      console.log('[PlaybackPanel] Step 3: Opening file picker');
      const file = await pickAudioFile();
      console.log('[PlaybackPanel] Step 3: File picker result:', file ? { name: file.name, size: file.size, type: file.type } : 'null');
      
      if (!file) {
        console.log('[PlaybackPanel] No file selected, returning');
        return;
      }

      console.log('[PlaybackPanel] Step 4: Validating file');
      const validation = validateAudioFile(file);
      console.log('[PlaybackPanel] Step 4: Validation result:', validation);
      
      if (!validation.valid) {
        console.warn('[PlaybackPanel] File validation failed:', validation.error);
        setLoadError(validation.error || 'Invalid file');
        return;
      }

      console.log('[PlaybackPanel] Step 5: Loading file into AudioEngine');
      await loadFile(file);
      console.log('[PlaybackPanel] Step 5: File loaded successfully!');
      
      setLoadError(null);
      console.log('[PlaybackPanel] Load complete, checking store state...');
      const storeState = useAppStore.getState();
      console.log('[PlaybackPanel] Store state after load:', {
        audio: storeState.audio,
        isLoaded: storeState.audio.isLoaded,
        duration: storeState.audio.duration
      });
    } catch (err) {
      console.error('[PlaybackPanel] Load error caught:', err);
      console.error('[PlaybackPanel] Error stack:', err instanceof Error ? err.stack : 'No stack');
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio';
      setLoadError(errorMessage);
      console.error('[PlaybackPanel] Error message set:', errorMessage);
    }
  };

  const handlePlay = async () => {
    try {
      await resumeAudioContext();
      await play();
    } catch (err) {
      console.error('Play error:', err);
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
    try {
      if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
        return '0:00';
      }
      const mins = Math.floor(Math.max(0, seconds) / 60);
      const secs = Math.floor(Math.max(0, seconds) % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } catch (err) {
      console.error('[PlaybackPanel] formatTime error:', err, 'seconds:', seconds);
      return '0:00';
    }
  };

  console.log('[PlaybackPanel] About to render JSX');
  
  try {
    return (
    <div className="playback-panel" style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      padding: '1rem',
      background: 'rgba(222, 41, 16, 0.15)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(222, 41, 16, 0.3)',
      borderRadius: 'var(--radius-md)',
      transition: 'all var(--transition-normal)'
    }}>
      <div style={{ 
        color: 'var(--text-accent-red)', 
        fontSize: '0.85rem', 
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: '0.5rem'
      }}>
        Playback Controls
      </div>

      {/* Load Audio Button */}
      <button
        onClick={handleLoadAudio}
        disabled={isLoading}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '0.85rem',
          fontWeight: '600',
          background: 'rgba(222, 41, 16, 0.3)',
          border: '1px solid rgba(222, 41, 16, 0.5)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-accent-red)',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
          transition: 'all var(--transition-fast)',
          minWidth: '120px'
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = 'rgba(222, 41, 16, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(222, 41, 16, 0.3)';
        }}
      >
        {isLoading ? 'Loading...' : 'Load Audio'}
      </button>

      {/* Error Display */}
      {(error || loadError) && (
        <div style={{
          color: '#ff4444',
          fontSize: '0.75rem',
          textAlign: 'center',
          padding: '0.25rem',
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}>
          {error || loadError}
        </div>
      )}

      {/* Playback Controls */}
      {isAudioLoaded && (
        <>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                background: isPlaying ? 'rgba(0, 102, 68, 0.3)' : 'rgba(0, 102, 68, 0.2)',
                border: '1px solid rgba(0, 102, 68, 0.4)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-accent-green)',
                cursor: isPlaying ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-fast)',
                minWidth: '70px'
              }}
            >
              ▶ Play
            </button>
            
            <button
              onClick={handlePause}
              disabled={!isPlaying}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                background: !isPlaying ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                cursor: !isPlaying ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-fast)',
                minWidth: '70px'
              }}
            >
              ⏸ Pause
            </button>
            
            <button
              onClick={handleStop}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                background: 'rgba(222, 41, 16, 0.2)',
                border: '1px solid rgba(222, 41, 16, 0.4)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-accent-red)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                minWidth: '70px'
              }}
            >
              ⏹ Stop
            </button>
          </div>

          {/* Time Display */}
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginTop: '0.5rem'
          }}>
            {formatTime(audio?.currentTime)} / {formatTime(audio?.duration)}
          </div>

          {/* File Info */}
          {audio.file && (
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              opacity: 0.7,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {audio.file.name}
            </div>
          )}
        </>
      )}

      {!isAudioLoaded && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          opacity: 0.6,
          textAlign: 'center',
          marginTop: '0.5rem'
        }}>
          Load an audio file to begin
        </div>
      )}
    </div>
    );
  } catch (renderError) {
    console.error('[PlaybackPanel] Render error:', renderError);
    console.error('[PlaybackPanel] Render error stack:', renderError instanceof Error ? renderError.stack : 'No stack');
    return (
      <div style={{ padding: '1rem', color: '#ff4444' }}>
        <h3>PlaybackPanel Render Error</h3>
        <p>{renderError instanceof Error ? renderError.message : String(renderError)}</p>
        <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
          {renderError instanceof Error ? renderError.stack : 'No stack trace'}
        </pre>
      </div>
    );
  }
};

export default PlaybackPanel;
