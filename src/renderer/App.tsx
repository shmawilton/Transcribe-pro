import React, { useEffect, useState } from 'react';
import MenuBar from './components/ui/MenuBar';
import Waveform from './components/audio/Waveform';
import MarkerTimeline from './components/markers/MarkerTimeline';
import PlaybackPanel from './components/controls/PlaybackPanel';
import MarkerPanel from './components/controls/MarkerPanel';
import SettingsModal from './components/ui/SettingsModal';
import HelpModal from './components/ui/HelpModal';
import WelcomeScreen from './components/ui/WelcomeScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useAppStore } from './store/store';
import { useAudioEngine } from './components/audio/useAudioEngine';
import { getProjectLoader } from './components/project/ProjectLoader';

// Kenyan colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';

const App: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const isLoading = useAppStore((state) => state.audio.isLoading); // Use global store
  const [showWelcome, setShowWelcome] = useState(true);
  const restoreAttemptedRef = React.useRef(false);
  
  // Initialize audio engine (but don't use its local loading state)
  // This hook should not cause re-renders
  const { play, pause, stop, seek, getCurrentTime, setVolume, loadFile, resumeAudioContext } = useAudioEngine();
  
  // Get store values for keyboard shortcuts
  const isPlaying = useAppStore((state) => state.audio.isPlaying);
  const currentVolume = useAppStore((state) => state.globalControls.volume);
  const setVolumeStore = useAppStore((state) => state.setVolume);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Web-only: restore last auto-saved project on reload (offline-friendly)
  useEffect(() => {
    const isElectron = !!(window as any).electronAPI || 
      (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.electron);
    if (isElectron) return;
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    (async () => {
      try {
        // Only restore if nothing is loaded and we're not currently loading
        const store = useAppStore.getState();
        if (store.audio.isLoaded || store.audio.isLoading) return;

        await resumeAudioContext();
        const loader = getProjectLoader();
        const restored = await loader.loadAutoSavedProject(loadFile);
        if (restored) {
          setShowWelcome(false);
          // Mark autosave timestamp so exit warnings don't fire immediately
          try {
            (useAppStore.getState() as any).setLastAutoSaveAt?.(Date.now());
          } catch (_) {}
          console.log('[App] Restored last auto-saved project');
        }
      } catch (e) {
        console.warn('[App] Auto-restore failed:', e);
      }
    })();
  }, [loadFile, resumeAudioContext]);

  // Web-only: warn before leaving if changes haven't been auto-saved
  useEffect(() => {
    const isElectron = !!(window as any).electronAPI || 
      (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.electron);
    if (isElectron) return;

    const handler = (e: BeforeUnloadEvent) => {
      const store = useAppStore.getState() as any;
      const hasProject = !!store.audio?.file && !!store.audio?.isLoaded;
      if (!hasProject) return;

      // Respect settings (auto-save on/off)
      let autoSaveEnabled = true;
      try {
        const raw = localStorage.getItem('appSettings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.autoSaveEnabled === 'boolean') autoSaveEnabled = parsed.autoSaveEnabled;
        }
      } catch (_) {}

      const lastChangeAt = store.projectLastChangeAt || 0;
      const lastAutoSaveAt = store.lastAutoSaveAt || 0;
      const lastManualSaveAt = store.lastManualSaveAt || 0;
      const lastSaveAt = Math.max(lastAutoSaveAt, lastManualSaveAt);

      const hasUnsaved = lastChangeAt > 0 && lastSaveAt < lastChangeAt;
      if (!hasUnsaved) return;

      // If autosave is enabled, we still warn if it hasn't run since the last change
      // If autosave is disabled, always warn.
      if (!autoSaveEnabled || lastAutoSaveAt < lastChangeAt) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isInputFocused = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable="true"]');

      // Handle undo/redo shortcuts even when audio is not loaded (they work on markers)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        const { undo, redo, canUndo, canRedo } = useAppStore.getState();
        if (e.key === 'z' && !e.shiftKey) {
          // Ctrl+Z: Undo
          if (canUndo()) {
            undo();
            console.log('[App] Undo via keyboard shortcut');
          }
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          // Ctrl+Y or Ctrl+Shift+Z: Redo
          if (canRedo()) {
            redo();
            console.log('[App] Redo via keyboard shortcut');
          }
        }
        return;
      }

      // Only handle other shortcuts when audio is loaded and not typing
      if (!isAudioLoaded || isInputFocused) {
        return;
      }

      switch (e.key) {
        case ' ': // Space - Play/Pause
          e.preventDefault(); // Prevent page scroll
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          break;

        case 'Escape': // Escape - Stop
          e.preventDefault();
          stop();
          break;

        case 'ArrowLeft': // Left Arrow - Skip backward 5 seconds
          e.preventDefault();
          const currentTime = getCurrentTime();
          const newTimeBack = Math.max(0, currentTime - 5);
          seek(newTimeBack);
          break;

        case 'ArrowRight': // Right Arrow - Skip forward 5 seconds
          e.preventDefault();
          const currentTimeForward = getCurrentTime();
          const duration = useAppStore.getState().audio.duration;
          const newTimeForward = Math.min(duration, currentTimeForward + 5);
          seek(newTimeForward);
          break;

        case 'ArrowUp': // Up Arrow - Volume +10%
          e.preventDefault();
          // Volume range is -60 to +6 dB (66 dB total), 10% = 6.6 dB ≈ 7 dB
          const volumeUp = Math.min(6, currentVolume + 7);
          setVolume(volumeUp);
          setVolumeStore(volumeUp);
          break;

        case 'ArrowDown': // Down Arrow - Volume -10%
          e.preventDefault();
          // Volume range is -60 to +6 dB (66 dB total), 10% = 6.6 dB ≈ 7 dB
          const volumeDown = Math.max(-60, currentVolume - 7);
          setVolume(volumeDown);
          setVolumeStore(volumeDown);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAudioLoaded, isPlaying, currentVolume, play, pause, stop, seek, getCurrentTime, setVolume, setVolumeStore]);
  
  // Show/hide welcome screen based on audio loaded state
  // Don't show welcome when loading (user should see loading animation instead)
  useEffect(() => {
    if (isAudioLoaded) {
      setShowWelcome(false);
    } else if (!isLoading) {
      // Only show welcome screen when audio is TRULY unloaded (not loading)
      // e.g., after Close Audio, NOT when loading a new audio
      setShowWelcome(true);
    }
    // When isLoading is true, don't change showWelcome - let render logic handle it
  }, [isAudioLoaded, isLoading]);
  
  const handleAudioLoaded = () => {
    setShowWelcome(false);
  };

  const handleProjectLoaded = () => {
    setShowWelcome(false);
  };
  
  // Loading overlay component with blur background
  const LoadingOverlay = ({ withBlur = false }: { withBlur?: boolean }) => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: withBlur 
        ? 'rgba(10, 10, 10, 0.85)' 
        : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d1f0d 100%)',
      backdropFilter: withBlur ? 'blur(8px)' : 'none',
      WebkitBackdropFilter: withBlur ? 'blur(8px)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* Animated spinner with pulse */}
      <div style={{
        position: 'relative',
        width: '100px',
        height: '100px',
        marginBottom: '32px',
      }}>
        {/* Outer glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${KENYAN_GREEN}30 0%, transparent 70%)`,
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        
        {/* Spinner ring */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100px',
          height: '100px',
          border: `4px solid rgba(255,255,255,0.1)`,
          borderTop: `4px solid ${KENYAN_GREEN}`,
          borderRight: `4px solid ${KENYAN_RED}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        
        {/* Inner circle */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Wave icon */}
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2">
            <path d="M2 12h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-8a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-4a2 2 0 0 1 2-2h2"/>
          </svg>
        </div>
      </div>
      
      {/* Loading text */}
      <div style={{
        fontFamily: "'Merienda', cursive",
        fontSize: '1.6rem',
        color: '#ffffff',
        marginBottom: '12px',
        textShadow: `0 0 20px ${KENYAN_GREEN}40`,
      }}>
        {withBlur ? 'Loading New Audio...' : 'Loading Audio...'}
      </div>
      
      <div style={{
        fontFamily: "'Merienda', cursive",
        fontSize: '1rem',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: '24px',
      }}>
        Preparing waveform visualization
      </div>
      
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: KENYAN_GREEN,
              animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-12px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
  
  // Priority 1: Show loading overlay when loading (whether from welcome screen or main app)
  if (isLoading) {
    // If audio was already loaded before this load started, show blur
    // Otherwise show full-screen loading without blur
    return (
      <ErrorBoundary>
        <LoadingOverlay withBlur={false} />
      </ErrorBoundary>
    );
  }
  
  // Priority 2: Show welcome screen if no audio loaded
  if (showWelcome && !isAudioLoaded) {
    return (
      <ErrorBoundary>
        <WelcomeScreen 
          onAudioLoaded={handleAudioLoaded}
          onProjectLoaded={handleProjectLoaded}
        />
      </ErrorBoundary>
    );
  }
  
  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Menu Bar */}
        <div className="menu-bar-container">
          <MenuBar />
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Waveform + Marker Timeline Section (50% of screen) */}
          <div className="waveform-section">
            <ErrorBoundary>
              <Waveform />
            </ErrorBoundary>
            <ErrorBoundary>
              <MarkerTimeline />
            </ErrorBoundary>
          </div>

          {/* Two Panels Section */}
          <div className="panels-section">
            <div className="panel">
              <ErrorBoundary>
                <PlaybackPanel />
              </ErrorBoundary>
            </div>
            <div className="panel">
              <ErrorBoundary>
                <MarkerPanel />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Modals */}
        <SettingsModal />
        <HelpModal />
      </div>
    </ErrorBoundary>
  );
};

export default App;

