// MarkerTimeline.tsx - Wilton - Week 1
// SVG-based timeline overlay for displaying markers

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/store';
import { Marker } from '../../types/types';

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
  const [showMarkerForm, setShowMarkerForm] = useState(false);
  const [newMarkerName, setNewMarkerName] = useState('');
  const [newMarkerColor, setNewMarkerColor] = useState('#4CAF50');
  
  // Get data from Zustand store
  const markers = useAppStore((state) => state.markers);
  const duration = useAppStore((state) => state.audio.duration || 0);
  const activeMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const setActiveMarker = useAppStore((state) => state.setSelectedMarkerId);
  const addMarker = useAppStore((state) => state.addMarker);
  
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
  
  // Pixel-to-time conversion function (uses usable width)
  const pixelToTime = useCallback((pixelX: number): number => {
    if (duration === 0 || usableWidth === 0) return 0;
    // Adjust for padding
    const adjustedX = pixelX - TIME_LABEL_PADDING;
    const clampedX = Math.max(0, Math.min(adjustedX, usableWidth));
    return (clampedX / usableWidth) * duration;
  }, [duration, usableWidth]);
  
  // Time-to-pixel conversion function (uses usable width)
  const timeToPixel = useCallback((timeInSeconds: number): number => {
    if (duration === 0 || usableWidth === 0) return TIME_LABEL_PADDING;
    return TIME_LABEL_PADDING + (timeInSeconds / duration) * usableWidth;
  }, [duration, usableWidth]);
  
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
  
  // Generate time grid markers
  const timeGridMarkers = useMemo(() => {
    if (duration === 0 || usableWidth === 0) return [];
    
    // Calculate appropriate interval based on duration
    let interval = 30; // default 30 seconds
    if (duration > 600) interval = 60; // 1 minute for > 10 min
    if (duration > 1800) interval = 300; // 5 minutes for > 30 min
    if (duration < 60) interval = 10; // 10 seconds for < 1 min
    if (duration < 30) interval = 5; // 5 seconds for < 30 sec
    
    const markers = [];
    for (let time = 0; time <= duration; time += interval) {
      const x = timeToPixel(time);
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      markers.push({ time, x, label });
    }
    return markers;
  }, [duration, usableWidth, timeToPixel]);
  
  // Handle SVG mouse move (for hover tooltip and drag)
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x);
    
    setHoverX(x);
    setHoverTime(time);
    
    // If creating marker, update end time
    if (isCreatingMarker && markerStartTime !== null) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      setMarkerEndTime(clampedTime);
    }
  }, [isCreatingMarker, markerStartTime, duration, pixelToTime]);
  
  // Handle SVG mouse leave
  const handleSvgMouseLeave = useCallback(() => {
    setHoverTime(null);
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
  
  // Handle marker form submission
  const handleCreateMarker = useCallback(() => {
    if (markerStartTime === null || markerEndTime === null || !newMarkerName.trim()) {
      return;
    }
    
    const start = Math.min(markerStartTime, markerEndTime);
    const end = Math.max(markerStartTime, markerEndTime);
    
    // Validate time range
    if (start < 0 || end > duration || start >= end) {
      alert('Invalid time range. Please ensure start < end and both are within 0:00 to ' + formatTime(duration));
      return;
    }
    
    const newMarker: Marker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      start,
      end,
      name: newMarkerName.trim(),
      color: newMarkerColor,
    };
    
    addMarker(newMarker);
    
    // Reset state
    setIsCreatingMarker(false);
    setMarkerStartTime(null);
    setMarkerEndTime(null);
    setShowMarkerForm(false);
    setNewMarkerName('');
    setNewMarkerColor('#4CAF50');
  }, [markerStartTime, markerEndTime, newMarkerName, newMarkerColor, duration, addMarker, formatTime]);
  
  // Cancel marker creation
  const handleCancelMarker = useCallback(() => {
    setIsCreatingMarker(false);
    setMarkerStartTime(null);
    setMarkerEndTime(null);
    setShowMarkerForm(false);
    setNewMarkerName('');
    setNewMarkerColor('#4CAF50');
  }, []);
  
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
      {/* Hover tooltip for timeline */}
      {hoverTime !== null && !isCreatingMarker && (
        <div 
          className="marker-tooltip"
          style={{
            position: 'absolute',
            left: `${hoverX}px`,
            top: '-35px',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: '#FFD700',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
          }}
        >
          {formatTimePrecise(hoverTime)}
        </div>
      )}
      
      {/* Hover tooltip for existing markers */}
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
              padding: '2rem',
              minWidth: '450px',
              maxWidth: '90vw',
              maxHeight: 'calc(100vh - 4rem)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.95), 0 0 40px rgba(0, 102, 68, 0.3)',
              overflow: 'auto',
              margin: 'auto',
              transform: 'scale(1.02)',
              animation: 'modalPopIn 0.3s ease-out',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: 'var(--text-accent-green)', marginBottom: '1.5rem', fontSize: '1.4rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive", fontWeight: 'normal' }}>
              Create Marker
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.5rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                Marker Name:
              </label>
              <input
                type="text"
                value={newMarkerName}
                onChange={(e) => setNewMarkerName(e.target.value)}
                placeholder="e.g., Intro, Verse 1, Chorus..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--text-accent-green)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
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
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.5rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                Color:
              </label>
              <input
                type="color"
                value={newMarkerColor}
                onChange={(e) => setNewMarkerColor(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  cursor: 'pointer',
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                Time Range:
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'normal', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                {formatTime(Math.min(markerStartTime, markerEndTime))} - {formatTime(Math.max(markerStartTime, markerEndTime))}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive" }}>
                Duration: {formatTime(Math.abs(markerEndTime - markerStartTime))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelMarker}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
                  fontWeight: 'normal',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMarker}
                disabled={!newMarkerName.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: newMarkerName.trim() ? 'var(--text-accent-green)' : 'rgba(0, 102, 68, 0.3)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  cursor: newMarkerName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  fontWeight: 'normal',
                  fontFamily: "'Gochi Hand', 'Annie Use Your Telescope', cursive",
                  transition: 'all 0.2s ease',
                  boxShadow: newMarkerName.trim() ? '0 4px 12px rgba(0, 102, 68, 0.4)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (newMarkerName.trim()) {
                    e.currentTarget.style.background = 'var(--color-kenyan-green-dark)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 102, 68, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (newMarkerName.trim()) {
                    e.currentTarget.style.background = 'var(--text-accent-green)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 68, 0.4)';
                  }
                }}
              >
                Create Marker
              </button>
            </div>
          </div>
        </div>,
        document.body
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
