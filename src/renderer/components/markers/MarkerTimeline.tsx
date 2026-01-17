// MarkerTimeline.tsx - Wilton - Week 1
// SVG-based timeline overlay for displaying markers

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { Marker } from '../../types/types';
import { MarkerManager, PRESET_COLORS, DEFAULT_MARKER_COLOR } from './MarkerManager';
import { useAudioEngine } from '../audio/useAudioEngine';

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
  const [hasDragged, setHasDragged] = useState(false); // Track if user actually dragged
  const [newMarkerName, setNewMarkerName] = useState('');
  const [newMarkerColor, setNewMarkerColor] = useState<string>(DEFAULT_MARKER_COLOR as string);
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
  
  // Get AudioEngine methods for applying marker settings
  const { seek, setLoop, disableLoop } = useAudioEngine();
  
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
  
  // Pixel-to-time conversion function - uses full timeline for proper scrolling
  const pixelToTime = useCallback((pixelX: number): number => {
    if (duration === 0 || usableWidth === 0) return 0;
    // Calculate SVG width based on full duration
    const svgFullWidth = (duration / visibleDuration) * usableWidth + (TIME_LABEL_PADDING * 2);
    // Adjust for padding
    const adjustedX = pixelX - TIME_LABEL_PADDING;
    const clampedX = Math.max(0, Math.min(adjustedX, svgFullWidth - (TIME_LABEL_PADDING * 2)));
    // Convert pixel position to absolute time in full timeline
    const pixelPerSecond = (svgFullWidth - (TIME_LABEL_PADDING * 2)) / duration;
    return clampedX / pixelPerSecond;
  }, [duration, visibleDuration, usableWidth]);
  
  // Time-to-pixel conversion function - uses full timeline for proper scrolling
  // When zoomed, SVG is full timeline width, so positions are based on full timeline
  // The scroll position determines what's visible, ensuring alignment with waveform
  const timeToPixel = useCallback((timeInSeconds: number): number => {
    if (duration === 0 || usableWidth === 0) return TIME_LABEL_PADDING;
    
    // Calculate SVG width based on full duration (for scrolling)
    const svgFullWidth = (duration / visibleDuration) * usableWidth + (TIME_LABEL_PADDING * 2);
    // Convert time to absolute pixel position in full timeline
    const pixelPerSecond = (svgFullWidth - (TIME_LABEL_PADDING * 2)) / duration;
    return Math.round(TIME_LABEL_PADDING + (timeInSeconds * pixelPerSecond));
  }, [duration, visibleDuration, usableWidth]);
  
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
    
    // If creating marker, update end time and mark as dragged
    if (isCreatingMarker && markerStartTime !== null) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      setMarkerEndTime(clampedTime);
      // Mark as dragged if end time differs from start time
      if (Math.abs(clampedTime - markerStartTime) > 0.1) {
        setHasDragged(true);
      }
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
  
  // Handle SVG mouse down (start marker creation drag)
  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
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
      // Start creating marker on mousedown
      setIsCreatingMarker(true);
      setMarkerStartTime(clampedTime);
      setMarkerEndTime(clampedTime);
      setHasDragged(false); // Reset drag flag
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
        // Only show form if user actually dragged (not just clicked)
        if (hasDragged) {
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
            setHasDragged(false);
          }
        } else {
          // Just clicked without dragging, cancel
          setIsCreatingMarker(false);
          setMarkerStartTime(null);
          setMarkerEndTime(null);
          setHasDragged(false);
        }
      }
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isCreatingMarker, markerStartTime, markerEndTime, hasDragged]);

  // Disable time tooltip (no hover effects)
  const showTimeTooltip = true;
  
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
    setHasDragged(false);
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
  
  // Click handler to activate marker with full functionality (speed, loop, seek)
  const handleMarkerClick = useCallback(async (e: React.MouseEvent, markerId: string) => {
    e.stopPropagation(); // Prevent triggering SVG click
    console.log('[MarkerTimeline] Marker clicked:', markerId);
    
    try {
      const marker = MarkerManager.getMarker(markerId);
      if (!marker) return;
      
      // IMMEDIATELY seek to marker start (before activating marker)
      await seek(marker.start);
      
      // Then activate marker with all settings
      await MarkerManager.setActiveMarker(markerId, {
        seekToMarker: false, // Already sought above
        audioEngine: {
          seek, // Available for future use
          setLoop, // Enable looping for markers with loop=true
          disableLoop, // Disable looping when marker is deactivated
          // Speed is handled by useMarkerSpeedControl hook
        },
      });
    } catch (error) {
      console.error('[MarkerTimeline] Error activating marker:', error);
    }
  }, [seek, setLoop, disableLoop]);
  
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
  // Handle scroll synchronization with waveform
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      
      // Calculate scroll ratio (0 to 1) for consistent synchronization
      const scrollLeft = scrollContainer.scrollLeft;
      const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      const scrollRatio = maxScroll > 0 ? scrollLeft / maxScroll : 0;
      
      // Sync with waveform (triggered via custom event)
      window.dispatchEvent(new CustomEvent('markerTimelineScroll', { 
        detail: { scrollRatio, scrollLeft } 
      }));
      
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 10);
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Listen for waveform scroll events
  useEffect(() => {
    const handleWaveformScroll = (e: CustomEvent) => {
      if (isScrollingRef.current) return;
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;
      
      isScrollingRef.current = true;
      const { scrollRatio } = e.detail;
      
      // Sync scroll position using scroll ratio for consistent movement
      if (scrollRatio !== undefined) {
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        if (maxScroll > 0) {
          scrollContainer.scrollLeft = scrollRatio * maxScroll;
        }
      }
      
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 10);
    };
    
    window.addEventListener('waveformScroll', handleWaveformScroll as EventListener);
    return () => window.removeEventListener('waveformScroll', handleWaveformScroll as EventListener);
  }, []);

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
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--neu-raised)',
        flexShrink: 0,
      }}
    >
      {/* Marker hover tooltip */}
      {hoveredMarker && hoveredMarkerData && tooltipPosition && !isCreatingMarker && (
        <div 
          className="marker-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltipPosition.x}px`,
            top: '-10px', // Moved closer to timeline (was -40px)
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: '#FFD700',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 10000, // Increased z-index to bring forward
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {hoveredMarkerData.name}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: 'rgba(255, 255, 255, 0.9)',
            fontFamily: 'monospace'
          }}>
            {formatTime(hoveredMarkerData.start)} - {formatTime(hoveredMarkerData.end)}
            {hoveredMarkerData.speed && hoveredMarkerData.speed !== 1.0 && (
              <span style={{ marginLeft: '8px', color: '#4CAF50' }}>
                • {hoveredMarkerData.speed.toFixed(2)}x
              </span>
            )}
            {hoveredMarkerData.loop && (
              <span style={{ marginLeft: '8px', color: '#FFD700' }}>
                🔁 Loop
              </span>
            )}
          </div>
        </div>
      )}

      {/* Time tooltip - Always shows exact time when hovering over timeline */}
      {showTimeTooltip && hoverTime !== null && mousePosition && (
        <div 
          className="time-tooltip"
          style={{
            position: 'fixed',
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y - 35}px`,
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 10001, // Higher than marker tooltip
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            fontFamily: 'monospace',
          }}
        >
          {formatTime(hoverTime)}
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
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              minWidth: '800px',
              maxWidth: '95vw',
              boxShadow: 'var(--neu-raised), 0 0 40px rgba(0, 102, 68, 0.3)',
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
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
                      boxShadow: 'var(--neu-pressed)',
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
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                          textAlign: 'center',
                          boxShadow: 'var(--neu-pressed)',
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
                    boxShadow: newMarkerName.trim() ? 'var(--neu-raised), 0 0 12px rgba(0, 102, 68, 0.4)' : 'var(--neu-pressed)',
                  }}
                >
                  Create
                </button>
                <button
                  onClick={handleCancelMarker}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: 'var(--bg-secondary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
                    fontWeight: 'normal',
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--neu-pressed)',
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
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
              transition: 'all 0.2s ease',
              boxShadow: 'var(--neu-raised)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 68, 68, 1)';
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = 'var(--neu-pressed)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 68, 68, 0.9)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'var(--neu-raised)';
            }}
            title="Cancel marker creation (Esc)"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Container for marker timeline - no manual scrolling, only auto-scroll via viewport */}
      <div
        style={{
          width: '100%',
          flex: '1 1 auto',
          overflow: 'hidden',
        }}
      >
      {/* Render SVG */}
      {containerWidth > 0 && duration > 0 && (
        <svg 
          ref={svgRef}
          width={visibleDuration > 0 ? Math.max(containerWidth, (duration / visibleDuration) * usableWidth + (TIME_LABEL_PADDING * 2)) : containerWidth}
          height={Math.min(svgHeight, TIME_GRID_HEIGHT + MAX_MARKER_AREA_HEIGHT)}
          style={{ 
            display: 'block', 
            cursor: isCreatingMarker ? 'crosshair' : 'default',
            overflow: 'visible',
            minHeight: '0',
            minWidth: '100%',
            flexShrink: 0
          }}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
          onMouseDown={handleSvgMouseDown}
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
                  opacity={isActive ? 0.95 : 0.7}
                  stroke={isActive ? '#FFD700' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={marker.loop ? '4 2' : 'none'} // Dashed border for loop markers
                  rx={4}
                  ry={4}
                  onClick={(e) => handleMarkerClick(e, marker.id)}
                  onMouseEnter={() => setHoveredMarker(marker.id)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  style={{ cursor: 'pointer' }}
                />
                
                {/* Loop indicator icon - circular arrow (only show if marker is wide enough) */}
                {marker.loop && dimensions.width > 30 && (
                  <g>
                    {/* Loop icon background circle */}
                    <circle
                      cx={dimensions.x + dimensions.width - 12}
                      cy={y + 14}
                      r={8}
                      fill="rgba(255, 215, 0, 0.9)"
                      stroke="rgba(0, 0, 0, 0.3)"
                      strokeWidth={1}
                    />
                    {/* Loop arrow - simplified circular arrow */}
                    <path
                      d={`M ${dimensions.x + dimensions.width - 16} ${y + 14} 
                          A 4 4 0 1 1 ${dimensions.x + dimensions.width - 8} ${y + 14}`}
                      fill="none"
                      stroke="rgba(0, 0, 0, 0.9)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                    {/* Arrow head */}
                    <path
                      d={`M ${dimensions.x + dimensions.width - 8} ${y + 14} 
                          L ${dimensions.x + dimensions.width - 6} ${y + 12}
                          L ${dimensions.x + dimensions.width - 6} ${y + 16}
                          Z`}
                      fill="rgba(0, 0, 0, 0.9)"
                      pointerEvents="none"
                    />
                  </g>
                )}
                
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
    </div>
  );
}

export default MarkerTimeline;
