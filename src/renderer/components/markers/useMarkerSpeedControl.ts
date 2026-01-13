// useMarkerSpeedControl.ts
// Hook to apply marker speed only when playback is within marker range
// Speed changes ONLY when crossing marker boundaries, not continuously

import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/store';
import { useAudioEngine } from '../audio/useAudioEngine';
import { MarkerManager } from './MarkerManager';

/**
 * Hook to monitor playback position and apply marker speed only within marker range
 * Speed is applied ONCE when entering marker range and stays constant until leaving
 */
export function useMarkerSpeedControl() {
  const selectedMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const { setSpeed } = useAudioEngine();
  
  // Track state to only change speed when crossing boundaries
  const lastInRangeStateRef = useRef<boolean | null>(null); // null = unknown, true = in range, false = out of range
  const lastAppliedSpeedRef = useRef<number | null>(null);
  const lastMarkerIdRef = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  // When marker is activated/deactivated, reset state tracking
  useEffect(() => {
    if (!selectedMarkerId) {
      // No marker active - reset speed to normal
      if (lastAppliedSpeedRef.current !== 1.0 && !isUpdatingRef.current) {
        isUpdatingRef.current = true;
        setSpeed(1.0);
        lastAppliedSpeedRef.current = 1.0;
        lastMarkerIdRef.current = null;
        lastInRangeStateRef.current = null;
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
        console.log('[useMarkerSpeedControl] Marker deactivated - reset speed to 1.0x');
      }
      return;
    }

    const activeMarker = MarkerManager.getMarker(selectedMarkerId);
    if (!activeMarker) {
      if (lastAppliedSpeedRef.current !== 1.0 && !isUpdatingRef.current) {
        isUpdatingRef.current = true;
        setSpeed(1.0);
        lastAppliedSpeedRef.current = 1.0;
        lastMarkerIdRef.current = null;
        lastInRangeStateRef.current = null;
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
      return;
    }

    // Marker changed - reset state tracking
    if (lastMarkerIdRef.current !== selectedMarkerId) {
      lastInRangeStateRef.current = null;
      lastMarkerIdRef.current = selectedMarkerId;
    }
  }, [selectedMarkerId, setSpeed]);

  // Monitor playback position - ONLY change speed when crossing boundaries
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!selectedMarkerId) {
      lastInRangeStateRef.current = null;
      return; // No marker active, nothing to monitor
    }

    // Set up interval to check position periodically (every 300ms to reduce checks)
    intervalRef.current = window.setInterval(() => {
      if (isUpdatingRef.current) return; // Prevent nested updates

      const store = useAppStore.getState();
      const currentTime = store.audio.currentTime;
      const isPlaying = store.audio.isPlaying;
      
      // Only adjust speed during playback
      if (!isPlaying) {
        return;
      }

      const activeMarker = MarkerManager.getMarker(selectedMarkerId);
      if (!activeMarker) {
        return;
      }

      // Check if playback is within marker range (with buffer to prevent rapid toggling at exact boundaries)
      const buffer = 0.1; // 100ms buffer to prevent rapid toggling
      const isInRange = currentTime >= (activeMarker.start - buffer) && currentTime <= (activeMarker.end + buffer);
      const markerSpeed = activeMarker.speed !== undefined ? activeMarker.speed : 1.0;

      // ONLY change speed when state changes (crossing boundary)
      // This prevents continuous updates while within or outside marker
      if (lastInRangeStateRef.current !== isInRange) {
        // State changed - we crossed a boundary
        lastInRangeStateRef.current = isInRange;
        
        if (isInRange) {
          // Entered marker range - apply marker speed ONCE
          if (lastAppliedSpeedRef.current !== markerSpeed) {
            isUpdatingRef.current = true;
            setSpeed(markerSpeed);
            lastAppliedSpeedRef.current = markerSpeed;
            console.log(`[useMarkerSpeedControl] Entered marker range - applied speed ${markerSpeed}x`);
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 100);
          }
        } else {
          // Exited marker range - reset to normal speed ONCE
          if (lastAppliedSpeedRef.current !== 1.0) {
            isUpdatingRef.current = true;
            setSpeed(1.0);
            lastAppliedSpeedRef.current = 1.0;
            console.log('[useMarkerSpeedControl] Exited marker range - reset speed to 1.0x');
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 100);
          }
        }
      }
      // If state hasn't changed, do nothing - speed stays constant
    }, 300); // Check every 300ms

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedMarkerId, setSpeed]);
}
