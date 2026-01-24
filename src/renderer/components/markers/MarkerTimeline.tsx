// MarkerTimeline.tsx - Wilton - Week 1
// SVG-based timeline overlay for displaying markers

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../../store/store';
import { Marker } from '../../types/types';
import { MarkerManager } from './MarkerManager';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ===== Marker creation state =====
  const [isCreatingMarker, setIsCreatingMarker] = useState(false);
  const [markerStartTime, setMarkerStartTime] = useState<number | null>(null);
  const [markerEndTime, setMarkerEndTime] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false); // Track if user actually dragged
  
  // Listen for marker creation request from MarkerPanel
  const requestMarkerCreation = useAppStore((state) => state.ui.requestMarkerCreation);
  const setRequestMarkerCreation = useAppStore((state) => state.setRequestMarkerCreation);
  
  // Get data from Zustand store
  const markers = useAppStore((state) => state.markers);
  const duration = useAppStore((state) => state.audio.duration || 0);
  const activeMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  
  // Get AudioEngine methods for applying marker settings
  const { seek, setLoop, disableLoop } = useAudioEngine();
  
  // Get viewport state for synchronized zoom/scroll with Waveform
  const rawViewportStart = useAppStore((state) => state.ui.viewportStart);
  const rawViewportEnd = useAppStore((state) => state.ui.viewportEnd);
  
  // Clamp viewport values to current duration (handles case when new audio is shorter)
  // Also handles stale viewport values from previous audio and NaN values
  const viewportStart = (typeof rawViewportStart === 'number' && !isNaN(rawViewportStart) && isFinite(rawViewportStart))
    ? Math.max(0, Math.min(rawViewportStart, duration))
    : 0;
  const viewportEnd = (typeof rawViewportEnd === 'number' && !isNaN(rawViewportEnd) && isFinite(rawViewportEnd) && rawViewportEnd > 0)
    ? Math.min(rawViewportEnd, duration > 0 ? duration : rawViewportEnd)
    : (duration > 0 ? duration : 1);
  
  // Calculate visible duration based on viewport - ensure it's never 0 or NaN
  const visibleDuration = (viewportEnd > viewportStart && !isNaN(viewportEnd - viewportStart))
    ? (viewportEnd - viewportStart)
    : (duration > 0 ? duration : 1);
  
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
  
  // Calculate SVG width to match waveform width when zoomed
  // When zoomed, the waveform shows a smaller time range (viewport) stretched to fill canvas
  // The marker timeline should match this - same viewport, same width
  const svgWidth = useMemo(() => {
    if (duration === 0 || usableWidth === 0 || visibleDuration === 0) return containerWidth;
    // SVG width matches the container width (same as waveform canvas)
    // The viewport determines what time range is shown, and it's stretched to fill the width
    return containerWidth;
  }, [containerWidth, duration, usableWidth, visibleDuration]);
  
  // Pixel-to-time conversion function - uses viewport for zoomed view
  const pixelToTime = useCallback((pixelX: number): number => {
    if (duration === 0 || usableWidth === 0 || visibleDuration === 0) return 0;
    // Adjust for padding
    const adjustedX = pixelX - TIME_LABEL_PADDING;
    const clampedX = Math.max(0, Math.min(adjustedX, usableWidth));
    // Convert pixel position to time within the viewport
    const pixelPerSecond = usableWidth / visibleDuration;
    const timeInViewport = clampedX / pixelPerSecond;
    // Convert to absolute time
    return viewportStart + timeInViewport;
  }, [duration, visibleDuration, usableWidth, viewportStart]);
  
  // Time-to-pixel conversion function - uses viewport for zoomed view
  // When zoomed, positions are based on viewport, matching waveform
  // Note: Does NOT clamp - allows markers extending beyond viewport to be visible
  const timeToPixel = useCallback((timeInSeconds: number): number => {
    // Safety checks to prevent NaN
    if (!isFinite(timeInSeconds) || isNaN(timeInSeconds)) return TIME_LABEL_PADDING;
    if (duration <= 0 || usableWidth <= 0 || visibleDuration <= 0) return TIME_LABEL_PADDING;
    if (isNaN(visibleDuration) || !isFinite(visibleDuration)) return TIME_LABEL_PADDING;
    
    // Convert absolute time to position within viewport
    const timeInViewport = timeInSeconds - viewportStart;
    const pixelPerSecond = usableWidth / visibleDuration;
    
    // Check for invalid pixelPerSecond
    if (!isFinite(pixelPerSecond) || isNaN(pixelPerSecond)) return TIME_LABEL_PADDING;
    
    const pixelPosition = timeInViewport * pixelPerSecond;
    
    // Final NaN check
    if (isNaN(pixelPosition) || !isFinite(pixelPosition)) return TIME_LABEL_PADDING;
    
    // Don't clamp - allow negative values and values beyond usableWidth
    // This allows markers that extend beyond viewport to be partially visible
    return Math.round(TIME_LABEL_PADDING + pixelPosition);
  }, [duration, visibleDuration, usableWidth, viewportStart]);
  
  // Calculate marker dimensions with NaN safety
  const getMarkerDimensions = useCallback((marker: Marker) => {
    const startX = timeToPixel(marker.start);
    const endX = timeToPixel(marker.end);
    const width = endX - startX;
    
    // Safety checks for NaN
    const safeX = isFinite(startX) && !isNaN(startX) ? startX : TIME_LABEL_PADDING;
    const safeWidth = isFinite(width) && !isNaN(width) ? Math.max(width, 2) : 2;
    
    return {
      x: safeX,
      width: safeWidth,
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
    
    // Generate markers within the viewport range
    for (let time = firstMarkerTime; time <= viewportEnd; time += interval) {
      const x = timeToPixel(time);
      // Only include markers that are within the visible container width
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
  }, []);
  
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
  
  // Handle SVG touch start (mobile marker creation)
  const handleSvgTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('g[data-marker-id]')) return;
    if (!svgRef.current || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const time = pixelToTime(x);
    const clampedTime = Math.max(0, Math.min(time, duration));
    
    if (!isCreatingMarker) {
      setIsCreatingMarker(true);
      setMarkerStartTime(clampedTime);
      setMarkerEndTime(clampedTime);
      setHasDragged(false);
    }
  }, [isCreatingMarker, duration, pixelToTime]);
  
  // Format time for display - defined early as it's used by multiple callbacks
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle SVG touch move
  const handleSvgTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const time = pixelToTime(x);
    const clampedTime = Math.max(0, Math.min(time, duration));
    
    if (isCreatingMarker) {
      setMarkerEndTime(clampedTime);
      if (markerStartTime !== null && Math.abs(clampedTime - markerStartTime) > 0.3) {
        setHasDragged(true);
      }
    }
    setHoverTime(clampedTime);
    setMousePosition({ x: touch.clientX, y: touch.clientY });
  }, [isCreatingMarker, markerStartTime, duration, pixelToTime]);
  
  // Handle SVG touch end - Creates marker immediately on mobile
  const handleSvgTouchEnd = useCallback(() => {
    if (isCreatingMarker && markerStartTime !== null && markerEndTime !== null && hasDragged) {
      const start = Math.min(markerStartTime, markerEndTime);
      const end = Math.max(markerStartTime, markerEndTime);
      // Create marker immediately without popup (minimum 0.5 seconds)
      if (end - start >= 0.5) {
        try {
          // Use quick marker creation - auto name and color
          MarkerManager.createQuickMarker(start, end);
          console.log('[MarkerTimeline] Quick marker created via touch drag:', formatTime(start), '-', formatTime(end));
        } catch (error) {
          console.error('[MarkerTimeline] Failed to create quick marker:', error);
        }
      }
    }
    // Reset all creation state
    setIsCreatingMarker(false);
    setMarkerStartTime(null);
    setMarkerEndTime(null);
    setHasDragged(false);
    setHoverTime(null);
    setMousePosition(null);
  }, [isCreatingMarker, markerStartTime, markerEndTime, hasDragged, formatTime]);

  
  // Handle mouse up (end marker creation) - Creates marker immediately on PC
  useEffect(() => {
    const handleMouseUp = () => {
      if (isCreatingMarker && markerStartTime !== null && markerEndTime !== null) {
        // Only create if user actually dragged (not just clicked)
        if (hasDragged) {
          // Ensure start < end
          const start = Math.min(markerStartTime, markerEndTime);
          const end = Math.max(markerStartTime, markerEndTime);
          
          // Minimum marker duration (0.5 seconds)
          if (end - start >= 0.5) {
            try {
              // Use quick marker creation - auto name and color
              MarkerManager.createQuickMarker(start, end);
              console.log('[MarkerTimeline] Quick marker created via mouse drag:', formatTime(start), '-', formatTime(end));
            } catch (error) {
              console.error('[MarkerTimeline] Failed to create quick marker:', error);
            }
          }
        }
        // Reset all creation state
        setIsCreatingMarker(false);
        setMarkerStartTime(null);
        setMarkerEndTime(null);
        setHasDragged(false);
      }
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isCreatingMarker, markerStartTime, markerEndTime, hasDragged, formatTime]);

  // Disable time tooltip (no hover effects)
  const showTimeTooltip = true;
  
  // Cancel marker creation (abort drag before release)
  const handleCancelMarker = useCallback(() => {
    setIsCreatingMarker(false);
    setMarkerStartTime(null);
    setMarkerEndTime(null);
    setHasDragged(false);
    setHoverTime(null);
    setMousePosition(null);
    setRequestMarkerCreation(false); // Clear request from MarkerPanel
  }, [setRequestMarkerCreation]);

  // Keyboard shortcut: Esc to cancel marker creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreatingMarker) {
        handleCancelMarker();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatingMarker, handleCancelMarker]);

  // Note: Marker creation from MarkerPanel button now creates quick markers directly
  // This listener is kept for backward compatibility but may be unused
  useEffect(() => {
    if (requestMarkerCreation && duration > 0) {
      // Clear the request - MarkerPanel handles creation directly now
      setRequestMarkerCreation(false);
    }
  }, [requestMarkerCreation, duration, setRequestMarkerCreation]);
  
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
  
  // Note: Auto-scroll is handled by Waveform component - both share the same viewport state
  // MarkerTimeline just responds to viewport changes from the shared store

  return (
    <div 
      ref={containerRef}
      className="marker-timeline"
      style={{
        position: 'relative',
        width: '100%',
        flex: '1 1 auto',
        minHeight: isMobile ? '100%' : '100px',
        maxHeight: isMobile ? '100%' : '250px',
        height: isMobile ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0, 102, 68, 0.08)',
        borderRadius: isMobile ? '0' : '16px',
        overflow: 'hidden',
        boxShadow: isMobile ? 'none' : 'var(--neu-raised)',
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

      {/* Time tooltip - Shows time range during drag or current time when hovering */}
      {showTimeTooltip && hoverTime !== null && mousePosition && (
        <div 
          className="time-tooltip"
          style={{
            position: 'fixed',
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y - 45}px`,
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: '#FFFFFF',
            padding: isCreatingMarker && hasDragged ? '8px 14px' : '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 10001, // Higher than marker tooltip
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
            border: isCreatingMarker && hasDragged 
              ? `2px solid ${MarkerManager.getNextColor()}` 
              : '1px solid rgba(212, 175, 55, 0.4)',
            fontFamily: 'monospace',
          }}
        >
          {isCreatingMarker && hasDragged && markerStartTime !== null && markerEndTime !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Creating marker</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#4CAF50' }}>{formatTime(Math.min(markerStartTime, markerEndTime))}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>→</span>
                <span style={{ color: '#FF9800' }}>{formatTime(Math.max(markerStartTime, markerEndTime))}</span>
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                ({formatTime(Math.abs(markerEndTime - markerStartTime))} duration)
              </div>
            </div>
          ) : (
            formatTime(hoverTime)
          )}
        </div>
      )}
      
      {/* Note: Marker creation form removed - using quick marker creation now */}
      {/* Markers can be edited via the Edit button in MarkerPanel */}
      
      {/* Cancel button during marker creation - allows aborting drag before release */}
      {isCreatingMarker && hasDragged && markerStartTime !== null && markerEndTime !== null && (
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
              padding: '0.4rem 0.8rem',
              background: 'rgba(255, 68, 68, 0.85)',
              border: 'none',
              borderRadius: '6px',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
              transition: 'all 0.2s ease',
              boxShadow: 'var(--neu-raised)',
            }}
            title="Cancel (Esc)"
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Container for marker timeline - matches waveform width, no scrollbar */}
      <div
        style={{
          width: '100%',
          flex: '1 1 auto',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
      {/* Render SVG - width matches container (same as waveform) */}
      {containerWidth > 0 && duration > 0 && (
        <svg 
          ref={svgRef}
          width={svgWidth}
          height={Math.min(svgHeight, TIME_GRID_HEIGHT + MAX_MARKER_AREA_HEIGHT)}
          style={{ 
            display: 'block', 
            cursor: isCreatingMarker ? 'crosshair' : 'default',
            overflow: 'visible',
            minHeight: '0',
            width: '100%',
            flexShrink: 0
          }}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
          onMouseDown={handleSvgMouseDown}
          onTouchStart={handleSvgTouchStart}
          onTouchMove={handleSvgTouchMove}
          onTouchEnd={handleSvgTouchEnd}
        >
          {/* Time Grid Background */}
          <rect
            x={0}
            y={0}
            width={svgWidth}
            height={TIME_GRID_HEIGHT}
            fill="rgba(0, 0, 0, 0.3)"
          />
          
          {/* Time Grid Line */}
          <line
            x1={TIME_LABEL_PADDING}
            y1={TIME_GRID_HEIGHT}
            x2={svgWidth - TIME_LABEL_PADDING}
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
          
          {/* Preview marker being created - shows next available color */}
          {previewMarkerDims && (
            <g>
              <rect
                x={previewMarkerDims.x}
                y={TIME_GRID_HEIGHT}
                width={previewMarkerDims.width}
                height={MARKER_HEIGHT}
                fill={MarkerManager.getNextColor()}
                opacity={0.5}
                stroke={MarkerManager.getNextColor()}
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
                  Release to create marker
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
                
                {/* Marker label removed - names not displayed on timeline per design */}
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
