// MobileMenu.tsx - Collapsible Neumorphic Mobile Menu
// Simplified rod-shaped menu with essential quick actions

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/store';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';
import { getProjectSaver } from '../project/ProjectSaver';
import { getProjectLoader } from '../project/ProjectLoader';
import { showToast } from './Toast';
import { useSmoothViewport } from '../../hooks/useSmoothViewport';

// Kenyan colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';

// PWA install prompt interface
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const MobileMenu: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const zoomLevel = useAppStore((state) => state.zoomLevel) || 5; // Default to 5x zoom (20% view)
  const duration = useAppStore((state) => state.audio.duration) || 0;
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const canUndo = useAppStore((state) => state.canUndo);
  const canRedo = useAppStore((state) => state.canRedo);
  const setIsSettingsModalOpen = useAppStore((state) => state.setIsSettingsModalOpen);
  
  // Pitch and playback rate
  const pitch = useAppStore((state) => state.globalControls.pitch) || 0;
  const setPitch = useAppStore((state) => state.setPitch);
  const playbackRate = useAppStore((state) => state.globalControls.playbackRate) || 1;
  
  const { loadFile, resumeAudioContext } = useAudioEngine();
  const { animateZoom } = useSmoothViewport();
  
  // Neumorphic colors based on theme
  const neuBg = isLightMode ? '#e4ebf5' : '#1e1e1e';
  const shadowDark = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  const shadowLight = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(50, 50, 50, 0.3)';
  const textColor = isLightMode ? '#2d3748' : '#ffffff';
  
  const neuRaised = `3px 3px 6px ${shadowDark}, -2px -2px 4px ${shadowLight}`;
  const neuPressed = `inset 2px 2px 4px ${shadowDark}, inset -1px -1px 2px ${shadowLight}`;
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isExpanded]);
  
  // PWA Install prompt handler
  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
      return;
    }
    
    // Check localStorage for dismissed banner
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    
    // Only show banner again after 7 days if dismissed
    if (dismissedTime && daysSinceDismissed < 7) {
      return;
    }
    
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show install banner after 3 seconds
      setTimeout(() => {
        setShowInstallBanner(true);
      }, 3000);
    };
    
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      showToast('App installed successfully!', 'success');
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // Handle PWA install
  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      showToast('Install not available - try from browser menu', 'info');
      return;
    }
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        showToast('Installing app...', 'success');
      }
      
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } catch (err) {
      showToast('Install failed', 'error');
    }
  };
  
  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };
  
  // Zoom handlers - minimum zoom is 5 (1/5 = 20% view)
  const MIN_ZOOM = 5; // Shows 1/5 (20%) of the audio at minimum
  const MAX_ZOOM = 50;
  
  const handleZoomIn = () => {
    if (!isAudioLoaded || !duration) return;
    const currentZoom = typeof zoomLevel === 'number' && !isNaN(zoomLevel) ? zoomLevel : MIN_ZOOM;
    const newZoom = Math.min(currentZoom * 1.5, MAX_ZOOM);
    animateZoom(newZoom, { duration: 300, easing: 'easeOutCubic' });
  };
  
  const handleZoomOut = () => {
    if (!isAudioLoaded || !duration) return;
    const currentZoom = typeof zoomLevel === 'number' && !isNaN(zoomLevel) ? zoomLevel : MIN_ZOOM;
    const newZoom = Math.max(currentZoom / 1.5, MIN_ZOOM);
    animateZoom(newZoom, { duration: 300, easing: 'easeOutCubic' });
  };
  
  const handleZoomReset = () => {
    if (!isAudioLoaded || !duration) return;
    // Reset to minimum (1/4 view) on mobile
    animateZoom(MIN_ZOOM, { duration: 300, easing: 'easeOutCubic' });
  };
  
  // Pitch handlers - matching desktop behavior (±2 semitones range, 0.1 step)
  const handlePitchUp = () => {
    if (!isAudioLoaded) return;
    const newPitch = Math.min(Math.round((pitch + 0.1) * 10) / 10, 2);
    setPitch(newPitch);
  };
  
  const handlePitchDown = () => {
    if (!isAudioLoaded) return;
    const newPitch = Math.max(Math.round((pitch - 0.1) * 10) / 10, -2);
    setPitch(newPitch);
  };
  
  const handlePitchReset = () => {
    if (!isAudioLoaded) return;
    setPitch(0);
  };
  
  // Format pitch display like desktop
  const formatPitchDisplay = (value: number): string => {
    if (value === 0) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };
  
  const handleNewProject = async () => {
    try {
      const store = useAppStore.getState();
      store.resetProject();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) store.toggleMute();
      // Start with 20% view (zoom 5) on all devices
      store.setZoomLevel(5);
      
      await resumeAudioContext();
      const file = await pickAudioFile();
      if (!file) return;
      
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        showToast(validation.error || 'Invalid file', 'error');
        return;
      }
      
      await loadFile(file);
      setIsExpanded(false);
      showToast('Audio loaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    }
  };
  
  const handleLoadProject = async () => {
    try {
      await resumeAudioContext();
      const loader = getProjectLoader();
      const loaded = await loader.loadProject(loadFile);
      if (loaded) {
        setIsExpanded(false);
        showToast('Project loaded', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    }
  };
  
  const handleSaveProject = async () => {
    try {
      const saver = getProjectSaver();
      // On mobile, use saveToDevice for better UX (saves to IndexedDB)
      const result = await saver.saveToDevice();
      if (result.success) {
        showToast('Project saved to device!', 'success');
        setIsExpanded(false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  };
  
  const handleExportProject = async () => {
    try {
      const saver = getProjectSaver();
      const success = await saver.exportProject();
      if (success) {
        setIsExpanded(false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export', 'error');
    }
  };
  
  // Get safe zoom display value
  const zoomDisplay = typeof zoomLevel === 'number' && !isNaN(zoomLevel) && isFinite(zoomLevel)
    ? Math.round(zoomLevel * 100)
    : 100;
  
  // Compact button style
  const btnStyle = (isActive: boolean = false, isDisabled: boolean = false) => ({
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: neuBg,
    boxShadow: isActive ? neuPressed : neuRaised,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    color: textColor,
    touchAction: 'manipulation' as const,
    padding: 0,
  });

  return (
    <div 
      ref={menuRef}
      style={{
        position: 'fixed',
        top: '6px',
        left: '6px',
        right: '6px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {/* Main Menu Bar - Compact */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4px',
        padding: '4px 8px',
        background: neuBg,
        borderRadius: '12px',
        boxShadow: neuRaised,
      }}>
        {/* Left: Hamburger */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            ...btnStyle(isExpanded),
            width: '36px',
            height: '36px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isExpanded ? KENYAN_GREEN : textColor} strokeWidth="2.5" strokeLinecap="round">
            {isExpanded ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </button>
        
        {/* Center: Essential actions */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* Undo */}
          <button
            onClick={() => canUndo() && undo()}
            disabled={!canUndo()}
            style={btnStyle(false, !canUndo())}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
            </svg>
          </button>
          
          {/* Redo */}
          <button
            onClick={() => canRedo() && redo()}
            disabled={!canRedo()}
            style={btnStyle(false, !canRedo())}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
          </button>
          
          {/* Settings - Sliders icon for clearer meaning */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            style={btnStyle()}
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <circle cx="4" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="10" r="2" fill="currentColor" />
              <circle cx="20" cy="14" r="2" fill="currentColor" />
            </svg>
          </button>
        </div>
        
        {/* Right: Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            ...btnStyle(),
            width: '36px',
            height: '36px',
          }}
        >
          {isLightMode ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
              <path d="M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13z"/>
            </svg>
          )}
        </button>
      </div>
      
      {/* Expanded Menu Panel */}
      {isExpanded && (
        <div style={{
          background: neuBg,
          borderRadius: '12px',
          boxShadow: neuRaised,
          padding: '8px',
          maxHeight: '70vh',
          overflowY: 'auto',
          animation: 'slideDown 0.15s ease-out',
        }}>
          {/* File Section */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ 
              fontSize: '9px', 
              fontWeight: 700, 
              color: KENYAN_GREEN, 
              padding: '2px 10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              File
            </div>
            
            <MenuItem icon={<NewFileIcon />} label="New Project" onClick={handleNewProject} color={KENYAN_GREEN} />
            <MenuItem icon={<FolderIcon />} label="Load Project" onClick={handleLoadProject} color={KENYAN_RED} />
            <MenuItem icon={<SaveIcon />} label="Save to Device" onClick={handleSaveProject} disabled={!isAudioLoaded} color={KENYAN_GREEN} />
            <MenuItem icon={<ExportIcon />} label="Export/Share" onClick={handleExportProject} disabled={!isAudioLoaded} subtitle="Download .tsproj file" />
          </div>
          
          {/* View Section - Zoom controls */}
          <Divider isLightMode={isLightMode} />
          <div style={{ marginBottom: '6px' }}>
            <div style={{ 
              fontSize: '9px', 
              fontWeight: 700, 
              color: KENYAN_GREEN, 
              padding: '2px 10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              View
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '6px 10px',
              gap: '8px',
            }}>
              <span style={{ fontSize: '12px', color: textColor, fontWeight: 500 }}>Zoom</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handleZoomOut}
                  disabled={!isAudioLoaded || zoomLevel <= MIN_ZOOM}
                  style={btnStyle(false, !isAudioLoaded || zoomLevel <= MIN_ZOOM)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: KENYAN_GREEN,
                  minWidth: '40px',
                  textAlign: 'center',
                }}>
                  {zoomDisplay}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={!isAudioLoaded || zoomLevel >= MAX_ZOOM}
                  style={btnStyle(false, !isAudioLoaded || zoomLevel >= MAX_ZOOM)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={handleZoomReset}
                  disabled={!isAudioLoaded}
                  style={{ 
                    ...btnStyle(false, !isAudioLoaded),
                    fontSize: '9px',
                    fontWeight: 600,
                    width: 'auto',
                    padding: '0 6px',
                  }}
                >
                  1/4
                </button>
              </div>
            </div>
          </div>
          
          {/* Audio Controls - Pitch */}
          <Divider isLightMode={isLightMode} />
          <div style={{ marginBottom: '6px' }}>
            <div style={{ 
              fontSize: '9px', 
              fontWeight: 700, 
              color: KENYAN_GREEN, 
              padding: '2px 10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Audio
            </div>
            
            {/* Pitch Control */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '6px 10px',
              gap: '8px',
            }}>
              <span style={{ fontSize: '12px', color: textColor, fontWeight: 500 }}>Pitch</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handlePitchDown}
                  disabled={!isAudioLoaded || pitch <= -2}
                  style={btnStyle(false, !isAudioLoaded || pitch <= -2)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: pitch !== 0 ? (pitch > 0 ? KENYAN_GREEN : KENYAN_RED) : textColor,
                  minWidth: '48px',
                  textAlign: 'center',
                }}>
                  {formatPitchDisplay(pitch)}
                </span>
                <button
                  onClick={handlePitchUp}
                  disabled={!isAudioLoaded || pitch >= 2}
                  style={btnStyle(false, !isAudioLoaded || pitch >= 2)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={handlePitchReset}
                  disabled={!isAudioLoaded || pitch === 0}
                  style={{ 
                    ...btnStyle(false, !isAudioLoaded || pitch === 0),
                    fontSize: '9px',
                    fontWeight: 600,
                    width: 'auto',
                    padding: '0 6px',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
            
            {/* Speed Display */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '6px 10px',
              gap: '8px',
            }}>
              <span style={{ fontSize: '12px', color: textColor, fontWeight: 500 }}>Speed</span>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: playbackRate !== 1 ? KENYAN_RED : textColor,
              }}>
                {playbackRate.toFixed(1)}x
              </span>
            </div>
          </div>
          
          {/* Install App - Only show if installable and not already installed */}
          {!isAppInstalled && deferredPrompt && (
            <>
              <Divider isLightMode={isLightMode} />
              <MenuItem 
                icon={<InstallIcon />} 
                label="Install App" 
                onClick={handleInstallApp}
                color={KENYAN_GREEN}
                subtitle="Add to home screen"
              />
            </>
          )}
          
          {/* About */}
          <Divider isLightMode={isLightMode} />
          <MenuItem 
            icon={<InfoIcon />} 
            label="About" 
            onClick={() => {
              showToast('Transcription Pro v1.0 - Made in Kenya 🇰🇪', 'success');
              setIsExpanded(false);
            }} 
          />
        </div>
      )}
      
      {/* PWA Install Banner - Floating notification */}
      {showInstallBanner && !isAppInstalled && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '16px',
          right: '16px',
          background: neuBg,
          borderRadius: '16px',
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), ${neuRaised}`,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 10001,
          animation: 'slideUp 0.3s ease-out',
        }}>
          {/* App icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${KENYAN_GREEN}, ${KENYAN_RED})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          
          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ 
              color: textColor, 
              fontSize: '14px', 
              fontWeight: 600, 
              margin: 0 
            }}>
              Install Transcribe Pro
            </p>
            <p style={{ 
              color: isLightMode ? '#718096' : 'rgba(255,255,255,0.6)', 
              fontSize: '12px', 
              margin: '4px 0 0 0' 
            }}>
              Add to home screen for quick access
            </p>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={dismissInstallBanner}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: isLightMode ? '#718096' : 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Later
            </button>
            <button
              onClick={handleInstallApp}
              style={{
                padding: '8px 16px',
                background: KENYAN_GREEN,
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: `0 2px 8px rgba(0, 102, 68, 0.4)`,
              }}
            >
              Install
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// Helper Components
const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  subtitle?: string;
}> = ({ icon, label, onClick, disabled, color, subtitle }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 10px',
      background: 'transparent',
      border: 'none',
      borderRadius: '8px',
      width: '100%',
      color: color || 'inherit',
      fontSize: '13px',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      touchAction: 'manipulation',
      textAlign: 'left',
    }}
  >
    {icon}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span>{label}</span>
      {subtitle && (
        <span style={{ 
          fontSize: '10px', 
          opacity: 0.6, 
          fontWeight: 400,
          marginTop: '1px',
        }}>
          {subtitle}
        </span>
      )}
    </div>
  </button>
);

const Divider: React.FC<{ isLightMode: boolean }> = ({ isLightMode }) => (
  <div style={{ 
    height: '1px', 
    background: isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
    margin: '4px 10px',
  }} />
);

// Icons
const NewFileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const InstallIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default MobileMenu;
