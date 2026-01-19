// useSmoothViewport.ts - Smooth animated viewport transitions for zoom and scroll
import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/store';

interface AnimationOptions {
  duration?: number;
  easing?: 'linear' | 'easeOut' | 'easeOutQuad' | 'easeOutCubic' | 'easeInOut' | 'easeOutExpo';
}

// Easing functions for smooth animations
const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 2),
  easeOutQuad: (t: number) => 1 - Math.pow(1 - t, 2),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
};

export function useSmoothViewport() {
  const animationRef = useRef<number | null>(null);
  const setViewport = useAppStore((state) => state.setViewport);
  const setZoomLevel = useAppStore((state) => state.setZoomLevel);

  /**
   * Animate viewport from current position to target position
   */
  const animateViewport = useCallback((
    targetStart: number,
    targetEnd: number,
    options: AnimationOptions = {}
  ) => {
    const { duration = 300, easing = 'easeOutCubic' } = options;
    const easingFn = easingFunctions[easing];

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Get current viewport state
    const currentState = useAppStore.getState();
    const startViewportStart = currentState.ui.viewportStart;
    const startViewportEnd = currentState.ui.viewportEnd;

    // If already at target, no animation needed
    if (
      Math.abs(startViewportStart - targetStart) < 0.01 &&
      Math.abs(startViewportEnd - targetEnd) < 0.01
    ) {
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      // Interpolate viewport values
      const newStart = startViewportStart + (targetStart - startViewportStart) * easedProgress;
      const newEnd = startViewportEnd + (targetEnd - startViewportEnd) * easedProgress;

      setViewport(newStart, newEnd);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure final values are exact
        setViewport(targetStart, targetEnd);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [setViewport]);

  /**
   * Animate zoom level change with smooth viewport adjustment
   */
  const animateZoom = useCallback((
    targetZoomLevel: number,
    centerTime?: number,
    options: AnimationOptions = {}
  ) => {
    const { duration = 250, easing = 'easeOutCubic' } = options;
    const easingFn = easingFunctions[easing];

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Get current state
    const currentState = useAppStore.getState();
    const duration_ = currentState.audio.duration;
    const startZoom = currentState.ui.zoomLevel;
    const startViewportStart = currentState.ui.viewportStart;
    const startViewportEnd = currentState.ui.viewportEnd;
    const currentTime = currentState.audio.currentTime;

    if (duration_ <= 0) return;

    // Use provided center or current playhead position or viewport center
    const center = centerTime ?? currentTime ?? (startViewportStart + startViewportEnd) / 2;

    // Calculate target viewport based on target zoom
    const targetVisibleDuration = duration_ / targetZoomLevel;
    let targetStart = Math.max(0, center - targetVisibleDuration / 2);
    let targetEnd = targetStart + targetVisibleDuration;

    // Clamp to valid range
    if (targetEnd > duration_) {
      targetEnd = duration_;
      targetStart = Math.max(0, targetEnd - targetVisibleDuration);
    }

    // If zooming to 1 (reset), show full duration
    if (targetZoomLevel === 1) {
      targetStart = 0;
      targetEnd = duration_;
    }

    const startTime = performance.now();

    const animate = (currentTimeMs: number) => {
      const elapsed = currentTimeMs - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      // Interpolate zoom and viewport values
      const newZoom = startZoom + (targetZoomLevel - startZoom) * easedProgress;
      const newStart = startViewportStart + (targetStart - startViewportStart) * easedProgress;
      const newEnd = startViewportEnd + (targetEnd - startViewportEnd) * easedProgress;

      setZoomLevel(newZoom);
      setViewport(newStart, newEnd);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure final values are exact
        setZoomLevel(targetZoomLevel);
        setViewport(targetStart, targetEnd);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [setViewport, setZoomLevel]);

  /**
   * Smoothly scroll viewport to a specific time (auto-scroll during playback)
   */
  const animateScrollToTime = useCallback((
    targetTime: number,
    options: AnimationOptions = {}
  ) => {
    const { duration = 200, easing = 'easeOutQuad' } = options;
    const easingFn = easingFunctions[easing];

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const currentState = useAppStore.getState();
    const duration_ = currentState.audio.duration;
    const startViewportStart = currentState.ui.viewportStart;
    const startViewportEnd = currentState.ui.viewportEnd;
    const visibleDuration = startViewportEnd - startViewportStart;

    if (duration_ <= 0 || visibleDuration <= 0) return;

    // Calculate target viewport to keep time visible with margin
    const margin = visibleDuration * 0.2;
    let targetStart = targetTime - margin;
    let targetEnd = targetStart + visibleDuration;

    // Clamp to valid range
    if (targetStart < 0) {
      targetStart = 0;
      targetEnd = visibleDuration;
    }
    if (targetEnd > duration_) {
      targetEnd = duration_;
      targetStart = Math.max(0, targetEnd - visibleDuration);
    }

    const startTime = performance.now();

    const animate = (currentTimeMs: number) => {
      const elapsed = currentTimeMs - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      const newStart = startViewportStart + (targetStart - startViewportStart) * easedProgress;
      const newEnd = startViewportEnd + (targetEnd - startViewportEnd) * easedProgress;

      setViewport(newStart, newEnd);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setViewport(targetStart, targetEnd);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [setViewport]);

  /**
   * Cancel any ongoing animation
   */
  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  return {
    animateViewport,
    animateZoom,
    animateScrollToTime,
    cancelAnimation,
  };
}
