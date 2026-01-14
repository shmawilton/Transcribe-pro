// PitchControl.tsx - Beautiful animated pitch control with processing indicator
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/store';
import { onPitchStatus } from '../audio/HowlerAudioEngine';

interface PitchControlProps {
  onPitchChange: (pitch: number) => void;
  isAudioLoaded: boolean;
}

export const PitchControl: React.FC<PitchControlProps> = ({ onPitchChange, isAudioLoaded }) => {
  const pitch = useAppStore((state) => state.globalControls.pitch);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetPitch, setTargetPitch] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [localPitch, setLocalPitch] = useState(pitch);
  const dialRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to pitch processing status
  useEffect(() => {
    const unsubscribe = onPitchStatus((status) => {
      setIsProcessing(status.isProcessing);
      setProgress(status.progress);
      setTargetPitch(status.targetPitch);
    });
    return unsubscribe;
  }, []);

  // Sync local pitch with store
  useEffect(() => {
    if (!isDragging) {
      setLocalPitch(pitch);
    }
  }, [pitch, isDragging]);

  // Debounced pitch change
  const handlePitchChange = useCallback((value: number) => {
    setLocalPitch(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onPitchChange(value);
    }, 300);
  }, [onPitchChange]);

  // Dial interaction
  const handleDialInteraction = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!dialRef.current || !isAudioLoaded) return;
    
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    // Map angle to pitch: -π/2 to π/2 => -2 to 2
    let pitch = (angle / (Math.PI / 2)) * 2;
    pitch = Math.max(-2, Math.min(2, Math.round(pitch * 10) / 10));
    
    handlePitchChange(pitch);
  }, [handlePitchChange, isAudioLoaded]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    handleDialInteraction(e);
    
    const handleMouseMove = (e: MouseEvent) => handleDialInteraction(e);
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleDialInteraction]);

  // Get color based on pitch
  const getPitchColor = (p: number): string => {
    if (p < -1) return '#e74c3c'; // Deep low - red
    if (p < 0) return '#e67e22'; // Low - orange
    if (p === 0) return '#2ecc71'; // Original - green
    if (p < 1) return '#3498db'; // High - blue
    return '#9b59b6'; // Very high - purple
  };

  // Calculate rotation for dial indicator
  const dialRotation = (localPitch / 2) * 135; // -2 to 2 => -135 to 135 degrees

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      background: '#000000',
      backgroundColor: '#000000',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.1)',
      minWidth: '280px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9)',
      opacity: 1,
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    }}>
      {/* Background animated waves when processing */}
      {isProcessing && (
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0.3
        }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${150 + i * 50}px`,
              height: `${150 + i * 50}px`,
              borderRadius: '50%',
              border: `2px solid ${getPitchColor(targetPitch)}`,
              transform: 'translate(-50%, -50%)',
              animation: `pitchWave ${1.5 + i * 0.3}s ease-out infinite`,
              animationDelay: `${i * 0.2}s`
            }} />
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        justifyContent: 'center'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{
          animation: isProcessing ? 'spin 2s linear infinite' : 'none'
        }}>
          <path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" 
                stroke={getPitchColor(localPitch)} strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'white',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Pitch Shift
        </span>
      </div>

      {/* Circular Dial */}
      <div 
        ref={dialRef}
        onMouseDown={handleMouseDown}
        style={{
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: `conic-gradient(
            from -135deg,
            #e74c3c 0deg,
            #e67e22 67.5deg,
            #2ecc71 135deg,
            #3498db 202.5deg,
            #9b59b6 270deg
          )`,
          padding: '6px',
          cursor: isAudioLoaded ? 'pointer' : 'not-allowed',
          position: 'relative',
          boxShadow: `
            0 0 30px ${getPitchColor(localPitch)}40,
            inset 0 0 20px rgba(0,0,0,0.5)
          `,
          transition: 'box-shadow 0.3s ease',
          opacity: isAudioLoaded ? 1 : 0.5
        }}
      >
        {/* Inner dial */}
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {/* Tick marks */}
          {[-2, -1, 0, 1, 2].map((tick) => {
            const angle = (tick / 2) * 135 - 90;
            return (
              <div key={tick} style={{
                position: 'absolute',
                width: '3px',
                height: tick === 0 ? '12px' : '8px',
                background: tick === 0 ? '#2ecc71' : 'rgba(255,255,255,0.4)',
                borderRadius: '2px',
                transform: `rotate(${angle}deg) translateY(-50px)`,
                transformOrigin: 'center center'
              }} />
            );
          })}

          {/* Pointer needle */}
          <div style={{
            position: 'absolute',
            width: '4px',
            height: '45px',
            background: `linear-gradient(to top, ${getPitchColor(localPitch)}, transparent)`,
            borderRadius: '2px',
            transformOrigin: 'bottom center',
            transform: `translateY(-22px) rotate(${dialRotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            boxShadow: `0 0 10px ${getPitchColor(localPitch)}`
          }} />

          {/* Center display */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #252540 0%, #1a1a2e 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
            border: `2px solid ${getPitchColor(localPitch)}40`
          }}>
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: getPitchColor(localPitch),
              fontFamily: 'monospace',
              textShadow: `0 0 10px ${getPitchColor(localPitch)}60`
            }}>
              {localPitch === 0 ? '0' : (localPitch > 0 ? `+${localPitch.toFixed(1)}` : localPitch.toFixed(1))}
            </span>
            <span style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase'
            }}>
              {localPitch === 0 ? 'original' : 'semitones'}
            </span>
          </div>
        </div>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px',
          background: `${getPitchColor(targetPitch)}20`,
          borderRadius: '20px',
          border: `1px solid ${getPitchColor(targetPitch)}40`
        }}>
          {/* Animated music notes */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['♪', '♫', '♩'].map((note, i) => (
              <span key={i} style={{
                fontSize: '14px',
                color: getPitchColor(targetPitch),
                animation: `bounce 0.6s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`
              }}>
                {note}
              </span>
            ))}
          </div>
          <span style={{
            fontSize: '12px',
            color: 'white',
            fontWeight: 500
          }}>
            Shifting to {targetPitch > 0 ? '+' : ''}{targetPitch.toFixed(1)}...
          </span>
          {/* Progress bar */}
          <div style={{
            width: '40px',
            height: '4px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: getPitchColor(targetPitch),
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Quick preset buttons */}
      <div style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {[-2, -1, 0, 1, 2].map((preset) => (
          <button
            key={preset}
            onClick={() => handlePitchChange(preset)}
            disabled={!isAudioLoaded || isProcessing}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: Math.abs(localPitch - preset) < 0.05 
                ? getPitchColor(preset) 
                : 'rgba(255,255,255,0.1)',
              color: Math.abs(localPitch - preset) < 0.05 ? 'white' : 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isAudioLoaded && !isProcessing ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: isAudioLoaded ? 1 : 0.5,
              transform: Math.abs(localPitch - preset) < 0.05 ? 'scale(1.1)' : 'scale(1)',
              boxShadow: Math.abs(localPitch - preset) < 0.05 
                ? `0 0 15px ${getPitchColor(preset)}60` 
                : 'none'
            }}
          >
            {preset === 0 ? '⚪' : preset > 0 ? `+${preset}` : preset}
          </button>
        ))}
      </div>

      {/* Slider for fine control */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.4)'
        }}>
          <span>-2</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Fine Adjustment</span>
          <span>+2</span>
        </div>
        <input
          type="range"
          min="-2"
          max="2"
          step="0.1"
          value={localPitch}
          onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
          disabled={!isAudioLoaded || isProcessing}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: `linear-gradient(to right, 
              #e74c3c 0%, 
              #e67e22 25%, 
              #2ecc71 50%, 
              #3498db 75%, 
              #9b59b6 100%
            )`,
            appearance: 'none',
            cursor: isAudioLoaded && !isProcessing ? 'pointer' : 'not-allowed',
            opacity: isAudioLoaded ? 1 : 0.5
          }}
        />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pitchWave {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3), 0 0 10px ${getPitchColor(localPitch)}60;
          border: 2px solid ${getPitchColor(localPitch)};
          transition: all 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};

export default PitchControl;
