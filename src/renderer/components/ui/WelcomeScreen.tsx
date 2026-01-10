// WelcomeScreen.tsx - Initial screen before audio is loaded
// Features Kenyan-themed design with glassmorphism and animations

import React, { useState } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_BLACK = '#0F0F0F';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family
const HANDWRITTEN_FONT = "'Caveat', 'Patrick Hand', 'Kalam', 'Indie Flower', cursive";

interface WelcomeScreenProps {
  onAudioLoaded: () => void;
}

// Feature icons as SVG components
const WaveformIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h2l2-5 4 10 4-8 2 3h6"/>
  </svg>
);

const MarkerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const TranscriptionIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={KENYAN_WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={KENYAN_RED} stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAudioLoaded }) => {
  const { loadFile, isLoading, resumeAudioContext } = useAudioEngine();
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleLoadAudio = async () => {
    try {
      setError(null);
      await resumeAudioContext();
      const file = await pickAudioFile();
      
      if (!file) return;

      const validation = validateAudioFile(file);
      
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      await loadFile(file);
      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const validation = validateAudioFile(file);
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      setError(null);
      await resumeAudioContext();
      await loadFile(file);
      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio');
    }
  };

  const features = [
    { icon: <WaveformIcon />, text: 'Waveform Visualization' },
    { icon: <MarkerIcon />, text: 'Marker Timeline' },
    { icon: <TranscriptionIcon />, text: 'Fast Transcription' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, ${KENYAN_BLACK} 0%, #1a1a1a 50%, ${KENYAN_BLACK} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        overflow: 'hidden',
        fontFamily: HANDWRITTEN_FONT
      }}
    >
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        {/* Floating circles */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${KENYAN_GREEN}20 0%, transparent 70%)`,
          top: '-100px',
          left: '-100px',
          animation: 'float 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${KENYAN_RED}20 0%, transparent 70%)`,
          bottom: '-50px',
          right: '-50px',
          animation: 'float 6s ease-in-out infinite reverse'
        }} />
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${KENYAN_WHITE}10 0%, transparent 70%)`,
          top: '50%',
          left: '70%',
          animation: 'float 10s ease-in-out infinite'
        }} />
      </div>

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '3rem',
          background: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.1),
                      0 0 100px ${KENYAN_GREEN}20,
                      0 0 100px ${KENYAN_RED}20`,
          animation: 'fadeInUp 0.8s ease-out',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Logo/Title */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            fontFamily: HANDWRITTEN_FONT,
            background: `linear-gradient(135deg, ${KENYAN_WHITE} 0%, ${KENYAN_GREEN} 50%, ${KENYAN_RED} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem',
            textShadow: `0 0 30px ${KENYAN_GREEN}40`,
            animation: 'glow 2s ease-in-out infinite alternate'
          }}>
            Transcription Pro
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '1.2rem',
            letterSpacing: '0.05em',
            fontFamily: HANDWRITTEN_FONT
          }}>
            Professional Audio Transcription Tool
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleLoadAudio}
          style={{
            width: '400px',
            height: '200px',
            border: `2px dashed ${isDragging ? KENYAN_GREEN : 'rgba(255, 255, 255, 0.3)'}`,
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            cursor: isLoading ? 'wait' : 'pointer',
            background: isDragging 
              ? `linear-gradient(135deg, ${KENYAN_GREEN}20, ${KENYAN_RED}10)`
              : 'rgba(255, 255, 255, 0.03)',
            transition: 'all 0.3s ease',
            transform: isDragging ? 'scale(1.02)' : 'scale(1)',
            boxShadow: isDragging ? `0 0 30px ${KENYAN_GREEN}40` : 'none'
          }}
        >
          {isLoading ? (
            <>
              {/* Loading spinner */}
              <div style={{
                width: '60px',
                height: '60px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  border: `4px solid ${KENYAN_GREEN}30`,
                  borderTopColor: KENYAN_GREEN,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{
                  position: 'absolute',
                  width: '70%',
                  height: '70%',
                  top: '15%',
                  left: '15%',
                  border: `4px solid ${KENYAN_RED}30`,
                  borderTopColor: KENYAN_RED,
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite reverse'
                }} />
              </div>
              <p style={{ 
                color: KENYAN_WHITE, 
                fontSize: '1.2rem',
                fontFamily: HANDWRITTEN_FONT 
              }}>Loading audio...</p>
            </>
          ) : (
            <>
              {/* Upload icon */}
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDragging ? KENYAN_GREEN : 'rgba(255, 255, 255, 0.5)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: 'all 0.3s ease',
                  transform: isDragging ? 'translateY(-5px)' : 'translateY(0)',
                  animation: 'bounce 2s ease-in-out infinite'
                }}
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  color: KENYAN_WHITE,
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontFamily: HANDWRITTEN_FONT
                }}>
                  {isDragging ? 'Drop your audio file here' : 'Click or drag audio file here'}
                </p>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '1rem',
                  fontFamily: HANDWRITTEN_FONT
                }}>
                  Supports MP3, WAV, OGG, FLAC, M4A, AAC, WEBM
                </p>
              </div>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            color: KENYAN_RED,
            fontSize: '1rem',
            padding: '0.75rem 1.5rem',
            background: `${KENYAN_RED}20`,
            borderRadius: '8px',
            border: `1px solid ${KENYAN_RED}40`,
            animation: 'shake 0.5s ease-in-out',
            fontFamily: HANDWRITTEN_FONT
          }}>
            {error}
          </div>
        )}

        {/* Features hint */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          marginTop: '1rem'
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '1rem',
                animation: `fadeIn 0.5s ease-out ${0.3 + index * 0.1}s both`,
                fontFamily: HANDWRITTEN_FONT
              }}
            >
              {feature.icon}
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontFamily: HANDWRITTEN_FONT
      }}>
        <span>Made with</span>
        <HeartIcon />
        <span>in Kenya</span>
        <span style={{
          display: 'flex',
          gap: '2px',
          marginLeft: '0.5rem'
        }}>
          <span style={{ width: '12px', height: '8px', background: KENYAN_BLACK, borderRadius: '2px 0 0 2px', border: '1px solid rgba(255,255,255,0.2)' }} />
          <span style={{ width: '12px', height: '8px', background: KENYAN_RED }} />
          <span style={{ width: '12px', height: '8px', background: KENYAN_GREEN }} />
          <span style={{ width: '12px', height: '8px', background: KENYAN_WHITE, borderRadius: '0 2px 2px 0' }} />
        </span>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Patrick+Hand&family=Kalam:wght@400;700&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow {
          from { filter: drop-shadow(0 0 20px ${KENYAN_GREEN}40); }
          to { filter: drop-shadow(0 0 30px ${KENYAN_RED}40); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
