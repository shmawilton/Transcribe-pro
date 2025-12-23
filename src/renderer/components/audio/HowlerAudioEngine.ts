// HowlerAudioEngine.ts - Reliable audio engine using Howler.js
// Works reliably in Electron desktop apps

import { Howl } from 'howler';
import { useAppStore } from '../../store/store';

/**
 * HowlerAudioEngine - Uses Howler.js for reliable cross-platform audio
 * 
 * This is much more reliable than raw Web Audio API in Electron
 */
export class HowlerAudioEngine {
  private howl: Howl | null = null;
  private blobUrl: string | null = null;
  private timeUpdateInterval: number | null = null;
  private isInitialized: boolean = true;

  constructor() {
    console.log('[HowlerAudioEngine] Initialized');
  }

  /**
   * Check if a file format is supported
   */
  public isFormatSupported(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const supportedExtensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'webm'];
    return supportedExtensions.includes(extension || '');
  }

  /**
   * Load an audio file
   */
  public async loadAudioFile(file: File): Promise<void> {
    console.log('[HowlerAudioEngine] ===== LOAD AUDIO FILE START =====');
    console.log('[HowlerAudioEngine] File info:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Clean up previous audio
    this.dispose();

    try {
      // Update store with file
      console.log('[HowlerAudioEngine] Step 1: Updating store with file');
      useAppStore.getState().setAudioFile(file);

      // Create blob URL from file
      console.log('[HowlerAudioEngine] Step 2: Creating Blob URL');
      const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' });
      this.blobUrl = URL.createObjectURL(blob);
      console.log('[HowlerAudioEngine] Step 2: Blob URL created:', this.blobUrl);

      // Load with Howler
      console.log('[HowlerAudioEngine] Step 3: Loading with Howler.js');
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio loading timed out after 30 seconds'));
        }, 30000);

        this.howl = new Howl({
          src: [this.blobUrl!],
          format: [this.getFormat(file)],
          html5: true, // Use HTML5 Audio - more reliable in Electron
          preload: true,
          onload: () => {
            clearTimeout(timeout);
            console.log('[HowlerAudioEngine] ✅ Audio loaded successfully!');
            
            const duration = this.howl!.duration();
            console.log('[HowlerAudioEngine] Duration:', duration);
            
            // Update store with duration
            useAppStore.getState().setDuration(duration);
            
            // Create a dummy AudioBuffer for compatibility
            // (Some components might need it)
            this.createDummyBuffer(duration);
            
            resolve();
          },
          onloaderror: (_id, error) => {
            clearTimeout(timeout);
            console.error('[HowlerAudioEngine] ❌ Load error:', error);
            reject(new Error(`Failed to load audio: ${error}`));
          },
          onplayerror: (_id, error) => {
            console.error('[HowlerAudioEngine] Play error:', error);
            // Try to unlock audio context
            if (this.howl) {
              this.howl.once('unlock', () => {
                this.howl?.play();
              });
            }
          },
          onend: () => {
            console.log('[HowlerAudioEngine] Playback ended');
            this.stopTimeUpdate();
            useAppStore.getState().setIsPlaying(false);
            useAppStore.getState().setCurrentTime(this.getDuration());
          }
        });
      });

      console.log('[HowlerAudioEngine] ===== LOAD COMPLETE =====');
    } catch (error) {
      console.error('[HowlerAudioEngine] Load failed:', error);
      
      // Reset store on error
      const store = useAppStore.getState();
      store.setAudioFile(null);
      store.setDuration(0);
      store.setCurrentTime(0);
      store.setIsPlaying(false);
      store.clearAudioBuffer();
      
      throw error;
    }
  }

  /**
   * Get file format for Howler
   */
  private getFormat(file: File): string {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const formatMap: Record<string, string> = {
      'mp3': 'mp3',
      'wav': 'wav',
      'ogg': 'ogg',
      'flac': 'flac',
      'm4a': 'mp4',
      'aac': 'aac',
      'webm': 'webm'
    };
    return formatMap[ext] || 'mp3';
  }

  /**
   * Create a dummy AudioBuffer for compatibility
   */
  private createDummyBuffer(duration: number): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sampleRate = audioContext.sampleRate;
      const length = Math.ceil(duration * sampleRate);
      const buffer = audioContext.createBuffer(2, length || 1, sampleRate);
      
      useAppStore.getState().setAudioBuffer(buffer);
      console.log('[HowlerAudioEngine] Created dummy AudioBuffer for compatibility');
    } catch (e) {
      console.warn('[HowlerAudioEngine] Could not create dummy buffer:', e);
    }
  }

  /**
   * Play audio
   */
  public async play(): Promise<void> {
    if (!this.howl) {
      throw new Error('No audio loaded');
    }

    console.log('[HowlerAudioEngine] Play');
    this.howl.play();
    useAppStore.getState().setIsPlaying(true);
    this.startTimeUpdate();
  }

  /**
   * Pause audio
   */
  public pause(): void {
    if (!this.howl) return;

    console.log('[HowlerAudioEngine] Pause');
    this.howl.pause();
    useAppStore.getState().setIsPlaying(false);
    this.stopTimeUpdate();
  }

  /**
   * Stop audio
   */
  public stop(): void {
    if (!this.howl) return;

    console.log('[HowlerAudioEngine] Stop');
    this.howl.stop();
    useAppStore.getState().setIsPlaying(false);
    useAppStore.getState().setCurrentTime(0);
    this.stopTimeUpdate();
  }

  /**
   * Seek to position
   */
  public async seek(time: number): Promise<void> {
    if (!this.howl) return;

    const clampedTime = Math.max(0, Math.min(time, this.getDuration()));
    console.log('[HowlerAudioEngine] Seek to:', clampedTime);
    this.howl.seek(clampedTime);
    useAppStore.getState().setCurrentTime(clampedTime);
  }

  /**
   * Get current time
   */
  public getCurrentTime(): number {
    if (!this.howl) return 0;
    const time = this.howl.seek();
    return typeof time === 'number' ? time : 0;
  }

  /**
   * Get duration
   */
  public getDuration(): number {
    if (!this.howl) return 0;
    return this.howl.duration() || 0;
  }

  /**
   * Check if audio is loaded
   */
  public isAudioLoaded(): boolean {
    return this.howl !== null && this.howl.state() === 'loaded';
  }

  /**
   * Check if playing
   */
  public getIsPlaying(): boolean {
    return this.howl?.playing() || false;
  }

  /**
   * Resume audio context (no-op for Howler, but kept for API compatibility)
   */
  public async resumeAudioContext(): Promise<void> {
    // Howler handles this automatically
  }

  /**
   * Start time update loop
   */
  private startTimeUpdate(): void {
    this.stopTimeUpdate();
    
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.howl && this.howl.playing()) {
        const time = this.getCurrentTime();
        useAppStore.getState().setCurrentTime(time);
      }
    }, 100);
  }

  /**
   * Stop time update loop
   */
  private stopTimeUpdate(): void {
    if (this.timeUpdateInterval !== null) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  /**
   * Get audio buffer (returns null - Howler doesn't expose this)
   */
  public getAudioBuffer(): AudioBuffer | null {
    return null;
  }

  /**
   * Get analyser node (returns null - not available with Howler)
   */
  public getAnalyserNode(): AnalyserNode | null {
    return null;
  }

  /**
   * Clean up
   */
  public dispose(): void {
    this.stopTimeUpdate();
    
    if (this.howl) {
      this.howl.unload();
      this.howl = null;
    }
    
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    
    console.log('[HowlerAudioEngine] Disposed');
  }
}

// Singleton instance
let howlerEngineInstance: HowlerAudioEngine | null = null;

/**
 * Get or create the HowlerAudioEngine singleton
 */
export function getHowlerAudioEngine(): HowlerAudioEngine {
  if (!howlerEngineInstance) {
    howlerEngineInstance = new HowlerAudioEngine();
  }
  return howlerEngineInstance;
}
