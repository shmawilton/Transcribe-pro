// HowlerAudioEngine.ts - Stable audio engine for Electron
// ON-DEMAND pitch conversion with seamless playback transition

import { Howl } from 'howler';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { useAppStore } from '../../store/store';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

// FFmpeg WASM for waveform only
let globalFFmpeg: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;
let ffmpegLoaded = false;

async function ensureFFmpegLoaded(): Promise<FFmpeg | null> {
  if (globalFFmpeg && ffmpegLoaded) return globalFFmpeg;
  if (ffmpegLoadPromise) {
    await ffmpegLoadPromise;
    return globalFFmpeg;
  }
  ffmpegLoadPromise = (async () => {
    try {
      globalFFmpeg = new FFmpeg();
      await globalFFmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      });
      ffmpegLoaded = true;
    } catch (e) {
      ffmpegLoadPromise = null;
    }
  })();
  await ffmpegLoadPromise;
  return globalFFmpeg;
}

if (typeof window !== 'undefined') ensureFFmpegLoaded();

// Event emitter for pitch processing status
type PitchStatusCallback = (status: { isProcessing: boolean; targetPitch: number; progress: number }) => void;
const pitchStatusListeners: Set<PitchStatusCallback> = new Set();

export function onPitchStatus(callback: PitchStatusCallback): () => void {
  pitchStatusListeners.add(callback);
  return () => pitchStatusListeners.delete(callback);
}

function emitPitchStatus(status: { isProcessing: boolean; targetPitch: number; progress: number }): void {
  pitchStatusListeners.forEach(cb => cb(status));
}

/**
 * HowlerAudioEngine - ON-DEMAND pitch conversion with seamless transition
 */
export class HowlerAudioEngine {
  private howl: Howl | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private timeUpdateInterval: number | null = null;
  private currentSoundId: number | null = null;
  
  // Pitch processing state
  private originalTempPath: string | null = null;
  private originalDataArray: number[] = [];
  private originalBlobUrl: string | null = null;
  private currentPitchedBlobUrl: string | null = null;
  private currentPitchedFilePath: string | null = null; // Track file path for cleanup
  
  private currentPitch: number = 0;
  private targetPitch: number = 0;
  private isProcessingPitch: boolean = false;
  private pitchProcessingAborted: boolean = false;
  
  private currentSpeed: number = 1.0; // Playback speed (rate)
  private targetSpeed: number = 1.0;
  private isProcessingSpeed: boolean = false;
  private speedProcessingAborted: boolean = false;
  private currentSpeededBlobUrl: string | null = null;
  private currentSpeededFilePath: string | null = null;
  
  private duration: number = 0; // Original file duration
  private originalDuration: number = 0; // Store original duration for speed calculations

  // Loop state tracking
  private loopStart: number | null = null;
  private loopEnd: number | null = null;
  private isLooping: boolean = false;
  private isHandlingLoopJump: boolean = false;

  // Pitch cache for faster switching
  private pitchCache: Map<number, { blobUrl: string; filePath: string }> = new Map();
  private speedCache: Map<number, { blobUrl: string; filePath: string }> = new Map();

  constructor() {
    // Engine initialized
  }

  public isFormatSupported(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'webm'].includes(ext || '');
  }

  private async cleanup(): Promise<void> {
    // Cleanup temp files
    if (isElectron && window.electronAPI?.cleanupTempFile) {
      if (this.originalTempPath) {
        await window.electronAPI.cleanupTempFile(this.originalTempPath).catch(() => {});
      }
      if (this.currentPitchedFilePath) {
        await window.electronAPI.cleanupTempFile(this.currentPitchedFilePath).catch(() => {});
      }
      if (this.currentSpeededFilePath) {
        await window.electronAPI.cleanupTempFile(this.currentSpeededFilePath).catch(() => {});
      }
    }
    if (this.originalBlobUrl) URL.revokeObjectURL(this.originalBlobUrl);
    if (this.currentSpeededBlobUrl) URL.revokeObjectURL(this.currentSpeededBlobUrl);
    
    this.originalTempPath = null;
    this.originalBlobUrl = null;
    this.currentPitchedBlobUrl = null;
    this.currentPitchedFilePath = null;
    this.currentSpeededBlobUrl = null;
    this.currentSpeededFilePath = null;
  }

  private unloadCurrentAudio(): void {
    this.stopTimeUpdate();
    if (this.howl) {
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }
    this.currentSoundId = null;
    this.audioBuffer = null;
    this.duration = 0;
    
    // Reset loop state when unloading audio
    this.isLooping = false;
    this.loopStart = null;
    this.loopEnd = null;
  }

  public async loadAudioFile(file: File): Promise<void> {

    this.unloadCurrentAudio();
    await this.cleanup();
    this.currentPitch = 0;
    this.targetPitch = 0;
    this.currentSpeed = 1.0;
    this.targetSpeed = 1.0;
    this.originalDataArray = [];
    this.isProcessingPitch = false;
    this.isProcessingSpeed = false;

    try {
      useAppStore.getState().setAudioFile(file);

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      this.originalDataArray = Array.from(new Uint8Array(arrayBuffer));

      // Create blob URL for original
      const originalBlob = new Blob([new Uint8Array(this.originalDataArray)], { type: 'audio/mpeg' });
      this.originalBlobUrl = URL.createObjectURL(originalBlob);

      // Save to temp file for later pitch processing (Electron only)
      if (isElectron && window.electronAPI?.saveTempAudio) {
        this.originalTempPath = await window.electronAPI.saveTempAudio(
          this.originalDataArray,
          file.name
        );
      }

      // Load original with Howler
      await this.loadHowlerFromUrl(this.originalBlobUrl);

      // Set volume to +6 dB (maximum volume) when audio loads - CRITICAL
      const storeVolume = useAppStore.getState().globalControls.volume;
      const isMuted = useAppStore.getState().globalControls.isMuted;
      const targetVolume = isMuted ? -60 : (storeVolume !== undefined ? storeVolume : 6);
      this.setVolume(targetVolume);

      // Decode waveform
      await ensureFFmpegLoaded();
      const waveformBuffer = new Uint8Array(this.originalDataArray).buffer;
      this.audioBuffer = await this.decodeWaveform(waveformBuffer, file.name);
      if (this.audioBuffer) {
        useAppStore.getState().setAudioBuffer(this.audioBuffer);
      }

      useAppStore.getState().setIsLoading(false);

    } catch (error) {
      useAppStore.getState().setIsLoading(false);
      this.unloadCurrentAudio();
      throw error;
    }
  }

  private async loadHowlerFromUrl(url: string, preserveState?: { time: number; playing: boolean }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

      const newHowl = new Howl({
        src: [url],
        format: ['mp3'],
        html5: true,
          preload: true,
          onload: () => {
            clearTimeout(timeout);
          
          // Store old howl reference
          const oldHowl = this.howl;
          const oldSoundId = this.currentSoundId;
          
          // Set new howl
          this.howl = newHowl;
          const fileDuration = newHowl.duration();
          this.originalDuration = fileDuration; // Store original duration
          this.duration = fileDuration; // Duration always stays as original (never changes with speed)
          
          // Update store with original duration (duration never changes with speed)
          useAppStore.getState().setDuration(this.duration);
          
          // If preserving state, seek and play
          if (preserveState) {
            // preserveState.time is the original timeline time (not affected by speed)
            // Duration never changes with speed, so we can seek directly
            const seekTime = Math.min(preserveState.time, this.duration);
            newHowl.seek(seekTime);
            
            if (preserveState.playing) {
              this.currentSoundId = newHowl.play() as number;
              
              // CRITICAL: Apply current speed to the playing sound instance
              // This preserves marker speeds when pitch changes
              if (this.currentSpeed !== 1.0 && this.currentSoundId !== null) {
                newHowl.rate(this.currentSpeed, this.currentSoundId);
              }
              
              this.startTimeUpdate();
            }
          }
          
          // Now stop old howl (after new one is playing)
          if (oldHowl) {
            if (oldSoundId !== null) oldHowl.stop(oldSoundId);
            oldHowl.unload();
          }
          
          // Update store only on initial load (not on pitch switch)
          if (!preserveState) {
            const DEFAULT_ZOOM = 5; // Show 20% (1/5) of audio initially
            useAppStore.getState().setDuration(this.duration);
            useAppStore.getState().setViewport(0, this.duration / DEFAULT_ZOOM);
            useAppStore.getState().setZoomLevel(DEFAULT_ZOOM);
            
            // Initialize speed from store
            const storedSpeed = useAppStore.getState().globalControls.playbackRate;
            if (storedSpeed && storedSpeed !== 1.0) {
              this.setSpeed(storedSpeed);
            }
          } else {
            // Speed is already applied above to the specific sound ID
            // Also ensure it's set on the main instance for future plays
            if (this.currentSpeed !== 1.0) {
              newHowl.rate(this.currentSpeed);
            }
          }
            
            resolve();
          },
        onloaderror: (_, err) => {
            clearTimeout(timeout);
          newHowl.unload();
          reject(new Error(`Load error: ${err}`));
          },
          onend: () => {
            this.stopTimeUpdate();
            useAppStore.getState().setIsPlaying(false);
          useAppStore.getState().setCurrentTime(this.duration);
          }
        });
      });
  }

  /**
   * Set pitch - triggers on-demand conversion in Electron
   */
  public setPitch(semitones: number): void {
    // Clamp to ±2 semitones
    const targetPitch = Math.max(-2, Math.min(2, Math.round(semitones * 10) / 10));
    
    // Update store immediately for UI feedback
    useAppStore.getState().setPitch(targetPitch);
    this.targetPitch = targetPitch;
    
    // If same pitch, nothing to do
    if (Math.abs(targetPitch - this.currentPitch) < 0.05) {
      return;
    }

    // In Electron, process pitch change
    if (isElectron && this.originalTempPath) {
      this.processPitchChange(targetPitch);
    }
  }
  
  /**
   * Process pitch change - runs in background, audio keeps playing
   */
  private async processPitchChange(targetPitch: number): Promise<void> {
    // If already processing, abort current and start new
    if (this.isProcessingPitch) {
      this.pitchProcessingAborted = true;
      // Wait a bit for current process to notice abort
      await new Promise(r => setTimeout(r, 100));
    }

    this.isProcessingPitch = true;
    this.pitchProcessingAborted = false;
    
    emitPitchStatus({ isProcessing: true, targetPitch, progress: 0 });

    try {
      // Check if going back to original pitch
      if (Math.abs(targetPitch) < 0.05) {
        // Switch back - check if speed is also 1.0
        const wasPlaying = this.howl?.playing() || false;
        const currentTime = this.getCurrentTime();
        
        if (Math.abs(this.currentSpeed - 1.0) < 0.01) {
          // Both pitch and speed are original - use original file
          if (this.originalBlobUrl) {
            await this.loadHowlerFromUrl(this.originalBlobUrl, { time: currentTime, playing: wasPlaying });
          }
        } else {
          // Speed is still applied - use speeded file
          if (this.currentSpeededBlobUrl) {
            await this.loadHowlerFromUrl(this.currentSpeededBlobUrl, { time: currentTime, playing: wasPlaying });
          }
        }
        
        // Cleanup pitched file
        if (this.currentPitchedFilePath && window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(this.currentPitchedFilePath).catch(() => {});
          this.currentPitchedFilePath = null;
        }
        this.currentPitchedBlobUrl = null;
        
        this.currentPitch = 0;
        emitPitchStatus({ isProcessing: false, targetPitch: 0, progress: 100 });
        this.isProcessingPitch = false;
        return;
      }

      // Process with native FFmpeg
      if (!window.electronAPI?.pitchShiftFile) {
        throw new Error('pitchShiftFile not available');
      }

      emitPitchStatus({ isProcessing: true, targetPitch, progress: 30 });

      // Check for abort
      if (this.pitchProcessingAborted) {
        this.isProcessingPitch = false;
        return;
      }

      // Cleanup OLD pitched file before creating new one
      if (this.currentPitchedFilePath && window.electronAPI?.cleanupTempFile) {
        await window.electronAPI.cleanupTempFile(this.currentPitchedFilePath).catch(() => {});
        this.currentPitchedFilePath = null;
      }

      // Determine input file: use speeded file if speed is not 1.0, otherwise use original
      const inputFile = (this.currentSpeed !== 1.0 && this.currentSpeededFilePath) 
        ? this.currentSpeededFilePath 
        : this.originalTempPath!;

      // Call native FFmpeg
      const pitchedPath = await window.electronAPI.pitchShiftFile(inputFile, targetPitch);
      
      emitPitchStatus({ isProcessing: true, targetPitch, progress: 80 });

      // Check for abort again
      if (this.pitchProcessingAborted) {
        // Cleanup the generated file
        if (window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(pitchedPath).catch(() => {});
        }
        this.isProcessingPitch = false;
        return;
      }
      
      emitPitchStatus({ isProcessing: true, targetPitch, progress: 90 });

      // Cleanup old blob URL if exists
      if (this.currentPitchedBlobUrl) {
        URL.revokeObjectURL(this.currentPitchedBlobUrl);
      }

      // Read the file and create a blob URL (more reliable than custom protocol)
      const audioData = await window.electronAPI.readAudioFile(pitchedPath);
      const blob = new Blob([new Uint8Array(audioData)], { type: 'audio/mpeg' });
      const newBlobUrl = URL.createObjectURL(blob);

      emitPitchStatus({ isProcessing: true, targetPitch, progress: 95 });

      // Get current playback state BEFORE switching
      const wasPlaying = this.howl?.playing() || false;
      const currentTime = this.getCurrentTime();

      // SEAMLESS SWITCH - load new, then stop old
      await this.loadHowlerFromUrl(newBlobUrl, { time: currentTime, playing: wasPlaying });

      // Store the file path and blob URL for later cleanup
      this.currentPitchedFilePath = pitchedPath;
      this.currentPitchedBlobUrl = newBlobUrl;

      this.currentPitch = targetPitch;
      emitPitchStatus({ isProcessing: false, targetPitch, progress: 100 });

    } catch (error) {
      emitPitchStatus({ isProcessing: false, targetPitch: this.currentPitch, progress: 0 });
    }

    this.isProcessingPitch = false;
  }

  // === Standard playback methods ===

  /**
   * Fade volume smoothly
   */
  private async fadeVolume(targetDb: number, durationMs: number = 30): Promise<void> {
    if (!this.howl) return;
    
    const currentDb = useAppStore.getState().globalControls.volume;
    const startDb = currentDb;
    const diff = targetDb - startDb;
    
    if (Math.abs(diff) < 0.1) {
      // Already at target, just set it
      this.setVolume(targetDb);
      return;
    }
    
    const steps = Math.max(3, Math.floor(durationMs / 5)); // Update every 5ms
    const stepDuration = durationMs / steps;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentDb = startDb + (diff * progress);
      this.setVolume(currentDb);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
    
    // Ensure final value is exact
    this.setVolume(targetDb);
  }

  public async play(): Promise<void> {
    if (!this.howl) throw new Error('No audio');
    
    // Get target volume
    const targetVolume = useAppStore.getState().globalControls.volume;
    const isMuted = useAppStore.getState().globalControls.isMuted;
    const targetDb = isMuted ? -60 : targetVolume;
    
    // Start at low volume for fade in
    this.setVolume(Math.max(-40, targetDb - 20));
    
    // Start playback
    this.currentSoundId = this.howl.play() as number;
    
    // CRITICAL: Apply current speed immediately after starting playback
    // This ensures marker speeds are applied correctly
    if (this.currentSpeed !== 1.0 && this.currentSoundId !== null) {
      this.howl.rate(this.currentSpeed, this.currentSoundId);
    }
    
    useAppStore.getState().setIsPlaying(true);
    this.startTimeUpdate();
    
    // Fade in to target volume (30ms)
    this.fadeVolume(targetDb, 30).catch(() => {});
  }

  public pause(): void {
    if (!this.howl) return;
    if (this.currentSoundId !== null) {
      this.howl.pause(this.currentSoundId);
    } else {
    this.howl.pause();
    }
    useAppStore.getState().setIsPlaying(false);
    this.stopTimeUpdate();
  }

  public async stop(): Promise<void> {
    if (!this.howl) return;

    // Get current volume for fade out
    const currentDb = useAppStore.getState().globalControls.volume;
    const isMuted = useAppStore.getState().globalControls.isMuted;
    const startDb = isMuted ? -60 : currentDb;
    
    // Fade out to silence (30ms)
    await this.fadeVolume(-60, 30);
    
    // Stop playback
    this.howl.stop();
    this.currentSoundId = null;
    useAppStore.getState().setIsPlaying(false);
    
    // Reset position to beginning
    useAppStore.getState().setCurrentTime(0);
    if (this.howl) {
      this.howl.seek(0);
    }
    
    // Reset viewport to beginning (show first 20% of audio)
    const duration = this.getDuration();
    if (duration > 0) {
      const DEFAULT_ZOOM_STOP = 5; // Show 20% (1/5) of audio
      useAppStore.getState().setViewport(0, duration / DEFAULT_ZOOM_STOP);
      useAppStore.getState().setZoomLevel(DEFAULT_ZOOM_STOP);
    }
    
    // Restore volume after fade out
    if (!isMuted) {
      this.setVolume(currentDb);
    }
    
    this.stopTimeUpdate();
  }

  public async seek(time: number): Promise<void> {
    if (!this.howl) return;
    // time is original timeline time (duration never changes with speed)
    // Howler's seek() takes file time directly (no conversion needed)
    const originalTime = Math.max(0, Math.min(time, this.duration));
    
    const wasPlaying = this.currentSoundId !== null && this.howl.playing(this.currentSoundId);
    
    // If we have a sound ID, seek on that specific instance
    if (this.currentSoundId !== null) {
      this.howl.seek(originalTime, this.currentSoundId);
      useAppStore.getState().setCurrentTime(originalTime);
      
      // Ensure speed is applied to this sound instance
      if (this.currentSpeed !== 1.0) {
        this.howl.rate(this.currentSpeed, this.currentSoundId);
      }
      
      // If it was playing but stopped, restart it
      if (wasPlaying && !this.howl.playing(this.currentSoundId)) {
        this.howl.play(this.currentSoundId);
        // Reapply speed after restart
        if (this.currentSpeed !== 1.0) {
          this.howl.rate(this.currentSpeed, this.currentSoundId);
        }
      }
    } else {
      // No sound ID - seek on the main instance
      this.howl.seek(originalTime);
      useAppStore.getState().setCurrentTime(originalTime);
      
      // If it was playing, we need to start a new sound instance
      if (wasPlaying) {
        this.currentSoundId = this.howl.play() as number;
        // Seek to the correct position on the new instance
        if (this.currentSoundId !== null) {
          this.howl.seek(originalTime, this.currentSoundId);
          // Apply current speed to the new sound instance
          if (this.currentSpeed !== 1.0) {
            this.howl.rate(this.currentSpeed, this.currentSoundId);
          }
        }
      }
    }
  }

  public getCurrentTime(): number {
    if (!this.howl) return 0;
    const fileTime = this.currentSoundId !== null ? this.howl.seek(this.currentSoundId) : this.howl.seek();
    const rawTime = typeof fileTime === 'number' ? fileTime : 0;
    
    // Return original timeline time (fileTime) - duration never changes with speed
    // Only the playback rate changes, which makes the counter advance faster/slower
    // The visual timeline and markers remain based on original duration
    return rawTime;
  }

  public getDuration(): number { return this.duration; }
  public isAudioLoaded(): boolean { return this.howl !== null; }
  public getIsPlaying(): boolean { return this.howl?.playing() || false; }
  public getPitch(): number { return this.currentPitch; }
  public resetPitch(): void { this.setPitch(0); }

  public setVolume(db: number): void {
    if (!this.howl) return;
    const linear = Math.pow(10, Math.max(-60, Math.min(6, db)) / 20);
    this.howl.volume(Math.max(0, Math.min(1, linear)));
  }

  /**
   * Set playback rate (speed) - uses FFmpeg for true time-stretching
   */
  public setRate(rate: number): void {
    this.setSpeed(rate);
  }

  /**
   * Set speed - IMMEDIATE change using Howler's rate() (like YouTube)
   * Note: Howler's rate changes both speed AND pitch
   * For true time-stretching without pitch change, FFmpeg would be needed
   * But for immediate response, we use Howler's rate (trade-off: pitch changes slightly)
   * @param speed - Speed multiplier (0.25 to 4.0)
   */
  public setSpeed(speed: number): void {
    // Clamp to valid range
    const targetSpeed = Math.max(0.25, Math.min(4.0, Math.round(speed * 100) / 100));
    
    // Update store immediately for UI feedback
    useAppStore.getState().setPlaybackRate(targetSpeed);
    this.targetSpeed = targetSpeed;
    
    // If same speed, nothing to do (but still ensure it's applied if howl exists)
    if (Math.abs(targetSpeed - this.currentSpeed) < 0.01) {
      // Even if speed is the same, ensure it's applied to the current sound if playing
      if (this.howl && this.currentSoundId !== null && this.howl.playing(this.currentSoundId)) {
        this.howl.rate(targetSpeed, this.currentSoundId);
      }
      return;
    }

    // IMMEDIATE speed change using Howler's rate() - like YouTube!
    // This changes both speed and pitch, but is instant
    this.currentSpeed = targetSpeed;
    
    if (this.howl) {
      // Apply rate immediately - no processing delay!
      // If we have a specific sound ID (playing instance), apply to that
      // Otherwise apply to the main howl instance
      if (this.currentSoundId !== null && this.howl.playing(this.currentSoundId)) {
        this.howl.rate(targetSpeed, this.currentSoundId);
      } else {
        // Apply to main instance (for when not playing or no sound ID)
        this.howl.rate(targetSpeed);
      }
      
      // Duration NEVER changes with speed - it always stays as originalDuration
      // Only the playback rate changes, which makes the counter advance faster/slower
      // The visual timeline and markers remain based on original duration
      if (this.originalDuration > 0) {
        // Duration stays constant - don't update it!
        // this.duration = this.originalDuration; // Already set, don't change
        
        // Update current time display (in original timeline)
        const currentTime = this.getCurrentTime();
        useAppStore.getState().setCurrentTime(currentTime);
        
      }
    } else {
      // Howl not ready yet - store the speed so it can be applied when audio loads
    }
  }

  /**
   * Process speed change - runs in background, audio keeps playing
   */
  private async processSpeedChange(targetSpeed: number): Promise<void> {
    // If already processing, abort current and start new
    if (this.isProcessingSpeed) {
      this.speedProcessingAborted = true;
      await new Promise(r => setTimeout(r, 100));
    }

    this.isProcessingSpeed = true;
    this.speedProcessingAborted = false;
    

    try {
      // Check if going back to normal speed
      if (Math.abs(targetSpeed - 1.0) < 0.01) {
        // Switch back - check if pitch is also 0
        const wasPlaying = this.howl?.playing() || false;
        const currentTime = this.getCurrentTime();
        
        if (Math.abs(this.currentPitch) < 0.05) {
          // Both pitch and speed are original - use original file
          if (this.originalBlobUrl) {
            await this.loadHowlerFromUrl(this.originalBlobUrl, { time: currentTime, playing: wasPlaying });
          }
        } else {
          // Pitch is still applied - use pitched file
          if (this.currentPitchedBlobUrl) {
            await this.loadHowlerFromUrl(this.currentPitchedBlobUrl, { time: currentTime, playing: wasPlaying });
          }
        }
        
        // Cleanup speeded file
        if (this.currentSpeededFilePath && window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(this.currentSpeededFilePath).catch(() => {});
          this.currentSpeededFilePath = null;
        }
        this.currentSpeededBlobUrl = null;
        
        this.currentSpeed = 1.0;
        this.isProcessingSpeed = false;
        return;
      }

      // Process with native FFmpeg
      if (!window.electronAPI?.timeStretchFile) {
        throw new Error('timeStretchFile not available');
      }

      // Cleanup OLD speeded file before creating new one
      if (this.currentSpeededFilePath && window.electronAPI?.cleanupTempFile) {
        await window.electronAPI.cleanupTempFile(this.currentSpeededFilePath).catch(() => {});
        this.currentSpeededFilePath = null;
      }

      // Check for abort
      if (this.speedProcessingAborted) {
        this.isProcessingSpeed = false;
        return;
      }

      // Determine input file: use pitched file if pitch is not 0, otherwise use original
      const inputFile = (this.currentPitch !== 0 && this.currentPitchedFilePath) 
        ? this.currentPitchedFilePath 
        : this.originalTempPath!;

      // Call native FFmpeg for time-stretching
      const speededPath = await window.electronAPI.timeStretchFile(inputFile, targetSpeed);

      // Check for abort again
      if (this.speedProcessingAborted) {
        if (window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(speededPath).catch(() => {});
        }
        this.isProcessingSpeed = false;
        return;
      }

      // Read the speeded file
      const audioData = await window.electronAPI.readAudioFile(speededPath);

      // Create blob URL
      const blob = new Blob([new Uint8Array(audioData)], { type: 'audio/mpeg' });
      const newBlobUrl = URL.createObjectURL(blob);

      // Get current playback state BEFORE switching
      const wasPlaying = this.howl?.playing() || false;
      let currentTime = this.getCurrentTime();
      const originalDuration = this.duration;
      
      
      // Adjust time proportionally when switching speeds
      // Formula: originalAudioTime = currentTime * currentSpeed
      //          newTime = originalAudioTime / targetSpeed
      const originalAudioTime = this.currentSpeed === 1.0 
        ? currentTime 
        : currentTime * this.currentSpeed;
      
      // Calculate expected new duration (speeded files are shorter/longer)
      const expectedNewDuration = originalDuration / targetSpeed;
      const newTime = targetSpeed === 1.0
        ? originalAudioTime
        : originalAudioTime / targetSpeed;
      
      // Clamp to valid range
      currentTime = Math.max(0, Math.min(newTime, expectedNewDuration));
      

      // SEAMLESS SWITCH - load new, then stop old
      await this.loadHowlerFromUrl(newBlobUrl, { time: currentTime, playing: wasPlaying });

      // Store the file path and blob URL for later cleanup
      this.currentSpeededFilePath = speededPath;
      this.currentSpeededBlobUrl = newBlobUrl;

      this.currentSpeed = targetSpeed;

    } catch (error) {
    }

    this.isProcessingSpeed = false;
  }

  /**
   * Set speed using preset
   * @param preset - Speed preset name: 'slowest', 'slow', 'normal', 'fast', 'fastest'
   */
  public setSpeedPreset(preset: 'slowest' | 'slow' | 'normal' | 'fast' | 'fastest'): void {
    const speedMap: Record<string, number> = {
      slowest: 0.25,  // Quarter speed - very slow for learning
      slow: 0.5,      // Half speed - transcription friendly
      normal: 1.0,    // Original speed
      fast: 1.5,      // Faster playback
      fastest: 2.0,   // Double speed
    };

    const speed = speedMap[preset] || 1.0;
    this.setSpeed(speed);
  }

  /**
   * Get current speed
   */
  public getSpeed(): number {
    return this.currentSpeed;
  }

  /**
   * Get the original temp file path (for effects processing)
   */
  public getOriginalFilePath(): string | null {
    return this.originalTempPath;
  }

  /**
   * Get current playback rate (alias for getSpeed)
   */
  public getPlaybackRate(): number {
    return this.getSpeed();
  }

  public async resumeAudioContext(): Promise<void> {}

  /**
   * Enable looping between start and end times
   * When playback reaches end, automatically jumps back to start
   * @param start - Loop start time in seconds
   * @param end - Loop end time in seconds
   */
  public setLoop(start: number, end: number): void {
    const duration = this.getDuration();
    
    // Validate loop bounds
    if (start < 0 || end > duration || start >= end) {
      return;
    }

    this.loopStart = start;
    this.loopEnd = end;
    this.isLooping = true;
  }

  /**
   * Disable looping
   * Playback will continue normally without jumping back
   */
  public disableLoop(): void {
    this.isLooping = false;
    this.loopStart = null;
    this.loopEnd = null;

  }

  /**
   * Handle loop end - jump back to loop start
   * This ensures continuous looping by properly restarting playback
   * Matches the behavior of AudioEngine (web version)
   */
  private async handleLoopEnd(): Promise<void> {
    if (!this.isLooping || this.loopStart === null || this.loopEnd === null || !this.howl) {
      return;
    }

    // Prevent re-entrancy (timer can trigger multiple times near boundary)
    if (this.isHandlingLoopJump) return;
    this.isHandlingLoopJump = true;

    
    try {
      const wasPlaying = this.currentSoundId !== null
        ? this.howl.playing(this.currentSoundId)
        : this.howl.playing();

      // IMPORTANT: do NOT use Howler's built-in looping here.
      // Also avoid stop()/play() because HTML5 audio frequently restarts at 0 before seek applies.
      // Instead, just seek back to loopStart while continuing playback.
      if (this.currentSoundId !== null) {
        this.howl.seek(this.loopStart, this.currentSoundId);
      } else {
        this.howl.seek(this.loopStart);
      }

      useAppStore.getState().setCurrentTime(this.loopStart);

      // Ensure playback continues if it was playing
      if (wasPlaying) {
        if (this.currentSoundId === null) {
          this.currentSoundId = this.howl.play() as number;
          if (this.currentSoundId !== null) {
            this.howl.seek(this.loopStart, this.currentSoundId);
          }
        } else if (!this.howl.playing(this.currentSoundId)) {
          this.howl.play(this.currentSoundId);
        }
        useAppStore.getState().setIsPlaying(true);
      }

    } catch (error) {
    } finally {
      // Allow next loop check after a short delay to prevent rapid re-trigger
      setTimeout(() => { this.isHandlingLoopJump = false; }, 80);
    }
  }

  private startTimeUpdate(): void {
    this.stopTimeUpdate();
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.howl?.playing()) {
        const currentTime = this.getCurrentTime();
        const duration = this.getDuration();
        
        // Update store with current time
        useAppStore.getState().setCurrentTime(currentTime);
        
        // Check for marker loop end - jump back to start if looping
        // Only check if we're actually looping and have valid loop bounds
        if (!this.isHandlingLoopJump && this.isLooping && this.loopEnd !== null && this.loopStart !== null) {
          // Check if we've reached or passed the loop end
          // Use a threshold (0.1s) to account for timing precision and ensure we catch it
          const loopEndThreshold = this.loopEnd - 0.1;
          if (currentTime >= loopEndThreshold) {
            this.handleLoopEnd().catch(() => {});
            return;
          }
        }
        
        // Check if reached end of audio (only if not looping)
        if (!this.isLooping && currentTime >= duration - 0.05) {
          // Handle playback end
          this.howl.stop();
          this.currentSoundId = null;
          useAppStore.getState().setIsPlaying(false);
          useAppStore.getState().setCurrentTime(duration);
          this.stopTimeUpdate();
        }
      }
    }, 50);
  }

  private stopTimeUpdate(): void {
    if (this.timeUpdateInterval !== null) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  // === Waveform ===

  private async decodeWaveform(arrayBuffer: ArrayBuffer, filename: string): Promise<AudioBuffer | null> {
    try {
      const ffmpeg = await ensureFFmpegLoaded();
      if (!ffmpeg) return null;

      const ext = filename.split('.').pop()?.toLowerCase() || 'mp3';
      await ffmpeg.writeFile(`wave_input.${ext}`, new Uint8Array(arrayBuffer));
      await ffmpeg.exec(['-i', `wave_input.${ext}`, '-ac', '2', '-ar', '22050', '-sample_fmt', 's16', '-f', 'wav', 'wave_output.wav']);
      
      const data = await ffmpeg.readFile('wave_output.wav');
      const uint8 = data as Uint8Array;
      const wavBuffer = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength) as ArrayBuffer;

      try {
        await ffmpeg.deleteFile(`wave_input.${ext}`);
        await ffmpeg.deleteFile('wave_output.wav');
      } catch (e) {}

      return this.parseWav(wavBuffer);
    } catch (e) {
      return null;
    }
  }

  private parseWav(buffer: ArrayBuffer): AudioBuffer | null {
    try {
      const view = new DataView(buffer);
      let offset = 12;
      let channels = 2, sampleRate = 44100, bitsPerSample = 16;
      let dataOffset = 0, dataSize = 0;
      
      while (offset < buffer.byteLength - 8) {
        const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
        const size = view.getUint32(offset + 4, true);
        
        if (id === 'fmt ') {
          channels = view.getUint16(offset + 10, true);
          sampleRate = view.getUint32(offset + 12, true);
          bitsPerSample = view.getUint16(offset + 22, true);
        } else if (id === 'data') {
          dataOffset = offset + 8;
          dataSize = size;
          break;
        }
        offset += 8 + size + (size % 2);
      }
      
      if (!dataOffset || !dataSize) return null;
      
      const bytesPerSample = bitsPerSample / 8;
      const numSamples = Math.floor(dataSize / (bytesPerSample * channels));
      
      const ctx = new OfflineAudioContext(channels, numSamples, sampleRate);
      const audioBuffer = ctx.createBuffer(channels, numSamples, sampleRate);

      for (let ch = 0; ch < channels; ch++) {
        const data = audioBuffer.getChannelData(ch);
        for (let i = 0; i < numSamples; i++) {
          const pos = dataOffset + (i * channels + ch) * bytesPerSample;
          if (pos + bytesPerSample <= buffer.byteLength) {
            data[i] = bytesPerSample === 2 ? view.getInt16(pos, true) / 32768 : (view.getUint8(pos) - 128) / 128;
          }
        }
      }
      
      return audioBuffer;
    } catch (e) {
      return null;
    }
  }

  public getAudioBuffer(): AudioBuffer | null { return this.audioBuffer; }
  public getAnalyserNode(): AnalyserNode | null { return null; }

  public async dispose(): Promise<void> {
    this.unloadCurrentAudio();
    await this.cleanup();
    this.originalDataArray = [];
  }
}

// Singleton
let instance: HowlerAudioEngine | null = null;

export function getHowlerAudioEngine(): HowlerAudioEngine {
  if (!instance) instance = new HowlerAudioEngine();
  return instance;
}

export async function resetHowlerAudioEngine(): Promise<void> {
  if (instance) {
    await instance.dispose();
    instance = null;
  }
}
