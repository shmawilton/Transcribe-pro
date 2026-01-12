// useMarkerSpeedControl.ts
// Hook to apply marker speed only when playback is within marker range

import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/store';
import { useAudioEngine } from '../audio/useAudioEngine';
import { MarkerManager } from './MarkerManager';

/**
 * Hook to monitor playback position and apply marker speed only within marker range
 * When marker is activated, speed is applied immediately
 * When playback goes outside marker range, speed returns to normal (1.0x)
 */
export function useMarkerSpeedControl() {
  const selectedMarkerId = useAppStore((state) => state.ui.selectedMarkerId);
  const { setSpeed } = useAudioEngine();
  
  // Track last applied speed to avoid unnecessary updates
  const lastAppliedSpeedRef = useRef<number | null>(null);
  const lastMarkerIdRef = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  // When marker is activated/deactivated, immediately apply or reset speed
  useEffect(() => {
    if (!selectedMarkerId) {
      // No marker active - immediately reset speed to normal
      if (lastAppliedSpeedRef.current !== 1.0) {
        // Reset the flag immediately to allow update
        isUpdatingRef.current = false;
        setSpeed(1.0);
        lastAppliedSpeedRef.current = 1.0;
        lastMarkerIdRef.current = null;
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
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
      return;
    }

    // When marker is activated, immediately apply its speed
    // This ensures speed is set right away when clicking on a marker
    const markerSpeed = activeMarker.speed !== undefined ? activeMarker.speed : 1.0;
    if (lastAppliedSpeedRef.current !== markerSpeed || lastMarkerIdRef.current !== selectedMarkerId) {
      if (!isUpdatingRef.current) {
        isUpdatingRef.current = true;
        setSpeed(markerSpeed);
        lastAppliedSpeedRef.current = markerSpeed;
        lastMarkerIdRef.current = selectedMarkerId;
        console.log(`[useMarkerSpeedControl] Marker activated - immediately applied speed ${markerSpeed}x`);
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
    }
  }, [selectedMarkerId, setSpeed]);

  // Monitor playback position during playback to adjust speed based on range
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!selectedMarkerId) {
      return; // No marker active, nothing to monitor
    }

    // Set up interval to check position periodically (every 100ms) during playback
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

      // Check if playback is within marker range
      const isInRange = currentTime >= activeMarker.start && currentTime <= activeMarker.end;
      const markerSpeed = activeMarker.speed !== undefined ? activeMarker.speed : 1.0;

      // Apply speed based on range during playback
      if (isInRange) {
        // Within marker range: apply marker speed
        if (lastAppliedSpeedRef.current !== markerSpeed || lastMarkerIdRef.current !== selectedMarkerId) {
          isUpdatingRef.current = true;
          setSpeed(markerSpeed);
          lastAppliedSpeedRef.current = markerSpeed;
          lastMarkerIdRef.current = selectedMarkerId;
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 50);
        }
      } else {
        // Outside marker range: reset to normal speed
        if (lastAppliedSpeedRef.current !== 1.0) {
          isUpdatingRef.current = true;
          setSpeed(1.0);
          lastAppliedSpeedRef.current = 1.0;
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 50);
        }
      }
    }, 100); // Check every 100ms

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedMarkerId, setSpeed]);
}
