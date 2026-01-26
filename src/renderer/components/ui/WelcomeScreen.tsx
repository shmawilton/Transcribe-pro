// WelcomeScreen.tsx - Neumorphic Welcome Screen
// Features Kenyan-themed neumorphic design with smooth animations
// Enhanced for iOS/Android PWA with stored projects section

import React, { useState, useEffect } from 'react';
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';
import { getProjectLoader } from '../project/ProjectLoader';
import { getProjectSaver, StoredProject, deleteProjectFromIndexedDB } from '../project/ProjectSaver';
import { useAppStore } from '../../store/store';

// Kenyan flag colors
const KENYAN_RED = '#DE2910';
const KENYAN_GREEN = '#006644';
const KENYAN_BLACK = '#0F0F0F';
const KENYAN_WHITE = '#FFFFFF';

// Handwritten font family
const HANDWRITTEN_FONT = "'Merienda', 'Caveat', cursive";

interface WelcomeScreenProps {
  onAudioLoaded: () => void;
  onProjectLoaded?: () => void;
  pendingRestore?: boolean;
  onRestorePendingSession?: () => void;
}

// SVG Icons
const MusicIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const WaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h2l2-5 4 10 4-8 2 3h6"/>
  </svg>
);

const MarkerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const SpeedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={KENYAN_RED} stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAudioLoaded, onProjectLoaded, pendingRestore, onRestorePendingSession }) => {
  const { loadFile, isLoading, resumeAudioContext } = useAudioEngine();
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  
  // Mobile/PWA stored projects
  const [storedProjects, setStoredProjects] = useState<StoredProject[]>([]);
  const [showStoredProjects, setShowStoredProjects] = useState(false);
  const [loadingStoredId, setLoadingStoredId] = useState<string | null>(null);
  const [isMobile] = useState(() => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
  
  const theme = useAppStore((state) => state.theme);
  
  // Handle restoring pending session (mobile audio context fix)
  const handleRestoreSession = async () => {
    if (!onRestorePendingSession) return;
    setIsRestoringSession(true);
    try {
      await onRestorePendingSession();
    } finally {
      setIsRestoringSession(false);
    }
  };
  const isLightMode = theme === 'light';
  
  // Neumorphic colors based on theme
  const neuBg = isLightMode ? '#e4ebf5' : '#1e1e1e';
  const shadowDark = isLightMode ? 'rgba(163, 177, 198, 0.6)' : 'rgba(0, 0, 0, 0.5)';
  const shadowLight = isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(50, 50, 50, 0.3)';
  
  const neuRaised = `8px 8px 16px ${shadowDark}, -6px -6px 14px ${shadowLight}`;
  const neuPressed = `inset 4px 4px 8px ${shadowDark}, inset -4px -4px 8px ${shadowLight}`;
  
  const [projectLoader] = useState(() => getProjectLoader(
    (message: string, type: 'success' | 'error') => {
      if (type === 'error') setError(message);
    }
  ));
  
  const [projectSaver] = useState(() => getProjectSaver(
    (message: string, type: 'success' | 'error') => {
      if (type === 'error') setError(message);
    }
  ));
  
  // Load stored projects on mount (for mobile PWA)
  useEffect(() => {
    const loadStoredProjects = async () => {
      try {
        const projects = await projectSaver.getStoredProjects();
        setStoredProjects(projects);
        // Auto-show stored projects section if there are any on mobile
        if (projects.length > 0 && isMobile) {
          setShowStoredProjects(true);
        }
      } catch (err) {
        console.error('[WelcomeScreen] Failed to load stored projects:', err);
      }
    };
    loadStoredProjects();
  }, [projectSaver, isMobile]);
  
  // Handle loading a stored project from IndexedDB
  const handleLoadStoredProject = async (project: StoredProject) => {
    try {
      setError(null);
      setLoadingStoredId(project.id);
      await resumeAudioContext();
      
      // Set the current project ID in the saver
      projectSaver.setCurrentProjectId(project.id);
      
      // Load the project data
      const success = await projectLoader.loadFromStoredProject(project.projectData, loadFile);
      
      if (success) {
        onProjectLoaded ? onProjectLoaded() : onAudioLoaded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoadingStoredId(null);
    }
  };
  
  // Handle deleting a stored project
  const handleDeleteStoredProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Delete this project? This cannot be undone.')) {
      try {
        await deleteProjectFromIndexedDB(projectId);
        setStoredProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (err) {
        setError('Failed to delete project');
      }
    }
  };
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleStartNewProject = async () => {
    try {
      setError(null);
      const store = useAppStore.getState();
      store.resetProject();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) store.toggleMute();
      // Start with 20% view (zoom 5) on all devices
      store.setZoomLevel(5);
      
      await resumeAudioContext();
      const file = await pickAudioFile();
      if (!file) return;

      const validation = validateAudioFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      await loadFile(file);
      // Audio engine will set the 20% (1/5) initial viewport
      
      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start new project');
    }
  };

  const handleLoadProject = async () => {
    try {
      setError(null);
      setIsLoadingProject(true);
      await resumeAudioContext();
      const loaded = await projectLoader.loadProject(loadFile);
      if (loaded) {
        onProjectLoaded ? onProjectLoaded() : onAudioLoaded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoadingProject(false);
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
      const store = useAppStore.getState();
      store.setPitch(0);
      store.setVolume(6);
      store.setPlaybackRate(1);
      if (store.globalControls.isMuted) store.toggleMute();
      // Start with 20% view (zoom 5) on all devices
      store.setZoomLevel(5);
      
      await resumeAudioContext();
      await loadFile(file);
      // Audio engine will set the 20% (1/5) initial viewport
      
      onAudioLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audio');
    }
  };

  const features = [
    { icon: <WaveIcon />, text: 'Waveform Visualization', color: KENYAN_GREEN },
    { icon: <MarkerIcon />, text: 'Section Markers', color: KENYAN_RED },
    { icon: <SpeedIcon />, text: 'Speed Control', color: KENYAN_GREEN },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: neuBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        overflow: 'hidden',
        fontFamily: HANDWRITTEN_FONT
      }}
    >
      {/* Subtle background pattern */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.03,
        background: `
          radial-gradient(circle at 20% 30%, ${KENYAN_GREEN} 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, ${KENYAN_RED} 0%, transparent 40%)
        `,
        pointerEvents: 'none'
      }} />

      {/* Main Card */}
      <div
        className="welcome-card"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'stretch',
          justifyContent: isMobile ? 'center' : 'center',
          padding: isMobile ? 'clamp(1.25rem, 4vw, 3rem)' : '2.5rem 3rem',
          background: neuBg,
          borderRadius: 'clamp(16px, 4vw, 30px)',
          boxShadow: neuRaised,
          animation: 'fadeInUp 0.6s ease-out',
          position: 'relative',
          zIndex: 1,
          maxWidth: isMobile ? '520px' : '1200px',
          width: isMobile ? '92%' : '95%',
          gap: isMobile ? 'clamp(1rem, 3vw, 2rem)' : '3rem',
          margin: '0 auto',
          maxHeight: isMobile ? '90vh' : '85vh',
          overflowY: isMobile ? 'auto' : 'hidden',
          overflowX: 'hidden'
        }}
      >
        {/* Left Side - Logo, Title, Features (Desktop) or Top (Mobile) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'flex-start',
          justifyContent: isMobile ? 'center' : 'center',
          flex: isMobile ? '0 0 auto' : '1 1 50%',
          gap: isMobile ? 'clamp(1rem, 3vw, 2rem)' : '1.5rem',
          minWidth: 0
        }}>
          {/* Logo/Title Section */}
          <div style={{ 
            textAlign: isMobile ? 'center' : 'left', 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMobile ? 'center' : 'flex-start'
          }}>
            {/* Neumorphic Logo Circle */}
            <div style={{
              width: isMobile ? 'clamp(60px, 15vw, 80px)' : '90px',
              height: isMobile ? 'clamp(60px, 15vw, 80px)' : '90px',
              borderRadius: '50%',
              background: neuBg,
              boxShadow: neuRaised,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: isMobile ? '0 auto clamp(0.75rem, 2vw, 1.5rem)' : '0 0 1.25rem 0',
            }}>
              <svg width={isMobile ? 'clamp(28px, 8vw, 40px)' : '44px'} height={isMobile ? 'clamp(28px, 8vw, 40px)' : '44px'} viewBox="0 0 24 24" fill="none">
                <path d="M9 18V5l12-2v13" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="6" cy="18" r="3" fill={KENYAN_GREEN}/>
                <circle cx="18" cy="16" r="3" fill={KENYAN_RED}/>
              </svg>
            </div>
            
            <h1 style={{
              fontSize: isMobile ? 'clamp(1.25rem, 5vw, 2rem)' : '2.5rem',
              fontWeight: '700',
              fontFamily: HANDWRITTEN_FONT,
              color: isLightMode ? '#2d3748' : KENYAN_WHITE,
              marginBottom: '0.5rem',
              letterSpacing: '-0.5px',
              lineHeight: '1.2'
            }}>
              Transcription Pro
            </h1>
            <p style={{
              color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
              fontSize: isMobile ? 'clamp(0.75rem, 2.5vw, 0.95rem)' : '1.1rem',
              fontFamily: HANDWRITTEN_FONT,
              margin: 0
            }}>
              Professional Audio Transcription
            </p>
          </div>

          {/* Features - Neumorphic Chips */}
          <div style={{
            display: 'flex',
            gap: isMobile ? 'clamp(6px, 2vw, 12px)' : '10px',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-start',
            width: '100%'
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 'clamp(4px, 1.5vw, 8px)' : '8px',
                  padding: isMobile ? 'clamp(5px, 1.5vw, 8px) clamp(8px, 2.5vw, 14px)' : '8px 16px',
                  background: neuBg,
                  borderRadius: '20px',
                  boxShadow: `3px 3px 6px ${shadowDark}, -2px -2px 4px ${shadowLight}`,
                  fontSize: isMobile ? 'clamp(0.65rem, 2vw, 0.8rem)' : '0.9rem',
                  color: feature.color,
                  fontWeight: '500'
                }}
              >
                <span style={{ display: 'flex', transform: isMobile ? 'scale(clamp(0.75, 2vw, 1))' : 'scale(1)' }}>{feature.icon}</span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Action Buttons (Desktop) or Below (Mobile) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'stretch',
          justifyContent: isMobile ? 'center' : 'center',
          flex: isMobile ? '0 0 auto' : '1 1 50%',
          gap: isMobile ? '1rem' : '1.25rem',
          width: isMobile ? '100%' : 'auto',
          minWidth: isMobile ? 'auto' : '400px'
        }}>
          {/* Restore Previous Session Button (shown on mobile when audio context failed) */}
          {pendingRestore && onRestorePendingSession && (
            <button
              onClick={handleRestoreSession}
              disabled={isRestoringSession}
              style={{
                width: '100%',
                padding: isMobile ? 'clamp(0.75rem, 3vw, 1rem) clamp(0.75rem, 3vw, 1.5rem)' : '0.75rem 1.25rem',
                border: `2px solid ${KENYAN_GREEN}`,
                borderRadius: isMobile ? 'clamp(12px, 3vw, 16px)' : '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                cursor: isRestoringSession ? 'wait' : 'pointer',
                background: `linear-gradient(135deg, ${KENYAN_GREEN}20, ${KENYAN_GREEN}10)`,
                transition: 'all 0.3s ease',
                boxShadow: `0 0 20px ${KENYAN_GREEN}30`,
                opacity: isRestoringSession ? 0.7 : 1,
                fontFamily: HANDWRITTEN_FONT,
                minHeight: isMobile ? '50px' : '50px',
                touchAction: 'manipulation',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span style={{
                color: KENYAN_GREEN,
                fontWeight: '600',
                fontSize: isMobile ? 'clamp(0.85rem, 3vw, 1rem)' : '0.95rem'
              }}>
                {isRestoringSession ? 'Restoring...' : 'Tap to Restore Previous Session'}
              </span>
            </button>
          )}
          
          {/* New Project Button */}
          <button
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleStartNewProject}
            onMouseEnter={() => setHoveredButton('new')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={isLoading || isLoadingProject}
            style={{
              width: '100%',
              padding: isMobile ? 'clamp(0.75rem, 3vw, 1.25rem) clamp(0.75rem, 3vw, 1.5rem)' : '1rem 1.5rem',
              border: 'none',
              borderRadius: isMobile ? 'clamp(12px, 3vw, 16px)' : '14px',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 'clamp(0.5rem, 2vw, 1rem)' : '1rem',
              cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
              background: neuBg,
              transition: 'all 0.3s ease',
              boxShadow: (isDragging || hoveredButton === 'new') ? neuPressed : neuRaised,
              transform: (isDragging || hoveredButton === 'new') ? 'scale(0.98)' : 'scale(1)',
              opacity: (isLoading || isLoadingProject) ? 0.6 : 1,
              fontFamily: HANDWRITTEN_FONT,
              minHeight: isMobile ? '60px' : '70px',
              touchAction: 'manipulation'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: 'clamp(32px, 10vw, 40px)',
                  height: 'clamp(32px, 10vw, 40px)',
                  borderRadius: '50%',
                  background: neuBg,
                  boxShadow: neuPressed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: 'clamp(18px, 6vw, 24px)',
                    height: 'clamp(18px, 6vw, 24px)',
                    border: `3px solid ${KENYAN_GREEN}30`,
                    borderTopColor: KENYAN_GREEN,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ 
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE, 
                    fontSize: 'clamp(0.85rem, 3vw, 1rem)',
                    fontWeight: '600',
                    margin: 0
                  }}>Loading audio...</p>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: isMobile ? 'clamp(40px, 12vw, 50px)' : '56px',
                  height: isMobile ? 'clamp(40px, 12vw, 50px)' : '56px',
                  borderRadius: isMobile ? 'clamp(10px, 3vw, 14px)' : '14px',
                  background: neuBg,
                  boxShadow: `4px 4px 8px ${shadowDark}, -3px -3px 6px ${shadowLight}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MusicIcon />
                </div>
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                    fontSize: isMobile ? 'clamp(0.9rem, 3.5vw, 1.1rem)' : '1.15rem',
                    fontWeight: '600',
                    marginTop: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    marginBottom: '4px'
                  }}>
                    {isDragging ? 'Drop audio file' : 'New Project'}
                  </p>
                  <p style={{
                    color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: isMobile ? 'clamp(0.65rem, 2.5vw, 0.8rem)' : '0.9rem',
                    margin: 0
                  }}>
                    Click or drag & drop audio file
                  </p>
                </div>
                <svg width={isMobile ? 'clamp(16px, 5vw, 20px)' : '22px'} height={isMobile ? 'clamp(16px, 5vw, 20px)' : '22px'} viewBox="0 0 24 24" fill="none" stroke={KENYAN_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
          </button>

          {/* Load Project Button */}
          <button
            onClick={handleLoadProject}
            onMouseEnter={() => setHoveredButton('load')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={isLoading || isLoadingProject}
            style={{
              width: '100%',
              padding: isMobile ? 'clamp(0.75rem, 3vw, 1.25rem) clamp(0.75rem, 3vw, 1.5rem)' : '1rem 1.5rem',
              border: 'none',
              borderRadius: isMobile ? 'clamp(12px, 3vw, 16px)' : '14px',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 'clamp(0.5rem, 2vw, 1rem)' : '1rem',
              cursor: (isLoading || isLoadingProject) ? 'wait' : 'pointer',
              background: neuBg,
              transition: 'all 0.3s ease',
              boxShadow: (isLoadingProject || hoveredButton === 'load') ? neuPressed : neuRaised,
              transform: (isLoadingProject || hoveredButton === 'load') ? 'scale(0.98)' : 'scale(1)',
              opacity: (isLoading || isLoadingProject) ? 0.6 : 1,
              fontFamily: HANDWRITTEN_FONT,
              minHeight: isMobile ? '60px' : '70px',
              touchAction: 'manipulation'
            }}
          >
            {isLoadingProject ? (
              <>
                <div style={{
                  width: 'clamp(32px, 10vw, 40px)',
                  height: 'clamp(32px, 10vw, 40px)',
                  borderRadius: '50%',
                  background: neuBg,
                  boxShadow: neuPressed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: 'clamp(18px, 6vw, 24px)',
                    height: 'clamp(18px, 6vw, 24px)',
                    border: `3px solid ${KENYAN_RED}30`,
                    borderTopColor: KENYAN_RED,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ 
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE, 
                    fontSize: 'clamp(0.85rem, 3vw, 1rem)',
                    fontWeight: '600',
                    margin: 0
                  }}>Loading project...</p>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: isMobile ? 'clamp(40px, 12vw, 50px)' : '56px',
                  height: isMobile ? 'clamp(40px, 12vw, 50px)' : '56px',
                  borderRadius: isMobile ? 'clamp(10px, 3vw, 14px)' : '14px',
                  background: neuBg,
                  boxShadow: `4px 4px 8px ${shadowDark}, -3px -3px 6px ${shadowLight}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FolderIcon />
                </div>
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                    fontSize: isMobile ? 'clamp(0.9rem, 3.5vw, 1.1rem)' : '1.15rem',
                    fontWeight: '600',
                    marginTop: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    marginBottom: '4px'
                  }}>
                    Load Project
                  </p>
                  <p style={{
                    color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: isMobile ? 'clamp(0.65rem, 2.5vw, 0.8rem)' : '0.9rem',
                    margin: 0
                  }}>
                    Open saved .tsproj file
                  </p>
                </div>
                <svg width={isMobile ? 'clamp(16px, 5vw, 20px)' : '22px'} height={isMobile ? 'clamp(16px, 5vw, 20px)' : '22px'} viewBox="0 0 24 24" fill="none" stroke={KENYAN_RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
          </button>

          {/* My Projects Section - For Mobile PWA */}
          {storedProjects.length > 0 && (
            <div style={{ width: '100%' }}>
            {/* Section Header */}
            <button
              onClick={() => setShowStoredProjects(!showStoredProjects)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'transparent',
                border: 'none',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontFamily: HANDWRITTEN_FONT,
              }}
            >
              <span style={{
                color: isLightMode ? '#4a5568' : 'rgba(255, 255, 255, 0.7)',
                fontSize: 'clamp(0.8rem, 3vw, 0.95rem)',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                My Projects ({storedProjects.length})
              </span>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={isLightMode ? '#4a5568' : 'rgba(255, 255, 255, 0.5)'}
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{
                  transform: showStoredProjects ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            
            {/* Projects List */}
            {showStoredProjects && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.5rem',
                background: isLightMode ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                marginTop: '0.5rem',
              }}>
                {storedProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleLoadStoredProject(project)}
                    disabled={loadingStoredId !== null}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: neuBg,
                      border: 'none',
                      borderRadius: '10px',
                      boxShadow: loadingStoredId === project.id ? neuPressed : `3px 3px 6px ${shadowDark}, -2px -2px 4px ${shadowLight}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: loadingStoredId !== null ? 'wait' : 'pointer',
                      opacity: loadingStoredId !== null && loadingStoredId !== project.id ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      fontFamily: HANDWRITTEN_FONT,
                    }}
                  >
                    {/* Color indicator */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: project.thumbnailColor || KENYAN_GREEN,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {loadingStoredId === project.id ? (
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13"/>
                          <circle cx="6" cy="18" r="3"/>
                          <circle cx="18" cy="16" r="3"/>
                        </svg>
                      )}
                    </div>
                    
                    {/* Project info */}
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <p style={{
                        color: isLightMode ? '#2d3748' : KENYAN_WHITE,
                        fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                        fontWeight: '600',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {project.name}
                      </p>
                      <p style={{
                        color: isLightMode ? '#718096' : 'rgba(255, 255, 255, 0.5)',
                        fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)',
                        margin: 0,
                      }}>
                        {formatDate(project.updatedAt)}
                        {project.audioFileName && ` • ${project.audioFileName.substring(0, 20)}${project.audioFileName.length > 20 ? '...' : ''}`}
                      </p>
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteStoredProject(e, project.id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)',
                        transition: 'color 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = KENYAN_RED}
                      onMouseLeave={(e) => e.currentTarget.style.color = isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)'}
                      title="Delete project"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            )}
            </div>
          )}

          {/* Supported Formats */}
          <p style={{
            color: isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)',
            fontSize: isMobile ? '0.75rem' : '0.85rem',
            textAlign: isMobile ? 'center' : 'left',
            margin: 0,
            marginTop: isMobile ? '0' : '0.5rem'
          }}>
            Supports MP3, WAV, OGG, FLAC, M4A, AAC, WEBM
          </p>

          {/* Error Message */}
          {error && (
            <div style={{
              color: KENYAN_RED,
              fontSize: '0.85rem',
              padding: '0.75rem 1rem',
              background: neuBg,
              borderRadius: '12px',
              boxShadow: neuPressed,
              width: '100%',
              textAlign: 'center',
              animation: 'shake 0.4s ease-in-out',
              marginTop: '0.5rem'
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: 'clamp(0.75rem, 3vw, 1.5rem)',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(4px, 1.5vw, 8px)',
        color: isLightMode ? '#a0aec0' : 'rgba(255, 255, 255, 0.3)',
        fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)',
        fontFamily: HANDWRITTEN_FONT,
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '0 1rem'
      }}>
        <span>Made with</span>
        <HeartIcon />
        <span>in Kenya</span>
        <div style={{
          display: 'flex',
          gap: '2px',
          marginLeft: 'clamp(4px, 1.5vw, 8px)'
        }}>
          <span style={{ width: 'clamp(8px, 2.5vw, 10px)', height: 'clamp(5px, 1.5vw, 6px)', background: KENYAN_BLACK, borderRadius: '2px 0 0 2px' }} />
          <span style={{ width: 'clamp(8px, 2.5vw, 10px)', height: 'clamp(5px, 1.5vw, 6px)', background: KENYAN_RED }} />
          <span style={{ width: 'clamp(8px, 2.5vw, 10px)', height: 'clamp(5px, 1.5vw, 6px)', background: KENYAN_GREEN }} />
          <span style={{ width: 'clamp(8px, 2.5vw, 10px)', height: 'clamp(5px, 1.5vw, 6px)', background: KENYAN_WHITE, borderRadius: '0 2px 2px 0' }} />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merienda:wght@300;400;500;600;700&display=swap');
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        
        /* Mobile responsive styles for welcome screen */
        @media (max-width: 480px) {
          .hide-on-small-mobile {
            display: none !important;
          }
        }
        
        @media (max-width: 360px) {
          .welcome-card {
            padding: 1rem !important;
            gap: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
