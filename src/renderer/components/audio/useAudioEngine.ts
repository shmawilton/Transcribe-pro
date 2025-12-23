// useAudioEngine.ts - React hook for AudioEngine
// Makes AudioEngine easy to use in React components
// Uses HowlerAudioEngine for reliable Electron support

import { useEffect, useRef, useState } from 'react';
import { HowlerAudioEngine, getHowlerAudioEngine } from './HowlerAudioEngine';
import { useAppStore } from '../../store/store';

/**
 * React hook for using AudioEngine (Howler.js based for Electron compatibility)
 * 
 * @returns AudioEngine instance and helper functions
 */
export function useAudioEngine() {
  console.log('[useAudioEngine] Hook called');
  
  const engineRef = useRef<HowlerAudioEngine | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setAudioFile = useAppStore((state) => state.setAudioFile);
  const setDuration = useAppStore((state) => state.setDuration);
  const setAudioBuffer = useAppStore((state) => state.setAudioBuffer);

  // Initialize AudioEngine on mount
  useEffect(() => {
    console.log('[useAudioEngine] Initializing HowlerAudioEngine');
    try {
      engineRef.current = getHowlerAudioEngine();
      console.log('[useAudioEngine] HowlerAudioEngine initialized:', engineRef.current ? 'success' : 'failed');
    } catch (err) {
      console.error('[useAudioEngine] Failed to initialize HowlerAudioEngine:', err);
    }

    // Cleanup on unmount
    return () => {
      console.log('[useAudioEngine] Cleaning up');
      // Don't dispose the singleton, just clear reference
      engineRef.current = null;
    };
  }, []);

  /**
   * Load an audio file
   */
  const loadFile = async (file: File): Promise<void> => {
    console.log('[useAudioEngine] loadFile called with file:', { name: file.name, size: file.size, type: file.type });
    
    if (!engineRef.current) {
      console.error('[useAudioEngine] AudioEngine not initialized!');
      throw new Error('AudioEngine not initialized');
    }

    console.log('[useAudioEngine] Setting loading state to true');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useAudioEngine] Calling engine.loadAudioFile()');
      await engineRef.current.loadAudioFile(file);
      console.log('[useAudioEngine] engine.loadAudioFile() completed successfully');
      
      // Check store state after load
      const store = useAppStore.getState();
      console.log('[useAudioEngine] Store state after load:', {
        isLoaded: store.audio.isLoaded,
        duration: store.audio.duration,
        hasBuffer: !!store.audio.buffer
      });
    } catch (err) {
      console.error('[useAudioEngine] Error in loadFile:', err);
      console.error('[useAudioEngine] Error stack:', err instanceof Error ? err.stack : 'No stack');
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio file';
      setError(errorMessage);
      console.error('[useAudioEngine] Error state set:', errorMessage);
      throw err;
    } finally {
      console.log('[useAudioEngine] Setting loading state to false');
      setIsLoading(false);
    }
  };

  /**
   * Check if a file format is supported
   */
  const isFormatSupported = (file: File): boolean => {
    return engineRef.current?.isFormatSupported(file) || false;
  };

  /**
   * Get audio buffer
   */
  const getAudioBuffer = () => {
    return engineRef.current?.getAudioBuffer() || null;
  };

  /**
   * Get analyser node for waveform
   */
  const getAnalyserNode = () => {
    return engineRef.current?.getAnalyserNode() || null;
  };

  /**
   * Resume audio context (required after user interaction)
   */
  const resumeAudioContext = async () => {
    if (engineRef.current) {
      await engineRef.current.resumeAudioContext();
    }
  };

  /**
   * Play audio
   */
  const play = async () => {
    if (engineRef.current) {
      await engineRef.current.play();
    }
  };

  /**
   * Pause audio
   */
  const pause = () => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
  };

  /**
   * Stop audio
   */
  const stop = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
  };

  /**
   * Seek to time position
   */
  const seek = async (time: number) => {
    if (engineRef.current) {
      await engineRef.current.seek(time);
    }
  };

  /**
   * Get current playback time
   */
  const getCurrentTime = () => {
    return engineRef.current?.getCurrentTime() || 0;
  };

  return {
    audioEngine: engineRef.current,
    isLoading,
    error,
    loadFile,
    isFormatSupported,
    getAudioBuffer,
    getAnalyserNode,
    resumeAudioContext,
    isAudioLoaded: engineRef.current?.isAudioLoaded() || false,
    // Playback methods
    play,
    pause,
    stop,
    seek,
    getCurrentTime,
    isPlaying: engineRef.current?.getIsPlaying() || false,
  };
}
