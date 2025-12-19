import React, { useEffect } from 'react';
import MenuBar from './components/ui/MenuBar';
import Waveform from './components/audio/Waveform';
import MarkerTimeline from './components/markers/MarkerTimeline';
import PlaybackPanel from './components/controls/PlaybackPanel';
import GlobalControlsPanel from './components/controls/GlobalControlsPanel';
import MarkerPanel from './components/controls/MarkerPanel';
import SettingsModal from './components/ui/SettingsModal';
import HelpModal from './components/ui/HelpModal';
import { useAppStore } from './store/store';

const App: React.FC = () => {
  const theme = useAppStore((state) => state.theme);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return (
    <div className="app-container">
      {/* Menu Bar */}
      <div className="menu-bar-container">
        <MenuBar />
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Waveform + Marker Timeline Section (50% of screen) */}
        <div className="waveform-section">
          <Waveform />
          <MarkerTimeline />
        </div>

        {/* Three Panels Section */}
        <div className="panels-section">
          <div className="panel">
            <PlaybackPanel />
          </div>
          <div className="panel">
            <GlobalControlsPanel />
          </div>
          <div className="panel">
            <MarkerPanel />
          </div>
        </div>
      </div>

      {/* Modals */}
      <SettingsModal />
      <HelpModal />
    </div>
  );
};

export default App;

