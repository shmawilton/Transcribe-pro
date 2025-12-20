import React, { useEffect } from 'react';
import MenuBar from './components/ui/MenuBar';
import Waveform from './components/audio/Waveform';
import MarkerTimeline from './components/markers/MarkerTimeline';
import PlaybackPanel from './components/controls/PlaybackPanel';
import GlobalControlsPanel from './components/controls/GlobalControlsPanel';
import MarkerPanel from './components/controls/MarkerPanel';
import SettingsModal from './components/ui/SettingsModal';
import HelpModal from './components/ui/HelpModal';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useAppStore } from './store/store';

const App: React.FC = () => {
  console.log('[App] Component rendering...');
  
  const theme = useAppStore((state) => state.theme);
  console.log('[App] Theme:', theme);

  // Initialize theme on mount
  useEffect(() => {
    console.log('[App] Setting theme attribute:', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  useEffect(() => {
    console.log('[App] Component mounted');
    return () => {
      console.log('[App] Component unmounting');
    };
  }, []);
  
  console.log('[App] About to render JSX');
  
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

