// MarkerTimeline.tsx - Wilton - Week 1
// SVG-based timeline overlay for displaying markers

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/store';
import { Marker } from '../../types/types';

const MarkerTimeline: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Get markers and audio state from store
  const markers = useAppStore((state) => state.markers);
  const audio = useAppStore((state) => state.audio);
  const selectedMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const setSelectedMarkerId = useAppStore((state) => state.setSelectedMarkerId);
  const duration = audio.duration || 1; // Default to 1 second if no audio loaded

  // Handle window resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate marker position and width
  // Markers are point-based (timestamp), but we'll display them as small bars
  // For overlapping markers, we'll use a default width and stack them
  const getMarkerPosition = useCallback((marker: Marker) => {
    const startTime = marker.timestamp;
    // Default to 2% of timeline width or 2 seconds, whichever is smaller
    const defaultDuration = Math.min(2, duration * 0.02);
    const endTime = startTime + defaultDuration;
    const startPercent = (startTime / duration) * 100;
    const endPercent = (endTime / duration) * 100;
    const width = endPercent - startPercent;
    
    return {
      left: startPercent,
      width: Math.max(width, 0.5), // Minimum 0.5% width for visibility
      startTime,
      endTime
    };
  }, [duration]);

  // Group overlapping markers for stacking
  const groupOverlappingMarkers = useCallback((markers: Marker[]) => {
    if (markers.length === 0) return [];

    const sorted = [...markers].sort((a, b) => {
      const posA = getMarkerPosition(a);
      const posB = getMarkerPosition(b);
      return posA.left - posB.left;
    });

    const groups: Marker[][] = [];
    const currentGroup: Marker[] = [];
    let currentEnd = 0;

    sorted.forEach((marker) => {
      const pos = getMarkerPosition(marker);
      
      if (pos.left < currentEnd) {
        // Overlaps with current group
        currentGroup.push(marker);
        currentEnd = Math.max(currentEnd, pos.left + pos.width);
      } else {
        // New group
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup.length = 0;
        currentGroup.push(marker);
        currentEnd = pos.left + pos.width;
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }, [getMarkerPosition]);

  // Get stack level for a marker (0 = bottom, increases upward)
  const getStackLevel = useCallback((marker: Marker, allMarkers: Marker[]) => {
    const groups = groupOverlappingMarkers(allMarkers);
    
    for (let i = 0; i < groups.length; i++) {
      const index = groups[i].findIndex(m => m.id === marker.id);
      if (index !== -1) {
        return index;
      }
    }
    return 0;
  }, [groupOverlappingMarkers]);

  // Handle marker click
  const handleMarkerClick = (markerId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedMarkerId(markerId);
  };

  // Handle marker hover
  const handleMarkerHover = (marker: Marker, event: React.MouseEvent) => {
    setHoveredMarkerId(marker.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top - 30 // Position above cursor
      });
    }
  };

  // Handle marker mouse leave
  const handleMarkerLeave = () => {
    setHoveredMarkerId(null);
  };

  // Get marker color
  const getMarkerColor = (marker: Marker): string => {
    if (marker.color) return marker.color;
    
    // Default colors based on marker index
    const colors = [
      '#DE2910', // Kenyan red
      '#006644', // Kenyan green
      '#FFD700', // Gold
      '#FF6B6B', // Light red
      '#4ECDC4', // Teal
      '#95E1D3', // Mint
      '#F38181', // Coral
      '#AA96DA', // Purple
    ];
    
    const index = markers.findIndex(m => m.id === marker.id);
    return colors[index % colors.length];
  };

  // Calculate bar height based on stack level
  const getBarHeight = (stackLevel: number): number => {
    const baseHeight = 24;
    const maxHeight = 40;
    const stackOffset = stackLevel * 4;
    return Math.min(baseHeight + stackOffset, maxHeight);
  };

  // Calculate bar Y position based on stack level
  const getBarY = (stackLevel: number, barHeight: number): number => {
    const timelineHeight = 60;
    const padding = 8;
    const availableHeight = timelineHeight - (padding * 2);
    const maxStack = Math.max(...markers.map(m => getStackLevel(m, markers)), 0);
    
    if (maxStack === 0) {
      // Center if no stacking
      return (timelineHeight - barHeight) / 2;
    }
    
    // Stack from bottom
    const bottomY = timelineHeight - padding - barHeight;
    const stackSpacing = 4;
    return bottomY - (stackLevel * (barHeight + stackSpacing));
  };

  if (!duration || duration <= 0) {
    return (
      <div 
        ref={containerRef}
        className="marker-timeline" 
        style={{ 
          width: '100%', 
          height: '60px',
          background: 'rgba(0, 102, 68, 0.1)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 102, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--transition-normal)'
        }}
      >
        <div style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.85rem', 
          opacity: 0.6
        }}>
          Load audio to see markers
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="marker-timeline" 
      style={{ 
        width: '100%', 
        height: '60px',
        background: 'rgba(0, 102, 68, 0.15)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 102, 68, 0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '0.5rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0, 102, 68, 0.2)',
        transition: 'all var(--transition-normal)'
      }}
    >
      {/* SVG Timeline */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      >
        {/* Time markers (optional - can be enabled) */}
        {duration > 0 && Array.from({ length: 5 }).map((_, i) => {
          const timePercent = (i / 4) * 100;
          return (
            <line
              key={`time-${i}`}
              x1={`${timePercent}%`}
              y1="0"
              x2={`${timePercent}%`}
              y2="100%"
              stroke="rgba(0, 102, 68, 0.2)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          );
        })}
      </svg>

      {/* Marker Bars */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {markers.map((marker) => {
          const position = getMarkerPosition(marker);
          const stackLevel = getStackLevel(marker, markers);
          const barHeight = getBarHeight(stackLevel);
          const barY = getBarY(stackLevel, barHeight);
          const isSelected = selectedMarkerId === marker.id;
          const isHovered = hoveredMarkerId === marker.id;
          const markerColor = getMarkerColor(marker);

          return (
            <div
              key={marker.id}
              onClick={(e) => handleMarkerClick(marker.id, e)}
              onMouseEnter={(e) => handleMarkerHover(marker, e)}
              onMouseLeave={handleMarkerLeave}
              style={{
                position: 'absolute',
                left: `${position.left}%`,
                width: `${position.width}%`,
                top: `${barY}px`,
                height: `${barHeight}px`,
                background: markerColor,
                borderRadius: '4px',
                cursor: 'pointer',
                border: isSelected 
                  ? '2px solid #FFD700' // Gold border for selected
                  : isHovered 
                    ? '2px solid rgba(255, 215, 0, 0.6)' 
                    : '1px solid rgba(0, 0, 0, 0.2)',
                boxShadow: isSelected
                  ? '0 0 8px rgba(255, 215, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.3)'
                  : isHovered
                    ? '0 0 4px rgba(255, 215, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)'
                    : '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease',
                transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                zIndex: isSelected ? 10 : isHovered ? 5 : stackLevel + 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {/* Marker Label (if space allows) */}
              {position.width > 5 && (
                <span
                  style={{
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 4px',
                    pointerEvents: 'none'
                  }}
                >
                  {marker.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Hover Tooltip */}
      {hoveredMarkerId && (() => {
        const marker = markers.find(m => m.id === hoveredMarkerId);
        if (!marker) return null;
        const position = getMarkerPosition(marker);
        
        return (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              color: '#FFFFFF',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '500',
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              whiteSpace: 'nowrap',
              maxWidth: '200px'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {marker.label}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
              {position.startTime.toFixed(2)}s
              {position.endTime && ` - ${position.endTime.toFixed(2)}s`}
            </div>
            {marker.notes && (
              <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.25rem' }}>
                {marker.notes}
              </div>
            )}
          </div>
        );
      })()}

      {/* Empty State */}
      {markers.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          opacity: 0.5,
          pointerEvents: 'none'
        }}>
          No markers yet
        </div>
      )}
    </div>
  );
};

export default MarkerTimeline;

