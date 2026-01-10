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

const App: React.FC = () => {
  console.log('[App] Component rendering...');
  
  const theme = useAppStore((state) => state.theme);
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const [showWelcome, setShowWelcome] = useState(true);
  
  console.log('[App] Theme:', theme, 'Audio loaded:', isAudioLoaded);

  // Initialize theme on mount
  useEffect(() => {
    console.log('[App] Setting theme attribute:', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Show/hide welcome screen based on audio loaded state
  useEffect(() => {
    if (isAudioLoaded) {
      setShowWelcome(false);
    } else {
      // Show welcome screen when audio is unloaded (e.g., after Close Audio)
      setShowWelcome(true);
    }
  }, [isAudioLoaded]);
  
  useEffect(() => {
    console.log('[App] Component mounted');
    return () => {
      console.log('[App] Component unmounting');
    };
  }, []);
  
  const handleAudioLoaded = () => {
    setShowWelcome(false);
  };
  
  console.log('[App] About to render JSX, showWelcome:', showWelcome, 'isAudioLoaded:', isAudioLoaded);
  
  // Show welcome screen if no audio is loaded
  if (showWelcome || !isAudioLoaded) {
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

