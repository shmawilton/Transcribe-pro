// StatusBar.tsx - Status bar component showing file info, markers count, zoom level
import React from 'react';
import { useAppStore } from '../../store/store';

const KENYAN_GREEN = '#006644';
const KENYAN_RED = '#DE2910';
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

const StatusBar: React.FC = () => {
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const audio = useAppStore((state) => state.audio);
  const markers = useAppStore((state) => state.markers);
  const zoomLevel = useAppStore((state) => state.ui.zoomLevel);
  const currentTime = useAppStore((state) => state.audio.currentTime);
  const duration = useAppStore((state) => state.audio.duration);
  const projectLastChangeAt = useAppStore((state) => state.projectLastChangeAt);
  const lastAutoSaveAt = useAppStore((state) => state.lastAutoSaveAt);
  const lastManualSaveAt = useAppStore((state) => state.lastManualSaveAt);

  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const bgColor = isLightMode 
    ? 'rgba(255, 255, 255, 0.95)'
    : 'rgba(26, 26, 26, 0.95)';
  const borderColor = isLightMode 
    ? 'rgba(0, 0, 0, 0.1)'
    : 'rgba(255, 255, 255, 0.1)';

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const fileSize = audio.file?.size || 0;
  const fileName = audio.file?.name || 'No file loaded';
  const markersCount = markers.length;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '28px',
        background: bgColor,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        fontSize: '0.75rem',
        fontFamily: HANDWRITTEN_FONT,
        zIndex: 999998,
        boxShadow: isLightMode
          ? '0 -2px 10px rgba(0, 0, 0, 0.05)'
          : '0 -2px 10px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Left side - File info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: textColor, opacity: 0.7 }}>📄</span>
          <span style={{ color: textColor, fontWeight: '500' }}>
            {fileName.length > 30 ? `${fileName.substring(0, 30)}...` : fileName}
          </span>
          {fileSize > 0 && (
            <span style={{ color: textColor, opacity: 0.6 }}>
              ({formatFileSize(fileSize)})
            </span>
          )}
        </div>
        {audio.isLoaded && duration > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: textColor, opacity: 0.7 }}>⏱️</span>
            <span style={{ color: textColor }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        )}
      </div>

      {/* Center - Save status */}
      {audio.isLoaded && (() => {
        const hasUnsavedChanges = projectLastChangeAt > Math.max(lastAutoSaveAt, lastManualSaveAt);
        const statusColor = hasUnsavedChanges ? KENYAN_RED : KENYAN_GREEN;
        const statusText = hasUnsavedChanges ? 'Unsaved changes' : 'Saved';
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}80`,
              }}
            />
            <span style={{ color: textColor, fontWeight: '500', fontSize: '0.75rem' }}>
              {statusText}
            </span>
          </div>
        );
      })()}

      {/* Right side - Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: KENYAN_GREEN, opacity: 0.7 }}>
            <path d="M2.5 0A2.5 2.5 0 0 0 0 2.5v11A2.5 2.5 0 0 0 2.5 16h11a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 13.5 0h-11ZM1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11Z"/>
            <path d="M5 4.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-7Z"/>
          </svg>
          <span style={{ color: KENYAN_GREEN, fontWeight: '600' }}>
            {markersCount} {markersCount === 1 ? 'marker' : 'markers'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: textColor, opacity: 0.7 }}>
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <span style={{ color: textColor, fontWeight: '500' }}>
            {zoomLevel.toFixed(1)}x
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
