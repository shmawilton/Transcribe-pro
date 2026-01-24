// MobileControlsPanel.tsx - Compact zoom and pitch controls for mobile
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/store';
import { useSmoothViewport } from '../../hooks/useSmoothViewport';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';

const MobileControlsPanel: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const isAudioLoaded = useAppStore((state) => state.audio.isLoaded);
  const duration = useAppStore((state) => state.audio.duration) || 0;
  const currentTime = useAppStore((state) => state.audio.currentTime || 0);
  const viewportStart = useAppStore((state) => state.ui.viewportStart);
  const viewportEnd = useAppStore((state) => state.ui.viewportEnd);
  const rawZoomLevel = useAppStore((state) => state.zoomLevel);
  const pitch = useAppStore((state) => state.globalControls.pitch);
  const setPitch = useAppStore((state) => state.setPitch);
  
  const { animateZoom } = useSmoothViewport();
  
  // Safe zoom level
  const zoomLevel = (typeof rawZoomLevel === 'number' && !isNaN(rawZoomLevel) && isFinite(rawZoomLevel))
    ? rawZoomLevel : 1;
  
  // Neumorphic colors
  const neuBg = isLightMode ? '#e4ebf5' : '#1e1e1e';
  const shadowDark = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  const shadowLight = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(50, 50, 50, 0.3)';
  const textColor = isLightMode ? '#2d3748' : '#ffffff';
  
  const neuRaised = `2px 2px 4px ${shadowDark}, -1px -1px 2px ${shadowLight}`;
  const neuPressed = `inset 1px 1px 2px ${shadowDark}, inset -1px -1px 2px ${shadowLight}`;
  
  // Zoom handlers - same as desktop version
  const handleZoomIn = () => {
    if (duration <= 0) return;
    const newZoom = Math.min(zoomLevel * 1.5, 8); // Same max zoom as desktop
    animateZoom(newZoom, currentTime, { duration: 250, easing: 'easeOutCubic' });
  };
  
  const handleZoomOut = () => {
    if (duration <= 0) return;
    const newZoom = Math.max(zoomLevel / 1.5, 1);
    const center = newZoom === 1 ? undefined : (viewportStart + viewportEnd) / 2;
    animateZoom(newZoom, center, { duration: 250, easing: 'easeOutCubic' });
  };
  
  const handleZoomReset = () => {
    if (duration > 0) {
      animateZoom(1, undefined, { duration: 300, easing: 'easeOutCubic' });
    }
  };
  
  // Pitch handlers
  const handlePitchUp = () => {
    const newPitch = Math.min(pitch + 1, 2);
    setPitch(newPitch);
  };
  
  const handlePitchDown = () => {
    const newPitch = Math.max(pitch - 1, -2);
    setPitch(newPitch);
  };
  
  const handlePitchReset = () => {
    setPitch(0);
  };
  
  const zoomDisplay = Math.round(zoomLevel * 100);
  const pitchDisplay = pitch > 0 ? `+${pitch}` : pitch.toString();
  
  const btnStyle = (disabled: boolean = false) => ({
    width: '26px',
    height: '26px',
    minWidth: '26px',
    borderRadius: '5px',
    border: 'none',
    background: neuBg,
    boxShadow: neuRaised,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    color: textColor,
    touchAction: 'manipulation' as const,
    padding: 0,
    fontSize: '12px',
    fontWeight: 600 as const,
  });
  
  const valueStyle = {
    fontSize: '10px',
    fontWeight: 600 as const,
    minWidth: '32px',
    textAlign: 'center' as const,
    color: KENYAN_GREEN,
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      height: '100%',
      width: '100%',
      padding: '2px 4px',
      boxSizing: 'border-box',
    }}>
      {/* Zoom Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        background: neuBg,
        borderRadius: '6px',
        padding: '2px 4px',
        boxShadow: neuPressed,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '10px', marginRight: '1px' }}>🔍</span>
        <button
          onClick={handleZoomOut}
          disabled={!isAudioLoaded || zoomLevel <= 1}
          style={btnStyle(!isAudioLoaded || zoomLevel <= 1)}
          title="Zoom Out"
        >
          −
        </button>
        <span style={valueStyle}>{zoomDisplay}%</span>
        <button
          onClick={handleZoomIn}
          disabled={!isAudioLoaded || zoomLevel >= 8}
          style={btnStyle(!isAudioLoaded || zoomLevel >= 8)}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomReset}
          disabled={!isAudioLoaded || zoomLevel === 1}
          style={{ ...btnStyle(!isAudioLoaded || zoomLevel === 1), fontSize: '9px', fontWeight: 700 }}
          title="Reset"
        >
          1x
        </button>
      </div>
      
      {/* Pitch Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        background: neuBg,
        borderRadius: '6px',
        padding: '2px 4px',
        boxShadow: neuPressed,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '10px', marginRight: '1px' }}>🎵</span>
        <button
          onClick={handlePitchDown}
          disabled={!isAudioLoaded || pitch <= -2}
          style={btnStyle(!isAudioLoaded || pitch <= -2)}
          title="Lower Pitch"
        >
          ↓
        </button>
        <span style={{ ...valueStyle, color: pitch !== 0 ? KENYAN_RED : KENYAN_GREEN }}>
          {pitchDisplay}
        </span>
        <button
          onClick={handlePitchUp}
          disabled={!isAudioLoaded || pitch >= 2}
          style={btnStyle(!isAudioLoaded || pitch >= 2)}
          title="Raise Pitch"
        >
          ↑
        </button>
        <button
          onClick={handlePitchReset}
          disabled={!isAudioLoaded || pitch === 0}
          style={{ ...btnStyle(!isAudioLoaded || pitch === 0), fontSize: '9px', fontWeight: 700 }}
          title="Reset"
        >
          0
        </button>
      </div>
    </div>
  );
};

export default MobileControlsPanel;
