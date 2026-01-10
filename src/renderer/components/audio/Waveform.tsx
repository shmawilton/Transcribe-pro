// Waveform.tsx - Julius - Week 1
// Waveform rendering component using Canvas

import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../store/store';

/**
 * Peak data structure
 * Represents min/max amplitude values for a single pixel position
 */
interface Peak {
  min: number;
  max: number;
}

/**
 * Stereo peaks - separate peaks for left and right channels
 */
interface StereoPeaks {
  left: Peak[];
  right: Peak[];
}

/**
 * Cache metadata to track when peaks need regeneration
 */
interface PeakCache {
  peaks: Peak[] | StereoPeaks | null;
  bufferId: string | null; // Track buffer reference
  canvasWidth: number;
  zoomLevel: number;
  isStereo: boolean;
}

const Waveform: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);
  
  // Get audio buffer, zoom level, and playback state from Zustand store
  const audioBuffer = useAppStore((state) => state.audio.buffer);
  const zoomLevel = useAppStore((state) => state.ui.zoomLevel);
  const currentTime = useAppStore((state) => state.audio.currentTime);
  const duration = useAppStore((state) => state.audio.duration);
  const isPlaying = useAppStore((state) => state.audio.isPlaying);
  
  // Cache peaks outside component state to avoid unnecessary re-renders
  const peakCacheRef = useRef<PeakCache>({
    peaks: null,
    bufferId: null,
    canvasWidth: 0,
    zoomLevel: 1,
    isStereo: false,
  });

  /**
   * Measure container and set canvas dimensions
   * Handles device pixel ratio for high-DPI screens
   */
  const updateCanvasSize = () => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const rect = container.getBoundingClientRect();
    
    // Get CSS dimensions
    const cssWidth = Math.max(1, rect.width); // Ensure at least 1px
    const cssHeight = Math.max(1, rect.height); // Ensure at least 1px

    // Get device pixel ratio for high-DPI screens
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Set canvas internal size (actual pixels)
    const internalWidth = cssWidth * devicePixelRatio;
    const internalHeight = cssHeight * devicePixelRatio;

    // Set canvas display size (CSS pixels)
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    // Set canvas internal resolution
    canvas.width = internalWidth;
    canvas.height = internalHeight;

    // Get 2D drawing context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale the context by devicePixelRatio
    // This allows us to draw in CSS pixels, but render at physical resolution
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Update state for drawing logic
    setCanvasSize({ width: cssWidth, height: cssHeight });

    // Get current audio buffer from store (always fresh)
    const currentBuffer = useAppStore.getState().audio.buffer;
    
    // Redraw waveform after resize
    drawWaveformWithBuffer(ctx, cssWidth, cssHeight, currentBuffer);
  };

  /**
   * Generate peaks from AudioBuffer for a single channel
   * Converts millions of raw samples into manageable peaks (one per pixel)
   * Optimized for large files by sampling at intervals when samples/pixel is high
   * 
   * @param channelData - Float32Array of audio samples for one channel
   * @param canvasWidth - Width of canvas in pixels
   * @returns Array of peaks, one per pixel
   */
  const generatePeaksForChannel = (channelData: Float32Array, canvasWidth: number): Peak[] => {
    if (!channelData || canvasWidth <= 0 || channelData.length === 0) {
      return [];
    }

    // Ensure width is an integer for array allocation
    const width = Math.floor(canvasWidth);
    if (width <= 0) return [];
    
    const totalSamples = channelData.length;
    const samplesPerPixel = totalSamples / width;
    
    // Pre-allocate array for speed
    const peaks: Peak[] = new Array(width);
    
    // For very large sample counts per pixel, sample at intervals for speed
    // 500 samples per pixel is enough for accurate visualization
    const maxSamplesToCheck = 500;
    const step = samplesPerPixel > maxSamplesToCheck ? Math.floor(samplesPerPixel / maxSamplesToCheck) : 1;

    // Loop through each pixel position
    for (let pixelIndex = 0; pixelIndex < width; pixelIndex++) {
      const startSample = Math.floor(pixelIndex * samplesPerPixel);
      const endSample = Math.min(
        Math.floor((pixelIndex + 1) * samplesPerPixel),
        totalSamples
      );
      
      if (startSample >= totalSamples || endSample <= startSample) {
        peaks[pixelIndex] = { min: 0, max: 0 };
        continue;
      }
      
      // Initialize min/max with first sample
      let min = channelData[startSample];
      let max = channelData[startSample];
      
      // Loop through samples with step (faster for large ranges)
      for (let i = startSample; i < endSample; i += step) {
        const sample = channelData[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      
      peaks[pixelIndex] = { min, max };
    }

    return peaks;
  };

  /**
   * Generate peaks from AudioBuffer
   * Supports both mono and stereo audio
   * 
   * @param buffer - AudioBuffer containing raw audio samples
   * @param canvasWidth - Width of canvas in pixels
   * @returns Peaks array (mono) or StereoPeaks object (stereo)
   */
  const generatePeaks = (buffer: AudioBuffer, canvasWidth: number): Peak[] | StereoPeaks => {
    if (!buffer || canvasWidth <= 0) {
      console.warn('[Waveform] generatePeaks: Invalid input', { buffer: !!buffer, canvasWidth });
      return [];
    }

    const numberOfChannels = buffer.numberOfChannels;
    
    // Mono: use only left channel (channel 0)
    if (numberOfChannels === 1) {
      const channelData = buffer.getChannelData(0);
      return generatePeaksForChannel(channelData, canvasWidth);
    }
    
    // Stereo: generate peaks for both channels
    const leftChannelData = buffer.getChannelData(0);
    const rightChannelData = buffer.getChannelData(1);
    
    return {
      left: generatePeaksForChannel(leftChannelData, canvasWidth),
      right: generatePeaksForChannel(rightChannelData, canvasWidth),
    };
  };

  /**
   * Get cached peaks or generate new ones if needed
   * Only regenerates when:
   * - New audio is loaded (different AudioBuffer)
   * - Zoom level changes (different samples per pixel)
   * - Canvas width changes (different number of pixels)
   * 
   * Does NOT regenerate on:
   * - Window resize (same peaks, different display size)
   * - Playhead movement (peaks don't change)
   * - Redraw requests (reuse cached peaks)
   */
  const getPeaks = (buffer: AudioBuffer | undefined, canvasWidth: number, currentZoomLevel: number): Peak[] | StereoPeaks | null => {
    if (!buffer || canvasWidth <= 0) {
      return null;
    }

    const cache = peakCacheRef.current;
    const isStereo = buffer.numberOfChannels > 1;
    
    // Create a unique identifier for this buffer (using buffer properties)
    // This helps detect when a new audio file is loaded
    const bufferId = `${buffer.length}-${buffer.sampleRate}-${buffer.duration}-${buffer.numberOfChannels}`;
    
    // Check if we need to regenerate peaks
    const needsRegeneration = 
      cache.bufferId !== bufferId ||
      cache.canvasWidth !== canvasWidth ||
      cache.zoomLevel !== currentZoomLevel ||
      cache.isStereo !== isStereo;

    if (needsRegeneration) {
      console.log('[Waveform] Regenerating peaks:', {
        reason: cache.bufferId !== bufferId ? 'new audio' : 
                cache.canvasWidth !== canvasWidth ? 'canvas width changed' : 
                cache.isStereo !== isStereo ? 'channel count changed' :
                'zoom level changed',
        bufferId,
        canvasWidth,
        zoomLevel: currentZoomLevel,
        isStereo,
      });

      // Generate new peaks
      const peaks = generatePeaks(buffer, canvasWidth);
      
      // Log peak generation (minimal logging)
      if (Array.isArray(peaks)) {
        console.log('[Waveform] Generated mono peaks:', peaks.length);
      } else if (peaks && 'left' in peaks) {
        console.log('[Waveform] Generated stereo peaks:', peaks.left.length, peaks.right.length);
      }
      
      // Update cache
      cache.peaks = peaks;
      cache.bufferId = bufferId;
      cache.canvasWidth = canvasWidth;
      cache.zoomLevel = currentZoomLevel;
      cache.isStereo = isStereo;
    }

    return cache.peaks;
  };

  /**
   * Draw waveform on canvas using cached peaks
   * @param ctx - 2D rendering context
   * @param width - Canvas width in CSS pixels
   * @param height - Canvas height in CSS pixels
   * @param buffer - AudioBuffer to draw (optional, uses current audioBuffer if not provided)
   */
  const drawWaveformWithBuffer = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    buffer?: AudioBuffer | undefined
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Use provided buffer or current audioBuffer from closure
    const bufferToUse = buffer !== undefined ? buffer : audioBuffer;

    // Draw dark background (use actual color, not CSS variable - canvas doesn't support CSS vars)
    ctx.fillStyle = '#0F0F0F';
    ctx.fillRect(0, 0, width, height);

    if (!bufferToUse) {
      // Draw placeholder when no audio is loaded
      ctx.fillStyle = '#E85A4A'; // Kenyan red light
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No audio loaded', width / 2, height / 2);
      return;
    }

    // Align with MarkerTimeline: use same padding calculation
    // MarkerTimeline uses TIME_LABEL_PADDING = 50 and calculates usableWidth
    const TIME_LABEL_PADDING = 50;
    const usableWidth = Math.max(0, width - (TIME_LABEL_PADDING * 2));
    
    // Get cached peaks (or generate if needed) - use usableWidth to match timeline
    const peaks = getPeaks(bufferToUse, usableWidth, zoomLevel);
    
    if (!peaks || (Array.isArray(peaks) && peaks.length === 0)) {
      return;
    }

    const isStereo = bufferToUse.numberOfChannels > 1;
    const maxAmplitude = 1.0; // Use full amplitude range for maximum visibility
    
    // Get fresh values from store for animation frame updates
    const storeState = useAppStore.getState();
    const actualCurrentTime = storeState.audio.currentTime;
    const actualDuration = storeState.audio.duration;
    
    // Calculate playback progress for gradient (using usableWidth to match timeline)
    const progress = actualDuration > 0 ? actualCurrentTime / actualDuration : 0;
    const progressX = TIME_LABEL_PADDING + (usableWidth * progress);

    if (isStereo && !Array.isArray(peaks) && 'left' in peaks && 'right' in peaks) {
      // Stereo drawing: split canvas in half
      const stereoPeaks = peaks as StereoPeaks;
      const halfHeight = height / 2;
      
      // Draw left channel (top half) with gradient - offset by padding
      drawChannelWithGradient(ctx, stereoPeaks.left, usableWidth, halfHeight, TIME_LABEL_PADDING, 0, maxAmplitude, progressX);
      
      // Draw divider line between channels (very subtle)
      ctx.strokeStyle = 'rgba(222, 41, 16, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, halfHeight);
      ctx.lineTo(width, halfHeight);
      ctx.stroke();
      
      // Draw right channel (bottom half) with gradient - offset by padding
      drawChannelWithGradient(ctx, stereoPeaks.right, usableWidth, halfHeight, TIME_LABEL_PADDING, halfHeight, maxAmplitude, progressX);
      
      // Draw center lines for each channel (spanning full width)
      // Make them more subtle so they don't interfere with waveform visibility
      ctx.strokeStyle = 'rgba(222, 41, 16, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      // Top channel center (quarter height)
      ctx.moveTo(0, halfHeight / 2);
      ctx.lineTo(width, halfHeight / 2);
      // Bottom channel center (three-quarter height)
      ctx.moveTo(0, halfHeight + halfHeight / 2);
      ctx.lineTo(width, halfHeight + halfHeight / 2);
      ctx.stroke();
    } else {
      // Mono drawing: use full canvas height, centered - offset by padding
      const monoPeaks = Array.isArray(peaks) ? peaks : [];
      if (monoPeaks.length > 0) {
        drawChannelWithGradient(ctx, monoPeaks, usableWidth, height, TIME_LABEL_PADDING, 0, maxAmplitude, progressX);
        
        // Draw center line (spanning full width)
        // Make it more subtle so it doesn't interfere with waveform visibility
        ctx.strokeStyle = 'rgba(222, 41, 16, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
    }
  };

  /**
   * Draw a single channel's waveform with gradient based on playback progress
   * Handles coordinate system conversion: canvas Y-axis is inverted (0 at top, increases downward)
   * 
   * @param ctx - 2D rendering context
   * @param peaks - Array of peaks for this channel
   * @param width - Canvas width
   * @param channelHeight - Height available for this channel
   * @param offsetY - Y offset for this channel (0 for mono, 0 or halfHeight for stereo)
   * @param maxAmplitude - Scale factor for amplitude visualization
   * @param progressX - X position of playback progress (for gradient)
   */
  const drawChannelWithGradient = (
    ctx: CanvasRenderingContext2D,
    peaks: Peak[],
    width: number,
    channelHeight: number,
    offsetX: number,
    offsetY: number,
    maxAmplitude: number,
    progressX: number
  ) => {
    if (peaks.length === 0) return;

    const centerY = offsetY + channelHeight / 2;
    const halfHeight = channelHeight / 2;
    
    // Pre-calculate pixel width outside loop for performance
    const pixelWidth = width / peaks.length;

    // Find the maximum absolute amplitude in the peaks for normalization
    let maxAbsAmplitude = 0;
    for (let i = 0; i < peaks.length; i++) {
      maxAbsAmplitude = Math.max(
        maxAbsAmplitude,
        Math.abs(peaks[i].min),
        Math.abs(peaks[i].max)
      );
    }

    // Normalize amplitude to use full range
    // Always normalize to make the waveform fill the available space
    const amplitudeScale = maxAbsAmplitude > 0.001 ? 1 / maxAbsAmplitude : 1;
    
    // Waveform bar settings - create rounded bars like the reference image
    const barWidth = Math.max(3, Math.floor(pixelWidth * 0.8)); // 80% of pixel width, min 3px
    const barGap = Math.max(1, pixelWidth - barWidth); // Small gap between bars
    const verticalScale = 0.9; // Use 90% of channel height
    
    // Draw each peak as a rounded vertical bar
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const x = offsetX + (i * pixelWidth);
      
      // Normalize the peak amplitude
      const normalizedMax = Math.abs(peak.max) * amplitudeScale;
      const normalizedMin = Math.abs(peak.min) * amplitudeScale;
      const peakAmplitude = Math.max(normalizedMax, normalizedMin);
      
      // Calculate bar height (symmetrical around center)
      // Minimum height ensures visibility even for quiet audio
      const minBarHeight = 4;
      const maxBarHeight = halfHeight * verticalScale * maxAmplitude;
      const barHeight = Math.max(minBarHeight, peakAmplitude * maxBarHeight * 2);
      
      // Calculate Y position (centered on the centerY line)
      const yTop = centerY - (barHeight / 2);
      
      // Determine color based on playback progress
      // x is the position of this bar, progressX is where playback has reached
      const isPlayed = x < progressX;
      
      let color: string;
      if (isPlayed) {
        // Played portion: gradient from white → green → red based on position
        const playedRatio = progressX > offsetX ? (x - offsetX) / (progressX - offsetX) : 0;
        
        // Smooth gradient: white (start) → green (middle) → red (near playhead)
        if (playedRatio < 0.4) {
          // White to Green
          const t = playedRatio / 0.4;
          const r = Math.round(255 - 255 * t);
          const g = Math.round(255 - (255 - 180) * t);
          const b = Math.round(255 - (255 - 100) * t);
          color = `rgb(${r}, ${g}, ${b})`;
        } else if (playedRatio < 0.7) {
          // Green to Red
          const t = (playedRatio - 0.4) / 0.3;
          const r = Math.round(0 + 220 * t);
          const g = Math.round(180 - 140 * t);
          const b = Math.round(100 - 80 * t);
          color = `rgb(${r}, ${g}, ${b})`;
        } else {
          // Red (near playhead) - brightest
          color = '#DE2910';
        }
      } else {
        // Unplayed portion: grey
        color = '#555555';
      }
      
      // Draw rounded bar
      ctx.fillStyle = color;
      const radius = Math.min(barWidth / 2, barHeight / 2);
      
      // Draw rounded rectangle (with fallback for older browsers)
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, yTop, barWidth, barHeight, radius);
      } else {
        // Fallback: draw regular rectangle
        ctx.rect(x, yTop, barWidth, barHeight);
      }
      ctx.fill();
    }
  };

  /**
   * Initialize canvas and set up resize listener
   */
  useEffect(() => {
    // Initial size setup
    updateCanvasSize();

    // Handle window resize
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup: remove event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  /**
   * Redraw waveform when audio buffer, zoom level, or canvas size changes (non-playback updates)
   */
  useEffect(() => {
    if (!canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return;
    if (isPlaying) return; // Let animation frame handle this during playback

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Reset transform and redraw
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    drawWaveformWithBuffer(ctx, canvasSize.width, canvasSize.height, audioBuffer);
  }, [audioBuffer, zoomLevel, canvasSize, duration]);

  /**
   * Animation frame loop for smooth playback updates
   */
  useEffect(() => {
    if (!isPlaying) {
      // Do one final redraw when playback stops
      if (canvasRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const devicePixelRatio = window.devicePixelRatio || 1;
          ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
          drawWaveformWithBuffer(ctx, canvasSize.width, canvasSize.height, audioBuffer);
        }
      }
      return;
    }

    const animate = () => {
      if (!canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      
      // Get latest buffer from store for fresh currentTime
      const currentBuffer = useAppStore.getState().audio.buffer;
      drawWaveformWithBuffer(ctx, canvasSize.width, canvasSize.height, currentBuffer);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, canvasSize, audioBuffer]);

  return (
    <div 
      ref={containerRef}
      className="waveform-container" 
      style={{ 
        width: '100%', 
        flex: '0 0 45%',
        minHeight: '0',
        background: 'var(--bg-primary)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(222, 41, 16, 0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(222, 41, 16, 0.2)',
        transition: 'all var(--transition-normal)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};

export default Waveform;









