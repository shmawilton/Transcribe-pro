// MarkerPanel.tsx - Julius - Week 2-3
// Marker management panel (List + Editor)

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/store';
import { MarkerManager } from '../markers/MarkerManager';
import { Marker } from '../../types/types';
import { useAudioEngine } from '../audio/useAudioEngine';
import { useMarkerSpeedControl } from '../markers/useMarkerSpeedControl';

/**
 * Format time as MM:SS for display
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "1:30", "0:05")
 */
const formatTime = (seconds: number): string => {
  if (seconds === undefined || seconds === null || isNaN(seconds) || !isFinite(seconds)) {
    return '0:00';
  }
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.floor(Math.max(0, seconds) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculate marker duration in seconds
 * @param marker - Marker object
 * @returns Duration in seconds
 */
const getMarkerDuration = (marker: Marker): number => {
  return marker.end - marker.start;
};

/**
 * Parse MM:SS format to seconds
 * @param timeStr - Time string in MM:SS format
 * @returns Time in seconds
 */
const parseTimeString = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const mins = parseInt(parts[0]) || 0;
  const secs = parseFloat(parts[1]) || 0;
  return mins * 60 + secs;
};

const MarkerPanel: React.FC = () => {
  // TASK 10: Read markers from store
  // Use useStore hook to subscribe to markers array. Component will re-render when markers change.
  const markers = useAppStore((state) => state.markers);
  const selectedMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const theme = useAppStore((state) => state.theme);
  const isLightMode = theme === 'light';
  const duration = useAppStore((state) => state.audio.duration || 0);

  // TASK 13: Get AudioEngine methods for applying marker settings
  const { setSpeed, seek } = useAudioEngine();
  
  // Use hook to apply marker speed only within marker range
  useMarkerSpeedControl();

  // State for editing markers
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    speed: number;
    loop: boolean;
    start: number;
    end: number;
  } | null>(null);

  // Get marker creation request setter
  const setRequestMarkerCreation = useAppStore((state) => state.setRequestMarkerCreation);

  // TASK 14: Ref for scrolling active marker into view
  const activeMarkerRef = useRef<HTMLDivElement>(null);

  // TASK 14: Scroll active marker into view when it changes
  useEffect(() => {
    if (selectedMarkerId && activeMarkerRef.current) {
      activeMarkerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedMarkerId]);

  // TASK 15: Keyboard shortcut for marker creation (M key)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input field
      if (e.key === 'm' || e.key === 'M') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          if (duration > 0) {
            setRequestMarkerCreation(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [duration, setRequestMarkerCreation]);

  // TASK 10: Sort markers - Display in chronological order (by start time)
  // Helps users find markers in order they appear in audio
  const sortedMarkers = useMemo(() => {
    return MarkerManager.getAllMarkers();
  }, [markers]);

  // Theme-aware colors
  const textColor = isLightMode ? '#1a1a1a' : '#FFFFFF';
  const textSecondary = isLightMode ? '#666666' : '#AAAAAA';
  const bgPrimary = isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 15, 15, 0.95)';
  const glassBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.3)';
  const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const itemBg = isLightMode ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)';
  const itemHoverBg = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';
  const selectedBg = isLightMode ? 'rgba(0, 102, 68, 0.15)' : 'rgba(0, 102, 68, 0.25)';
  
  // Active marker border color (neutral, no gold/yellow)
  const activeBorderColor = isLightMode ? '#006644' : '#00AA66';

  // TASK 13: Click handler to activate marker
  // Clicking anywhere on a marker list item makes it the active marker
  // Always seeks to marker start when clicked
  const handleMarkerClick = useCallback(
    async (marker: Marker) => {
      try {
        // TASK 13: Call MarkerManager's setActiveMarker method
        // This updates store with new active ID
        // Speed is now handled by useMarkerSpeedControl hook based on playback position
        // Always seek to marker start when clicking on it
        await MarkerManager.setActiveMarker(marker.id, {
          seekToMarker: true, // Always seek to marker start when clicking
          audioEngine: {
            seek, // Seek to marker start
            // Speed is handled by useMarkerSpeedControl hook
          },
        });
      } catch (error) {
        console.error('[MarkerPanel] Error activating marker:', error);
      }
    },
    [seek]
  );

  // Handle deactivate marker with smooth animation
  const handleDeactivateMarker = useCallback(() => {
    // Add smooth transition by animating the deactivation
    const markerPanel = document.querySelector('.marker-panel');
    if (markerPanel) {
      markerPanel.style.transition = 'all 0.3s ease';
    }
    
    // Reset speed to normal smoothly
    setSpeed(1.0);
    
    // Clear active marker after a brief delay for smooth visual transition
    setTimeout(() => {
      const store = useAppStore.getState();
      store.setSelectedMarkerId(null);
      console.log('[MarkerPanel] Marker deactivated, speed reset to 1.0x');
    }, 50);
  }, [setSpeed]);

  // TASK 15: Handle Create Marker button click
  // Triggers marker creation form in MarkerTimeline (same as clicking on timeline)
  const handleCreateButtonClick = useCallback(() => {
    if (duration > 0) {
      setRequestMarkerCreation(true);
    }
  }, [duration, setRequestMarkerCreation]);

  // Handle editing marker
  const handleStartEdit = useCallback((marker: Marker, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent marker activation
    setEditingMarkerId(marker.id);
    setEditFormData({
      speed: marker.speed !== undefined ? marker.speed : 1.0,
      loop: marker.loop === true,
      start: marker.start,
      end: marker.end,
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMarkerId(null);
    setEditFormData(null);
  }, []);

  const handleSaveEdit = useCallback((markerId: string) => {
    if (!editFormData) return;

    try {
      const marker = MarkerManager.getMarker(markerId);
      if (!marker) return;

      // Update marker using MarkerManager
      MarkerManager.updateMarker(markerId, {
        speed: editFormData.speed,
        loop: editFormData.loop,
        start: editFormData.start,
        end: editFormData.end,
      });

      setEditingMarkerId(null);
      setEditFormData(null);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Cannot update marker: ${error.message}`);
      }
    }
  }, [editFormData]);

  // Handle delete marker with confirmation
  const handleDeleteMarker = useCallback((marker: Marker, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent marker activation
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Delete marker "${marker.name}"?\n\nThis cannot be undone.`
    );
    
    if (confirmed) {
      try {
        MarkerManager.deleteMarker(marker.id);
        // If we were editing this marker, cancel edit mode
        if (editingMarkerId === marker.id) {
          setEditingMarkerId(null);
          setEditFormData(null);
        }
      } catch (error) {
        if (error instanceof Error) {
          alert(`Cannot delete marker: ${error.message}`);
        }
      }
    }
  }, [editingMarkerId]);

  // Keyboard shortcut: Delete key to delete active marker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedMarkerId) {
          const marker = MarkerManager.getMarker(selectedMarkerId);
          if (marker) {
            handleDeleteMarker(marker, e as any);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMarkerId, handleDeleteMarker]);

  return (
    <div
      className="marker-panel"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: bgPrimary,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: `1px solid ${borderColor}`,
          background: glassBg,
        }}
      >
        <div
          style={{
            color: textColor,
            fontSize: '1rem',
            fontWeight: '600',
          }}
        >
          Markers ({sortedMarkers.length})
        </div>

        {/* Button group: Create and Deactivate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* General Deactivate Button - Only visible when a marker is active */}
          {selectedMarkerId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeactivateMarker();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                padding: 0,
                background: isLightMode ? '#FFFFFF' : '#1a1a1a',
                color: isLightMode ? '#000000' : '#FFFFFF',
                border: `2px solid ${isLightMode ? '#000000' : '#FFFFFF'}`,
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isLightMode 
                  ? '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                opacity: 1,
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.boxShadow = isLightMode
                  ? '0 4px 12px rgba(255, 68, 68, 0.3), 0 0 0 1px rgba(255, 68, 68, 0.2)'
                  : '0 4px 12px rgba(255, 68, 68, 0.5), 0 0 0 1px rgba(255, 68, 68, 0.3)';
                e.currentTarget.style.borderColor = '#FF4444';
                e.currentTarget.style.color = '#FF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = isLightMode
                  ? '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                  : '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = isLightMode ? '#000000' : '#FFFFFF';
                e.currentTarget.style.color = isLightMode ? '#000000' : '#FFFFFF';
              }}
              title="Deactivate marker (return to normal speed)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: 'all 0.3s ease' }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
          )}

          {/* TASK 15: Create Marker Icon Button - White/Black/Grey Bubble Style */}
          <button
            onClick={handleCreateButtonClick}
            disabled={duration <= 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            padding: 0,
            background: duration > 0 
              ? (isLightMode ? '#FFFFFF' : '#1a1a1a')
              : (isLightMode ? 'rgba(200, 200, 200, 0.3)' : 'rgba(100, 100, 100, 0.3)'),
            color: duration > 0 
              ? (isLightMode ? '#000000' : '#FFFFFF')
              : (isLightMode ? '#999999' : '#666666'),
            border: `2px solid ${duration > 0 
              ? (isLightMode ? '#000000' : '#FFFFFF')
              : (isLightMode ? '#CCCCCC' : '#666666')}`,
            borderRadius: '50%',
            cursor: duration > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            opacity: duration > 0 ? 1 : 0.6,
            boxShadow: duration > 0 
              ? (isLightMode 
                  ? '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)')
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (duration > 0) {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.boxShadow = isLightMode
                ? '0 4px 12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.1)'
                : '0 4px 12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (duration > 0) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = isLightMode
                ? '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                : '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
            }
          }}
          title={duration > 0 ? 'Create new marker (M)' : 'Load audio file first'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        </div>
      </div>

      {/* TASK 10: Vertical scrollable list with custom scrollbar */}
      {/* TASK 20: Scroll Handling - Panel has fixed height, enables scrolling when markers don't fit */}
      <div
        className="marker-list-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0.5rem',
          maxHeight: 'calc(100% - 60px)', // Leave room for header
          minHeight: 0,
        }}
      >
        {/* TASK 19: Empty State - Special UI when no markers exist */}
        {sortedMarkers.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
              color: textSecondary,
              fontSize: '0.9rem',
              textAlign: 'center',
              minHeight: '150px',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: textColor,
                marginBottom: '0.75rem',
                opacity: 0.9,
              }}
            >
              No markers yet
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                opacity: 0.8,
                lineHeight: 1.6,
                maxWidth: '280px',
              }}
            >
              You haven't created any markers.
              <br />
              <br />
              Click the + button above or drag on the timeline to add your first marker.
            </div>
          </div>
        )}

        {/* TASK 10: Map over markers array */}
        {/* Loop through each marker, creating a list item for each one. Use marker.id as the React key. */}
        {sortedMarkers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;
          const duration = getMarkerDuration(marker);
          const markerSpeed = marker.speed !== undefined ? marker.speed : 1.0;
          const hasLoop = marker.loop === true;

          return (
            <div
              key={marker.id}
              ref={isSelected ? activeMarkerRef : null} // TASK 14: Ref for scrolling into view
              style={{
                // Compact horizontal layout with proper spacing
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                // Active marker highlighting - Neutral border, slightly lighter background
                background: isSelected
                  ? isLightMode
                    ? 'rgba(0, 102, 68, 0.1)'
                    : 'rgba(0, 170, 102, 0.15)'
                  : itemBg,
                border: isSelected
                  ? `3px solid ${activeBorderColor}`
                  : `1px solid ${borderColor}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', // TASK 13: Visual feedback - change cursor to pointer on hover
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth transition with easing
                position: 'relative',
                userSelect: 'none', // TASK 13: Prevent text selection when clicking rapidly
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                // Subtle shadow for active marker with smooth transition
                boxShadow: isSelected
                  ? `0 2px 8px rgba(0, 0, 0, 0.2)`
                  : 'none',
                opacity: isSelected ? 1 : 0.95,
                transform: isSelected ? 'scale(1)' : 'scale(0.98)',
              }}
              onClick={() => handleMarkerClick(marker)} // TASK 13: Add click handler to list item - always seeks to start
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = itemHoverBg; // TASK 13: Hover effect
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = itemBg;
                }
              }}
            >
              {/* Compact horizontal layout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                {/* Color indicator */}
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: marker.color || '#FF4444',
                    border: `1px solid ${isLightMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 0 4px ${marker.color || '#FF4444'}60` : 'none',
                  }}
                />
                
                {/* Marker name */}
                <div
                  style={{
                    color: textColor,
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    minWidth: '100px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={marker.name}
                >
                  {marker.name}
                </div>

                {/* Time range - editable */}
                {editingMarkerId === marker.id && editFormData ? (
                  <>
                    <input
                      type="text"
                      value={formatTime(editFormData.start)}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d:]/g, '');
                        if (value.length === 2 && !value.includes(':')) {
                          value = value + ':';
                        }
                        if (value.length <= 5) {
                          const val = parseTimeString(value);
                          if (val >= 0 && val < editFormData.end && val <= duration) {
                            setEditFormData({ ...editFormData, start: val });
                          }
                        }
                      }}
                      placeholder="M:SS"
                      style={{
                        width: '55px',
                        padding: '0.2rem 0.3rem',
                        background: isLightMode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '3px',
                        color: textColor,
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        textAlign: 'center',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ color: textSecondary, fontSize: '0.7rem' }}>—</span>
                    <input
                      type="text"
                      value={formatTime(editFormData.end)}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d:]/g, '');
                        if (value.length === 2 && !value.includes(':')) {
                          value = value + ':';
                        }
                        if (value.length <= 5) {
                          const val = parseTimeString(value);
                          if (val > editFormData.start && val <= duration) {
                            setEditFormData({ ...editFormData, end: val });
                          }
                        }
                      }}
                      placeholder="M:SS"
                      style={{
                        width: '55px',
                        padding: '0.2rem 0.3rem',
                        background: isLightMode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '3px',
                        color: textColor,
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        textAlign: 'center',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: textSecondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    <span>{formatTime(marker.start)}</span>
                    <span>—</span>
                    <span>{formatTime(marker.end)}</span>
                  </div>
                )}

                {/* Speed - editable with icon buttons */}
                {editingMarkerId === marker.id && editFormData ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {/* Decrease speed button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSpeed = Math.max(0.3, editFormData.speed - 0.1);
                        setEditFormData({ ...editFormData, speed: Math.round(newSpeed * 10) / 10 });
                      }}
                      disabled={editFormData.speed <= 0.3}
                      style={{
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: editFormData.speed <= 0.3 
                          ? (isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)')
                          : (isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        color: editFormData.speed <= 0.3 ? textSecondary : textColor,
                        cursor: editFormData.speed <= 0.3 ? 'not-allowed' : 'pointer',
                        opacity: editFormData.speed <= 0.3 ? 0.4 : 1,
                        fontSize: '0.7rem',
                        fontWeight: '600',
                      }}
                      title="Decrease speed by 0.1x"
                    >
                      −
                    </button>
                    
                    {/* Speed display */}
                    <span style={{ 
                      color: textColor, 
                      fontFamily: 'monospace', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      minWidth: '38px',
                      textAlign: 'center'
                    }}>
                      {editFormData.speed.toFixed(1)}x
                    </span>
                    
                    {/* Reset to 1.0x button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditFormData({ ...editFormData, speed: 1.0 });
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: editFormData.speed === 1.0
                          ? (isLightMode ? '#006644' : '#00AA66')
                          : (isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
                        border: `1px solid ${editFormData.speed === 1.0 ? 'transparent' : borderColor}`,
                        borderRadius: '4px',
                        color: editFormData.speed === 1.0 ? '#FFFFFF' : textColor,
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                      }}
                      title="Reset to 1.0x"
                    >
                      1
                    </button>
                    
                    {/* Increase speed button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSpeed = Math.min(4.0, editFormData.speed + 0.1);
                        setEditFormData({ ...editFormData, speed: Math.round(newSpeed * 10) / 10 });
                      }}
                      disabled={editFormData.speed >= 4.0}
                      style={{
                        width: '20px',
                        height: '20px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: editFormData.speed >= 4.0
                          ? (isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)')
                          : (isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        color: editFormData.speed >= 4.0 ? textSecondary : textColor,
                        cursor: editFormData.speed >= 4.0 ? 'not-allowed' : 'pointer',
                        opacity: editFormData.speed >= 4.0 ? 0.4 : 1,
                        fontSize: '0.7rem',
                        fontWeight: '600',
                      }}
                      title="Increase speed by 0.1x"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span style={{ color: textSecondary, fontFamily: 'monospace', fontSize: '0.7rem', minWidth: '35px' }}>
                    {markerSpeed.toFixed(1)}x
                  </span>
                )}

                {/* Loop - editable checkbox */}
                {editingMarkerId === marker.id && editFormData ? (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      color: textColor,
                      userSelect: 'none',
                    }}
                    onClick={(e) => e.stopPropagation()}
                    title="Loop this marker section"
                  >
                    <input
                      type="checkbox"
                      checked={editFormData.loop}
                      onChange={(e) => {
                        setEditFormData({ ...editFormData, loop: e.target.checked });
                      }}
                      style={{
                        width: '14px',
                        height: '14px',
                        cursor: 'pointer',
                        accentColor: isLightMode ? '#006644' : '#00AA66',
                      }}
                    />
                    <span style={{ color: editFormData.loop ? '#00AA00' : textSecondary }}>
                      Loop
                    </span>
                  </label>
                ) : (
                  hasLoop && (
                    <div style={{ color: '#00AA00', fontSize: '0.7rem' }} title="Loop enabled">
                      ↻
                    </div>
                  )
                )}

                {/* Edit/Save buttons and Delete button */}
                {editingMarkerId === marker.id && editFormData ? (
                  <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(marker.id);
                      }}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: isLightMode ? '#006644' : '#00AA66',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#FFFFFF',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: glassBg,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '3px',
                        color: textColor,
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto', alignItems: 'center' }}>
                    {editingMarkerId !== marker.id && (
                      <>
                        {/* Deactivate button - only visible when marker is active */}
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivateMarker();
                            }}
                            style={{
                              width: '24px',
                              height: '24px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'transparent',
                              border: `1px solid ${isLightMode ? '#FF4444' : '#FF6666'}`,
                              borderRadius: '4px',
                              color: isLightMode ? '#FF4444' : '#FF6666',
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              fontSize: '0.7rem',
                              opacity: 1,
                              transform: 'scale(1)',
                            }}
                            title="Deactivate marker"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isLightMode ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255, 68, 68, 0.25)';
                              e.currentTarget.style.borderColor = '#FF4444';
                              e.currentTarget.style.color = '#FF4444';
                              e.currentTarget.style.transform = 'scale(1.1)';
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 68, 68, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = isLightMode ? '#FF4444' : '#FF6666';
                              e.currentTarget.style.color = isLightMode ? '#FF4444' : '#FF6666';
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ transition: 'all 0.3s ease' }}
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleStartEdit(marker, e)}
                          style={{
                            padding: '0.2rem 0.5rem',
                            background: 'transparent',
                            border: `1px solid ${borderColor}`,
                            borderRadius: '3px',
                            color: textSecondary,
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          title="Edit marker"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = glassBg;
                            e.currentTarget.style.color = textColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = textSecondary;
                          }}
                        >
                          Edit
                        </button>
                        {/* Delete Marker Button */}
                        <button
                          onClick={(e) => handleDeleteMarker(marker, e)}
                          style={{
                            width: '24px',
                            height: '24px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            border: `1px solid transparent`,
                            borderRadius: '4px',
                            color: textSecondary,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          title={`Delete marker "${marker.name}" (Delete key)`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#FF4444';
                            e.currentTarget.style.borderColor = 'rgba(255, 68, 68, 0.3)';
                            e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = textSecondary;
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TASK 20: Custom Scrollbar Styling */}
      <style>{`
        .marker-list-container::-webkit-scrollbar {
          width: 8px;
        }
        .marker-list-container::-webkit-scrollbar-track {
          background: ${isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'};
          border-radius: 4px;
        }
        .marker-list-container::-webkit-scrollbar-thumb {
          background: ${isLightMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'};
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .marker-list-container::-webkit-scrollbar-thumb:hover {
          background: ${isLightMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'};
        }
        /* Firefox scrollbar */
        .marker-list-container {
          scrollbar-width: thin;
          scrollbar-color: ${isLightMode ? 'rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)'};
        }
      `}</style>
    </div>
  );
};

export default MarkerPanel;
