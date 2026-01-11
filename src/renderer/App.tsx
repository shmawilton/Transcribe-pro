import React, { useEffect, useState } from 'react';
import MenuBar from './components/ui/MenuBar';
import Waveform from './components/audio/Waveform';
import MarkerTimeline from './components/markers/MarkerTimeline';
import PlaybackPanel from './components/controls/PlaybackPanel';
import GlobalControlsPanel from './components/controls/GlobalControlsPanel';
import MarkerPanel from './components/controls/MarkerPanel';
import SettingsModal from './components/ui/SettingsModal';
import HelpModal from './components/ui/HelpModal';
import WelcomeScreen from './components/ui/WelcomeScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useAppStore } from './store/store';
import { useAudioEngine } from './components/audio/useAudioEngine';

// Kenyan colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';

const App: React.FC = () => {
  console.log('[App] Component rendering...');
  
  const theme = useAppStore((state) => state.theme);
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const isLoading = useAppStore((state) => state.audio.isLoading); // Use global store
  const [showWelcome, setShowWelcome] = useState(true);
  
  // Initialize audio engine (but don't use its local loading state)
  useAudioEngine();
  
  console.log('[App] Theme:', theme, 'Audio loaded:', isAudioLoaded, 'Loading:', isLoading);

  // Initialize theme on mount
  useEffect(() => {
    console.log('[App] Setting theme attribute:', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
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
  
  useEffect(() => {
    console.log('[App] Component mounted');
    return () => {
      console.log('[App] Component unmounting');
    };
  }, []);
  
  const handleAudioLoaded = () => {
    setShowWelcome(false);
  };
  
  console.log('[App] About to render JSX, showWelcome:', showWelcome, 'isAudioLoaded:', isAudioLoaded, 'isLoading:', isLoading);
  
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
        <WelcomeScreen onAudioLoaded={handleAudioLoaded} />
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

          {/* Three Panels Section */}
          <div className="panels-section">
            <div className="panel">
              <ErrorBoundary>
                <PlaybackPanel />
              </ErrorBoundary>
            </div>
            <div className="panel">
              <ErrorBoundary>
                <GlobalControlsPanel />
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

