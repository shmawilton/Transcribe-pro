// MarkerTimeline.tsx - Wilton - Week 1
// SVG-based timeline overlay for displaying markers

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { Marker } from '../../types/types';
import { MarkerManager, PRESET_COLORS, DEFAULT_MARKER_COLOR } from './MarkerManager';

// ===== Constants for marker layout =====
const MARKER_HEIGHT = 28; // pixels - increased for better visibility
const MARKER_GAP = 6; // pixels between layers - increased for better spacing
const TIME_GRID_HEIGHT = 35; // Increased height for time grid
const MIN_MARKER_AREA_HEIGHT = 100; // Minimum height with good padding
const MAX_OVERLAPPING_MARKERS = 5; // Support up to 5 overlapping markers
const MAX_MARKER_AREA_HEIGHT = TIME_GRID_HEIGHT + (MAX_OVERLAPPING_MARKERS * (MARKER_HEIGHT + MARKER_GAP)) + 20; // Height for 5 markers + padding
const TIME_LABEL_PADDING = 50; // Padding on left and right to prevent label cutoff

export function MarkerTimeline() {
  // ===== Setup state and refs =====
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  
  // ===== Marker creation state =====
  const [isCreatingMarker, setIsCreatingMarker] = useState(false);
  const [markerStartTime, setMarkerStartTime] = useState<number | null>(null);
  const [markerEndTime, setMarkerEndTime] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [showMarkerForm, setShowMarkerForm] = useState(false);
  const [newMarkerName, setNewMarkerName] = useState('');
  const [newMarkerColor, setNewMarkerColor] = useState(DEFAULT_MARKER_COLOR);
  const [newMarkerSpeed, setNewMarkerSpeed] = useState(1.0);
  
  // Ensure speed is within valid range
  useEffect(() => {
    if (newMarkerSpeed < 0.3) {
      setNewMarkerSpeed(0.3);
    }
  }, [newMarkerSpeed]);
  const [newMarkerLoop, setNewMarkerLoop] = useState(false);
  
  // Listen for marker creation request from MarkerPanel
  const requestMarkerCreation = useAppStore((state) => state.ui.requestMarkerCreation);
  const setRequestMarkerCreation = useAppStore((state) => state.setRequestMarkerCreation);
  const currentTime = useAppStore((state) => state.audio.currentTime || 0);
  
  // Get data from Zustand store
  const markers = useAppStore((state) => state.markers);
  const duration = useAppStore((state) => state.audio.duration || 0);
  const activeMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const setActiveMarker = useAppStore((state) => state.setSelectedMarkerId);
  
  // Get viewport state for synchronized zoom/scroll with Waveform
  const rawViewportStart = useAppStore((state) => state.ui.viewportStart);
  const rawViewportEnd = useAppStore((state) => state.ui.viewportEnd);
  
  // Clamp viewport values to current duration (handles case when new audio is shorter)
  // Also handles stale viewport values from previous audio
  const viewportStart = Math.min(rawViewportStart, duration);
  const viewportEnd = rawViewportEnd > 0 && rawViewportEnd <= duration ? rawViewportEnd : duration;
  
  // Calculate visible duration based on viewport
  const visibleDuration = viewportEnd > viewportStart ? viewportEnd - viewportStart : duration;
  
  // Measure initial width on mount
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setContainerWidth(width);
    }
  }, []);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate usable width (accounting for padding)
  const usableWidth = useMemo(() => {
    return Math.max(0, containerWidth - (TIME_LABEL_PADDING * 2));
  }, [containerWidth]);
  
  // Pixel-to-time conversion function (uses viewport for zoomed view)
  const pixelToTime = useCallback((pixelX: number): number => {
    if (visibleDuration === 0 || usableWidth === 0) return 0;
    // Adjust for padding
    const adjustedX = pixelX - TIME_LABEL_PADDING;
    const clampedX = Math.max(0, Math.min(adjustedX, usableWidth));
    // Convert to time within the visible viewport
    return viewportStart + (clampedX / usableWidth) * visibleDuration;
  }, [visibleDuration, usableWidth, viewportStart]);
  
  // Time-to-pixel conversion function (uses viewport for zoomed view)
  const timeToPixel = useCallback((timeInSeconds: number): number => {
    if (visibleDuration === 0 || usableWidth === 0) return TIME_LABEL_PADDING;
    // Convert time to position within the visible viewport
    const relativeTime = timeInSeconds - viewportStart;
    return Math.round(TIME_LABEL_PADDING + (relativeTime / visibleDuration) * usableWidth);
  }, [visibleDuration, usableWidth, viewportStart]);
  
  // Calculate marker dimensions
  const getMarkerDimensions = useCallback((marker: Marker) => {
    const startX = timeToPixel(marker.start);
    const endX = timeToPixel(marker.end);
    const width = endX - startX;
    
    return {
      x: startX,
      width: Math.max(width, 2),
    };
  }, [timeToPixel]);
  
  // Detect overlapping markers
  const markersOverlap = useCallback((m1: Marker, m2: Marker): boolean => {
    return m1.start < m2.end && m2.start < m1.end;
  }, []);
  
  // Assign layers to markers
  const getMarkerLayers = useCallback((markers: Marker[]): Map<string, number> => {
    const layers = new Map<string, number>();
    const sorted = [...markers].sort((a, b) => a.start - b.start);
    
    sorted.forEach((marker) => {
      let layer = 0;
      let foundLayer = false;
      
      while (!foundLayer) {
        const overlaps = sorted.some((otherMarker) => {
          if (otherMarker.id === marker.id) return false;
          if (layers.get(otherMarker.id) !== layer) return false;
          return markersOverlap(marker, otherMarker);
        });
        
        if (!overlaps) {
          layers.set(marker.id, layer);
          foundLayer = true;
        } else {
          layer++;
        }
      }
    });
    
    return layers;
  }, [markersOverlap]);
  
  // Calculate Y position from layer (below time grid)
  const getMarkerY = useCallback((layer: number): number => {
    return TIME_GRID_HEIGHT + layer * (MARKER_HEIGHT + MARKER_GAP);
  }, []);
  
  // Calculate marker layers (memoized)
  const markerLayers = useMemo(() => {
    return getMarkerLayers(markers);
  }, [markers, getMarkerLayers]);
  
  // Calculate total SVG height
  const maxLayer = useMemo(() => {
    if (markers.length === 0) return 0;
    return Math.max(...Array.from(markerLayers.values()), 0);
  }, [markerLayers, markers.length]);
  
  const markerAreaHeight = useMemo(() => {
    // Calculate needed height based on layers, with good padding
    const neededHeight = (maxLayer + 1) * (MARKER_HEIGHT + MARKER_GAP) + 20; // +20 for padding
    const calculatedHeight = Math.max(neededHeight, MIN_MARKER_AREA_HEIGHT);
    // Cap at max height for 5 overlapping markers
    return Math.min(calculatedHeight, MAX_MARKER_AREA_HEIGHT);
  }, [maxLayer]);
  
  const svgHeight = TIME_GRID_HEIGHT + markerAreaHeight;
  
  // Generate time grid markers (uses viewport for zoomed view)
  const timeGridMarkers = useMemo(() => {
    if (duration === 0 || usableWidth === 0 || visibleDuration === 0) return [];
    
    // Calculate appropriate interval based on VISIBLE duration (not total)
    let interval = 30; // default 30 seconds
    if (visibleDuration > 600) interval = 60; // 1 minute for > 10 min visible
    if (visibleDuration > 1800) interval = 300; // 5 minutes for > 30 min visible
    if (visibleDuration < 60) interval = 10; // 10 seconds for < 1 min visible
    if (visibleDuration < 30) interval = 5; // 5 seconds for < 30 sec visible
    if (visibleDuration < 10) interval = 2; // 2 seconds for < 10 sec visible (when very zoomed)
    if (visibleDuration < 5) interval = 1; // 1 second for < 5 sec visible
    
    const markers = [];
    
    // Start from first interval point at or after viewportStart
    const firstMarkerTime = Math.ceil(viewportStart / interval) * interval;
    
    for (let time = firstMarkerTime; time <= viewportEnd; time += interval) {
      const x = timeToPixel(time);
      // Only include if within visible area
      if (x >= TIME_LABEL_PADDING && x <= containerWidth - TIME_LABEL_PADDING) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        markers.push({ time, x, label });
      }
    }
    return markers;
  }, [duration, usableWidth, visibleDuration, viewportStart, viewportEnd, timeToPixel, containerWidth]);
  
  // Handle SVG mouse move (for hover tooltip and drag)
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x);
    
    setHoverX(x);
    setHoverTime(time);
    // Track mouse position for tooltip positioning
    setMousePosition({ x: e.clientX, y: e.clientY });
    
    // If creating marker, update end time
    if (isCreatingMarker && markerStartTime !== null) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      setMarkerEndTime(clampedTime);
    }
  }, [isCreatingMarker, markerStartTime, duration, pixelToTime]);
  
  // Handle SVG mouse leave
  const handleSvgMouseLeave = useCallback(() => {
    setHoverTime(null);
    setMousePosition(null);
    if (!isCreatingMarker) {
      setHoverX(0);
    }
  }, [isCreatingMarker]);
  
  // Handle SVG click (start marker creation)
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Don't start if clicking on existing marker
    if ((e.target as SVGElement).closest('g[data-marker-id]')) {
      return;
    }
    
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x);
    
    const clampedTime = Math.max(0, Math.min(time, duration));
    
    if (!isCreatingMarker) {
      // Start creating marker
      setIsCreatingMarker(true);
      setMarkerStartTime(clampedTime);
      setMarkerEndTime(clampedTime);
    }
  }, [isCreatingMarker, duration, pixelToTime]);
  
  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format time as MM:SS for input (with separators)
  const formatTimeForInput = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Parse MM:SS format to seconds
  const parseTimeInput = useCallback((input: string): number => {
    const parts = input.split(':');
    if (parts.length !== 2) return 0;
    const mins = parseInt(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }, []);

  // State for editable time inputs
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  
  // Handle mouse up (end marker creation)
  useEffect(() => {
    const handleMouseUp = () => {
      if (isCreatingMarker && markerStartTime !== null && markerEndTime !== null) {
        // Ensure start < end
        const start = Math.min(markerStartTime, markerEndTime);
        const end = Math.max(markerStartTime, markerEndTime);
        
        // Minimum marker duration (0.5 seconds)
        if (end - start >= 0.5) {
          setMarkerStartTime(start);
          setMarkerEndTime(end);
          setShowMarkerForm(true);
        } else {
          // Too small, cancel
          setIsCreatingMarker(false);
          setMarkerStartTime(null);
          setMarkerEndTime(null);
        }
      }
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isCreatingMarker, markerStartTime, markerEndTime]);

  // Show tooltip when hovering over timeline grid (not over markers)
  const showGridTooltip = hoverTime !== null && !isCreatingMarker && !hoveredMarker;
  
  // Handle marker form submission - Now uses MarkerManager
  const handleCreateMarker = useCallback(() => {
    // Parse time inputs
    const start = parseTimeInput(startTimeInput);
    const end = parseTimeInput(endTimeInput);
    
    if (!newMarkerName.trim() || start < 0 || end <= start || end > duration) {
      alert('Please enter valid marker name and time range.');
      return;
    }
    
    try {
      // Use MarkerManager.createMarker() instead of direct store access
      // This includes validation, UUID generation, and proper defaults
      MarkerManager.createMarker(
        newMarkerName.trim(),
        start,
        end,
        newMarkerColor,
        newMarkerSpeed,
        newMarkerLoop
      );
      
      // Reset state
      setIsCreatingMarker(false);
      setMarkerStartTime(null);
      setMarkerEndTime(null);
      setShowMarkerForm(false);
      setNewMarkerName('');
      setNewMarkerColor(DEFAULT_MARKER_COLOR);
      setNewMarkerSpeed(1.0);
      setNewMarkerLoop(false);
      setStartTimeInput('');
      setEndTimeInput('');
    } catch (error) {
      // Validation errors from MarkerManager
      if (error instanceof Error) {
        alert(`Cannot create marker: ${error.message}`);
      } else {
        alert('Failed to create marker. Please check your inputs.');
      }
    }
  }, [startTimeInput, endTimeInput, newMarkerName, newMarkerColor, newMarkerSpeed, newMarkerLoop, duration, parseTimeInput]);
  
  // Cancel marker creation
  const handleCancelMarker = useCallback(() => {
    setIsCreatingMarker(false);
    setMarkerStartTime(null);
    setMarkerEndTime(null);
    setShowMarkerForm(false);
    setNewMarkerName('');
    setNewMarkerColor(DEFAULT_MARKER_COLOR);
    setNewMarkerSpeed(1.0);
    setNewMarkerLoop(false);
    setStartTimeInput('');
    setEndTimeInput('');
    setRequestMarkerCreation(false); // Clear request from MarkerPanel
  }, [setRequestMarkerCreation]);

  // Keyboard shortcut: Esc to cancel marker creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isCreatingMarker || showMarkerForm)) {
        handleCancelMarker();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatingMarker, showMarkerForm, handleCancelMarker]);

  // Listen for marker creation request from MarkerPanel button
  useEffect(() => {
    if (requestMarkerCreation && duration > 0) {
      // Open form immediately with default times
      const start = currentTime;
      const end = Math.min(currentTime + 5, duration);
      setMarkerStartTime(start);
      setMarkerEndTime(end);
      setStartTimeInput(formatTimeForInput(start));
      setEndTimeInput(formatTimeForInput(end));
      setShowMarkerForm(true);
      setIsCreatingMarker(true);
      setRequestMarkerCreation(false); // Clear the request
    }
  }, [requestMarkerCreation, duration, currentTime, setRequestMarkerCreation, formatTimeForInput]);

  // Update time inputs when marker times change
  useEffect(() => {
    if (markerStartTime !== null) {
      setStartTimeInput(formatTimeForInput(markerStartTime));
    }
    if (markerEndTime !== null) {
      setEndTimeInput(formatTimeForInput(markerEndTime));
    }
  }, [markerStartTime, markerEndTime, formatTimeForInput]);
  
  // Click handler to activate marker
  const handleMarkerClick = useCallback((e: React.MouseEvent, markerId: string) => {
    e.stopPropagation(); // Prevent triggering SVG click
    console.log('[MarkerTimeline] Marker clicked:', markerId);
    setActiveMarker(markerId);
  }, [setActiveMarker]);
  
  // Get hovered marker data for tooltip
  const hoveredMarkerData = useMemo(() => {
    if (!hoveredMarker) return null;
    return markers.find(m => m.id === hoveredMarker);
  }, [hoveredMarker, markers]);
  
  // Get tooltip position
  const tooltipPosition = useMemo(() => {
    if (!hoveredMarkerData) return null;
    const dims = getMarkerDimensions(hoveredMarkerData);
    return {
      x: dims.x + dims.width / 2,
      markerX: dims.x
    };
  }, [hoveredMarkerData, getMarkerDimensions]);
  
  // Format time with milliseconds for precise tooltip
  const formatTimePrecise = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);
  
  // Calculate preview marker dimensions
  const previewMarkerDims = useMemo(() => {
    if (!isCreatingMarker || markerStartTime === null || markerEndTime === null) return null;
    const start = Math.min(markerStartTime, markerEndTime);
    const end = Math.max(markerStartTime, markerEndTime);
    const startX = timeToPixel(start);
    const endX = timeToPixel(end);
    return {
      x: startX,
      width: Math.max(endX - startX, 2),
    };
  }, [isCreatingMarker, markerStartTime, markerEndTime, timeToPixel]);
  
  // ===== RENDER =====
  return (
    <div 
      ref={containerRef}
      className="marker-timeline"
      style={{
        position: 'relative',
        width: '100%',
        flex: '0 0 55%',
        minHeight: '0',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0, 102, 68, 0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 102, 68, 0.4)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 102, 68, 0.2)',
        flexShrink: 0,
      }}
    >
      {/* Hover tooltip for timeline grid - Simple "Add Marker" */}
      {showGridTooltip && mousePosition && (
        <div 
          className="grid-tooltip"
          style={{
            position: 'fixed',
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y - 35}px`,
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 10000,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
          }}
        >
          Add Marker
        </div>
      )}
      
      {/* Hover tooltip for existing markers */}
      {/* Tooltip for existing markers */}
      {hoveredMarker && hoveredMarkerData && tooltipPosition && !isCreatingMarker && (
        <div 
          className="marker-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltipPosition.x}px`,
            top: '-40px',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: '#FFD700',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
          }}
        >
          {hoveredMarkerData.name}
          <div style={{ 
            fontSize: '10px', 
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '2px'
          }}>
            {formatTime(hoveredMarkerData.start)} - {formatTime(hoveredMarkerData.end)}
          </div>
        </div>
      )}

      {/* Tooltip for timeline grid - asking if user wants to add marker */}
      {showGridTooltip && hoverTime !== null && svgRef.current && (
        <div 
          className="grid-tooltip"
          style={{
            position: 'absolute',
            left: `${containerRef.current ? containerRef.current.getBoundingClientRect().left + hoverX : hoverX}px`,
            top: `${containerRef.current ? containerRef.current.getBoundingClientRect().top + TIME_GRID_HEIGHT + 10 : 10}px`,
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 1001,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.7)',
            border: '2px solid rgba(212, 175, 55, 0.5)',
          }}
        >
          <div style={{ color: '#D4AF37', marginBottom: '6px', fontWeight: '600' }}>
            Click and drag to create marker
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: 'rgba(255, 255, 255, 0.9)',
            fontFamily: 'monospace',
            textAlign: 'center'
          }}>
            {formatTime(hoverTime)}
          </div>
        </div>
      )}
      
      {/* Marker Creation Form Modal - Rendered via Portal at body level */}
      {showMarkerForm && markerStartTime !== null && markerEndTime !== null && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '2rem',
            overflow: 'auto',
            isolation: 'isolate',
          }}
          onClick={handleCancelMarker}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '3px solid var(--text-accent-green)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              minWidth: '800px',
              maxWidth: '95vw',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95), 0 0 40px rgba(0, 102, 68, 0.3)',
              margin: 'auto',
              transform: 'scale(1.02)',
              animation: 'modalPopIn 0.3s ease-out',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: 'var(--text-accent-green)', marginBottom: '1rem', fontSize: '1.2rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive", fontWeight: 'normal' }}>
              Create Marker
            </h3>
            
            {/* Horizontal Layout */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* Left Column */}
              <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Marker Name */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                    Marker Name:
                  </label>
                  <input
                    type="text"
                    value={newMarkerName}
                    onChange={(e) => setNewMarkerName(e.target.value)}
                    placeholder="e.g., Intro, Verse 1..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'var(--bg-secondary)',
                      border: '2px solid var(--text-accent-green)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateMarker();
                      } else if (e.key === 'Escape') {
                        handleCancelMarker();
                      }
                    }}
                  />
                </div>

                {/* Time Range Inputs */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                    Time Range (MM:SS):
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={startTimeInput}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\d:]/g, '');
                          // Auto-format MM:SS
                          if (value.length === 2 && !value.includes(':')) {
                            value = value + ':';
                          }
                          if (value.length <= 5) {
                            setStartTimeInput(value);
                            const parsed = parseTimeInput(value);
                            if (parsed >= 0 && parsed <= duration) {
                              setMarkerStartTime(parsed);
                            }
                          }
                        }}
                        placeholder="00:00"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'var(--bg-secondary)',
                          border: '2px solid var(--text-accent-green)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>—</span>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={endTimeInput}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\d:]/g, '');
                          if (value.length === 2 && !value.includes(':')) {
                            value = value + ':';
                          }
                          if (value.length <= 5) {
                            setEndTimeInput(value);
                            const parsed = parseTimeInput(value);
                            if (parsed > 0 && parsed <= duration) {
                              setMarkerEndTime(parsed);
                            }
                          }
                        }}
                        placeholder="00:00"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'var(--bg-secondary)',
                          border: '2px solid var(--text-accent-green)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textAlign: 'center' }}>
                    Duration: {formatTime(Math.abs((markerEndTime || 0) - (markerStartTime || 0)))}
                  </div>
                </div>
              </div>

              {/* Middle Column */}
              <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Color picker */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                    Color:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewMarkerColor(color)}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: '50%',
                          background: color,
                          border: `3px solid ${newMarkerColor === color ? '#D4AF37' : 'transparent'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: newMarkerColor === color ? `0 0 8px ${color}80` : `0 0 4px ${color}40`,
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Speed slider */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                    Speed: <span style={{ fontFamily: 'monospace' }}>{newMarkerSpeed.toFixed(2)}x</span>
                  </label>
                  <div style={{ position: 'relative', padding: '10px 0 4px 0' }}>
                    <input
                      type="range"
                      min={0.3}
                      max={4.0}
                      step={0.05}
                      value={newMarkerSpeed}
                      onChange={(e) => setNewMarkerSpeed(parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        background: `linear-gradient(to right, 
                          var(--bg-secondary) 0%, 
                          var(--bg-secondary) ${((newMarkerSpeed - 0.3) / 3.7) * 100}%, 
                          var(--bg-tertiary) ${((newMarkerSpeed - 0.3) / 3.7) * 100}%, 
                          var(--bg-tertiary) 100%)`,
                        borderRadius: '3px',
                        position: 'relative',
                        zIndex: 1,
                        margin: 0,
                      }}
                      className="marker-speed-slider"
                    />
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.7rem', 
                      color: 'var(--text-secondary)', 
                      marginTop: '0.3rem',
                      position: 'relative',
                      width: '100%',
                    }}>
                      <span style={{ flex: '0 0 auto' }}>0.3x</span>
                      <span style={{ 
                        position: 'absolute', 
                        left: '50%', 
                        transform: 'translateX(-50%)',
                        flex: '0 0 auto',
                        pointerEvents: 'none',
                      }}>1.0x</span>
                      <span style={{ flex: '0 0 auto' }}>4.0x</span>
                    </div>
                  </div>
                  <style>{`
                    .marker-speed-slider::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      appearance: none;
                      width: 18px;
                      height: 18px;
                      border-radius: 50%;
                      background: var(--text-accent-green);
                      border: 3px solid var(--bg-primary);
                      cursor: pointer;
                      margin-top: -6px;
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    }
                    .marker-speed-slider::-moz-range-thumb {
                      width: 18px;
                      height: 18px;
                      border-radius: 50%;
                      background: var(--text-accent-green);
                      border: 3px solid var(--bg-primary);
                      cursor: pointer;
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    }
                    .marker-speed-slider::-webkit-slider-runnable-track {
                      height: 6px;
                      background: var(--bg-secondary);
                      border-radius: 3px;
                    }
                    .marker-speed-slider::-moz-range-track {
                      height: 6px;
                      background: var(--bg-secondary);
                      border-radius: 3px;
                    }
                  `}</style>
                </div>

                {/* Loop checkbox */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive", cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newMarkerLoop}
                      onChange={(e) => setNewMarkerLoop(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                      }}
                    />
                    Loop this section
                  </label>
                </div>
              </div>

              {/* Right Column - Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCreateMarker}
                  disabled={!newMarkerName.trim()}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: newMarkerName.trim() ? 'var(--text-accent-green)' : 'rgba(0, 102, 68, 0.3)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    cursor: newMarkerName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.9rem',
                    fontWeight: 'normal',
                    fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
                    transition: 'all 0.2s ease',
                    boxShadow: newMarkerName.trim() ? '0 4px 12px rgba(0, 102, 68, 0.4)' : 'none',
                  }}
                >
                  Create
                </button>
                <button
                  onClick={handleCancelMarker}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: 'var(--bg-secondary)',
                    border: '2px solid var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
                    fontWeight: 'normal',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Cancel button during marker creation */}
      {isCreatingMarker && markerStartTime !== null && markerEndTime !== null && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancelMarker();
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 68, 68, 0.9)',
              border: '2px solid rgba(255, 68, 68, 1)',
              borderRadius: '8px',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 68, 68, 1)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 68, 68, 0.9)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Cancel marker creation (Esc)"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Render SVG */}
      {containerWidth > 0 && (
        <svg 
          ref={svgRef}
          width={containerWidth} 
          height={Math.min(svgHeight, TIME_GRID_HEIGHT + MAX_MARKER_AREA_HEIGHT)}
          style={{ 
            display: 'block', 
            cursor: isCreatingMarker ? 'crosshair' : 'default',
            overflow: 'visible',
            flex: '1 1 auto',
            minHeight: '0'
          }}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
          onClick={handleSvgClick}
        >
          {/* Time Grid Background */}
          <rect
            x={0}
            y={0}
            width={containerWidth}
            height={TIME_GRID_HEIGHT}
            fill="rgba(0, 0, 0, 0.3)"
          />
          
          {/* Time Grid Line */}
          <line
            x1={TIME_LABEL_PADDING}
            y1={TIME_GRID_HEIGHT}
            x2={containerWidth - TIME_LABEL_PADDING}
            y2={TIME_GRID_HEIGHT}
            stroke="rgba(0, 102, 68, 0.6)"
            strokeWidth={2}
          />
          
          {/* Time Grid Markers */}
          {timeGridMarkers.map((marker, idx) => (
            <g key={idx}>
              {/* Vertical tick */}
              <line
                x1={marker.x}
                y1={TIME_GRID_HEIGHT - 8}
                x2={marker.x}
                y2={TIME_GRID_HEIGHT}
                stroke="rgba(255, 255, 255, 0.6)"
                strokeWidth={1.5}
              />
              {/* Time label */}
              <text
                x={marker.x}
                y={TIME_GRID_HEIGHT - 12}
                fill="rgba(255, 255, 255, 0.8)"
                fontSize="12"
                textAnchor="middle"
                fontFamily="'Gochi Hand', 'Annie Use Your Telescope', cursive"
                fontWeight="normal"
              >
                {marker.label}
              </text>
              {/* Vertical guide line (subtle) */}
              <line
                x1={marker.x}
                y1={TIME_GRID_HEIGHT}
                x2={marker.x}
                y2={svgHeight}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={1}
                strokeDasharray="2,4"
              />
            </g>
          ))}
          
          {/* Preview marker being created */}
          {previewMarkerDims && (
            <g>
              <rect
                x={previewMarkerDims.x}
                y={TIME_GRID_HEIGHT}
                width={previewMarkerDims.width}
                height={MARKER_HEIGHT}
                fill={newMarkerColor}
                opacity={0.5}
                stroke={newMarkerColor}
                strokeWidth={2}
                strokeDasharray="4,4"
                rx={4}
                ry={4}
              />
              {/* Preview time labels */}
              {markerStartTime !== null && markerEndTime !== null && (
                <>
                  <text
                    x={previewMarkerDims.x + 4}
                    y={TIME_GRID_HEIGHT + 16}
                    fill="white"
                    fontSize="11"
                    fontWeight="normal"
                    fontFamily="'Gochi Hand', 'Annie Use Your Telescope', cursive"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {formatTime(Math.min(markerStartTime, markerEndTime))}
                  </text>
                  <text
                    x={previewMarkerDims.x + previewMarkerDims.width - 4}
                    y={TIME_GRID_HEIGHT + 16}
                    fill="white"
                    fontSize="11"
                    fontWeight="normal"
                    textAnchor="end"
                    fontFamily="'Gochi Hand', 'Annie Use Your Telescope', cursive"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {formatTime(Math.max(markerStartTime, markerEndTime))}
                  </text>
                </>
              )}
              {/* Helper text when creating marker */}
              {hoverTime !== null && (
                <text
                  x={timeToPixel(hoverTime)}
                  y={TIME_GRID_HEIGHT + MARKER_HEIGHT + 20}
                  fill="#D4AF37"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{ fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}
                >
                  Release to set range
                </text>
              )}
            </g>
          )}
          
          {/* Existing Markers */}
          {markers.map((marker) => {
            const dimensions = getMarkerDimensions(marker);
            const layer = markerLayers.get(marker.id) || 0;
            const y = getMarkerY(layer);
            const isActive = marker.id === activeMarkerId;
            const isHovered = marker.id === hoveredMarker;
            
            return (
              <g key={marker.id} data-marker-id={marker.id}>
                {/* Marker rectangle */}
                <rect
                  x={dimensions.x}
                  y={y}
                  width={dimensions.width}
                  height={MARKER_HEIGHT}
                  fill={marker.color || '#4CAF50'}
                  opacity={isActive ? 0.95 : isHovered ? 0.85 : 0.7}
                  stroke={isActive ? '#FFD700' : isHovered ? '#FFF' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isActive ? 2 : 1}
                  rx={4}
                  ry={4}
                  onClick={(e) => handleMarkerClick(e, marker.id)}
                  onMouseEnter={() => setHoveredMarker(marker.id)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s, stroke 0.2s' }}
                />
                
                {/* Marker label - show if wide enough */}
                {dimensions.width > 60 && (
                  <text
                    x={dimensions.x + 6}
                    y={y + 16}
                    fill="white"
                    fontSize="12"
                    fontWeight="normal"
                    fontFamily="'Gochi Hand', 'Annie Use Your Telescope', cursive"
                    pointerEvents="none"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {marker.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export default MarkerTimeline;
