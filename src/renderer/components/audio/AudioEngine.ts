// AudioEngine.ts - Wilton - Week 1-2
// Core audio processing using Web Audio API + Tone.js
// Architecture: File → AudioBuffer (waveform) + Tone.Player (playback) → PitchShift → Volume → Speakers

import * as Tone from 'tone';
import { useAppStore } from '../../store/store';

/**
 * Supported audio file formats
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',      // MP3
  'audio/mp3',       // MP3 (alternative)
  'audio/wav',       // WAV
  'audio/wave',      // WAV (alternative)
  'audio/ogg',       // OGG
  'audio/flac',      // FLAC
  'audio/x-flac',    // FLAC (alternative)
  'audio/mp4',       // M4A, AAC
  'audio/aac',       // AAC
  'audio/x-m4a',     // M4A
  'audio/aacp',      // AAC (alternative)
] as const;

export type SupportedAudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];

/**
 * AudioEngine - Handles audio file loading and processing with Tone.js
 * 
 * Responsibilities:
 * - Load audio files (MP3, WAV, OGG, FLAC, M4A, AAC)
 * - Decode audio using Web Audio API (for waveform visualization)
 * - Use Tone.js Player for playback with independent pitch/speed control
 * - Integrate with Zustand store
 * 
 * Architecture:
 * - AudioBuffer: Kept for waveform component (needs raw samples)
 * - Tone.Player: Used for playback (supports advanced features)
 * - PitchShift: Independent pitch control without affecting speed
 * - Volume: Volume control in dB
 */
export class AudioEngine {
  // Web Audio API (kept for waveform compatibility)
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized: boolean = false;

  // Tone.js nodes for playback
  private player: Tone.Player | null = null;
  private pitchShift: Tone.PitchShift | null = null;
  private volumeNode: Tone.Volume | null = null;

  // Playback state tracking
  private currentPlaybackRate: number = 1.0;
  private currentPitch: number = 0; // In semitones
  private playbackStartTime: number = 0; // When playback started (Tone.now())
  private playbackStartPosition: number = 0; // Position in audio when started (seconds)
  private isPlaying: boolean = false;
  private playerLoaded: boolean = false;

  // Time tracking
  private positionTrackingId: number | null = null;

  // Blob URL for cleanup
  private blobUrl: string | null = null;

  constructor() {
    console.log('[AudioEngine] Initializing with Tone.js...');
    this.initializeAudioContext();
    this.initializeToneNodes();
  }

  /**
   * Initialize Web Audio API context (for waveform compatibility)
   */
  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser');
      }

      this.audioContext = new AudioContextClass();
      this.isInitialized = true;
      
      console.log('[AudioEngine] AudioContext initialized', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state,
      });
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize AudioContext', error);
      this.isInitialized = false;
    }
  }

  /**
   * Initialize Tone.js effect nodes
   * Create these early - they can exist before audio loads
   */
  private initializeToneNodes(): void {
    try {
      // Create PitchShift node with initial value of 0 semitones
      this.pitchShift = new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0
      });

      // Create Volume node with initial value of 0 dB
      this.volumeNode = new Tone.Volume(0);

      // Connect in series: PitchShift → Volume → Destination
      this.pitchShift.connect(this.volumeNode);
      this.volumeNode.toDestination();

      console.log('[AudioEngine] Tone.js nodes initialized (PitchShift → Volume → Destination)');
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize Tone.js nodes', error);
    }
  }

  /**
   * Check if a file format is supported
   */
  public isFormatSupported(file: File): boolean {
    const mimeType = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (SUPPORTED_AUDIO_FORMATS.some(format => mimeType.includes(format.split('/')[1]))) {
      return true;
    }

    const supportedExtensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
    return supportedExtensions.includes(extension || '');
  }

  /**
   * Load and decode an audio file
   * Creates both AudioBuffer (for waveform) and Tone.Player (for playback)
   */
  public async loadAudioFile(file: File): Promise<void> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioEngine: AudioContext not initialized');
    }

    if (!this.isFormatSupported(file)) {
      throw new Error(
        `AudioEngine: Unsupported audio format. File: ${file.name}, Type: ${file.type}. ` +
        `Supported formats: MP3, WAV, OGG, FLAC, M4A, AAC`
      );
    }

    try {
      console.log('[AudioEngine] ===== LOAD AUDIO FILE START =====');
      console.log('[AudioEngine] File info:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Step 1: Update store with file
      console.log('[AudioEngine] Step 1: Updating store with file');
      useAppStore.getState().setAudioFile(file);

      // Step 2: Read file as ArrayBuffer
      console.log('[AudioEngine] Step 2: Reading file as ArrayBuffer');
      const arrayBuffer = await this.readFileAsArrayBuffer(file);

      if (arrayBuffer.byteLength === 0) {
        throw new Error('AudioEngine: File is empty or corrupted');
      }

      // Step 3: Create Blob URL (needed for Tone.Player)
      console.log('[AudioEngine] Step 3: Creating Blob URL for Tone.Player');
      
      // Clean up previous Blob URL if exists
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl);
      }
      
      const blob = new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' });
      this.blobUrl = URL.createObjectURL(blob);
      console.log('[AudioEngine] Blob URL created:', this.blobUrl);

      // Step 4: Initialize Tone.js and create Player FIRST (before decoding for waveform)
      // This is because Tone.Player loading is more reliable in Electron
      console.log('[AudioEngine] Step 4: Starting Tone.js and creating Player...');
      
      // Start Tone.js (required by browsers before audio playback)
      await Tone.start();
      console.log('[AudioEngine] Tone.js started, context state:', Tone.context.state);

      // Dispose existing player if any
      if (this.player) {
        this.player.dispose();
        this.player = null;
        this.playerLoaded = false;
      }

      // Create new Tone.Player with the Blob URL
      let playerDuration = 0;
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tone.Player load timed out after 30 seconds'));
        }, 30000);

        this.player = new Tone.Player({
          url: this.blobUrl!,
          loop: false,
          playbackRate: this.currentPlaybackRate,
          onload: () => {
            clearTimeout(timeout);
            console.log('[AudioEngine] Tone.Player loaded successfully!');
            this.playerLoaded = true;
            playerDuration = this.player!.buffer.duration;
            console.log('[AudioEngine] Player duration:', playerDuration);
            
            // Connect Player to PitchShift
            if (this.pitchShift) {
              this.player!.connect(this.pitchShift);
              console.log('[AudioEngine] Player connected to PitchShift → Volume → Destination');
            }
            resolve();
          },
          onerror: (error) => {
            clearTimeout(timeout);
            console.error('[AudioEngine] Tone.Player load error:', error);
            reject(error);
          }
        });
      });

      // Step 5: Create AudioBuffer for waveform visualization
      console.log('[AudioEngine] Step 5: Creating AudioBuffer for waveform...');
      
      // Detect Electron environment
      const isElectron = !!(window as any).electronAPI || 
                         (typeof process !== 'undefined' && process.versions && process.versions.electron);
      
      let decodedBuffer: AudioBuffer;
      
      if (isElectron) {
        // ELECTRON: Skip decodeAudioData (causes crashes) - create synthetic waveform
        console.log('[AudioEngine] Electron detected - creating synthetic waveform to avoid crash');
        decodedBuffer = this.createSyntheticWaveform(playerDuration);
      } else {
        // Browser: Use standard decodeAudioData
        console.log('[AudioEngine] Browser detected - using decodeAudioData');
        
        // Ensure AudioContext is running
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        try {
          decodedBuffer = await this.decodeAudioBuffer(arrayBuffer.slice(0));
        } catch (decodeError) {
          console.warn('[AudioEngine] decodeAudioData failed, using synthetic waveform:', decodeError);
          decodedBuffer = this.createSyntheticWaveform(playerDuration);
        }
      }
      
      // Validate buffer
      if (!decodedBuffer || decodedBuffer.length === 0) {
        console.warn('[AudioEngine] Buffer empty, creating synthetic waveform');
        decodedBuffer = this.createSyntheticWaveform(playerDuration);
      }

      this.audioBuffer = decodedBuffer;
      console.log('[AudioEngine] AudioBuffer ready:', {
        duration: decodedBuffer.duration,
        sampleRate: decodedBuffer.sampleRate,
        channels: decodedBuffer.numberOfChannels,
        synthetic: isElectron
      });

      // Step 6: Initialize analyser node
      console.log('[AudioEngine] Step 6: Initializing analyser node');
      this.initializeAnalyserNode();

      // Step 7: Update store with buffer and duration
      // Use player duration as it's more reliable than decoded buffer duration in Electron
      const finalDuration = playerDuration > 0 ? playerDuration : decodedBuffer.duration;
      console.log('[AudioEngine] Step 7: Updating store with buffer and duration:', finalDuration);
      useAppStore.getState().setAudioBuffer(decodedBuffer);
      useAppStore.getState().setDuration(finalDuration);
      
      // Reset viewport to show full audio
      useAppStore.getState().setViewport(0, finalDuration);
      useAppStore.getState().setZoomLevel(1);

      // Step 8: Reset playback state
      console.log('[AudioEngine] Step 8: Resetting playback state');
      this.playbackStartPosition = 0;
      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      useAppStore.getState().setCurrentTime(0);

      console.log('[AudioEngine] ===== LOAD AUDIO FILE COMPLETE =====');
      console.log('[AudioEngine] Ready for playback with independent pitch/speed control');

    } catch (error) {
      console.error('[AudioEngine] Failed to load audio file', error);
      
      // Reset state on error
      const store = useAppStore.getState();
      store.setAudioFile(null);
      store.setDuration(0);
      store.setCurrentTime(0);
      store.setIsPlaying(false);
      store.clearAudioBuffer();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`AudioEngine: Failed to load audio file: ${errorMessage}`);
    }
  }

  /**
   * Decode ArrayBuffer to AudioBuffer
   */
  private async decodeAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Audio decode timed out after 30 seconds'));
      }, 30000);

      this.audioContext!.decodeAudioData(arrayBuffer)
        .then((buffer) => {
          clearTimeout(timeout);
          resolve(buffer);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Create a synthetic waveform for Electron (where decodeAudioData crashes)
   * Generates a visually appealing waveform based on the audio duration
   */
  private createSyntheticWaveform(duration: number): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const sampleRate = 44100;
    const totalSamples = Math.floor(duration * sampleRate);
    const bufferLength = Math.min(totalSamples, sampleRate * 600); // Max 10 min worth of samples
    
    console.log('[AudioEngine] Creating synthetic waveform:', { 
      duration, 
      sampleRate, 
      bufferLength 
    });

    // Create stereo buffer
    const buffer = this.audioContext.createBuffer(2, bufferLength, sampleRate);
    
    // Generate visually interesting synthetic waveform
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      // Use multiple frequencies and patterns for a realistic look
      const baseFreq = 2 + channel * 0.5; // Different for each channel
      const envelope = 0.7;
      
      for (let i = 0; i < bufferLength; i++) {
        const t = i / sampleRate;
        const progress = i / bufferLength;
        
        // Create a dynamic pattern with multiple sine waves
        const wave1 = Math.sin(t * baseFreq * 2 * Math.PI) * 0.3;
        const wave2 = Math.sin(t * baseFreq * 4.7 * 2 * Math.PI) * 0.2;
        const wave3 = Math.sin(t * baseFreq * 7.3 * 2 * Math.PI) * 0.15;
        
        // Add some noise for texture
        const noise = (Math.random() - 0.5) * 0.2;
        
        // Dynamic envelope that varies throughout
        const dynamicEnvelope = 0.4 + 0.4 * Math.sin(progress * Math.PI * 8);
        
        // Beat-like pattern
        const beat = Math.pow(Math.abs(Math.sin(t * 2 * Math.PI)), 0.5) * 0.3;
        
        // Combine all elements
        let sample = (wave1 + wave2 + wave3 + noise + beat) * envelope * dynamicEnvelope;
        
        // Ensure values are within -1 to 1
        channelData[i] = Math.max(-1, Math.min(1, sample));
      }
    }

    console.log('[AudioEngine] Synthetic waveform created:', {
      duration: buffer.duration,
      channels: buffer.numberOfChannels,
      length: buffer.length
    });

    return buffer;
  }

  /**
   * Read file as ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };

      reader.onerror = () => {
        reject(new Error('FileReader error while reading file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Initialize analyser node for waveform visualization
   */
  private initializeAnalyserNode(): void {
    if (!this.audioContext) return;

    try {
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
      console.log('[AudioEngine] Analyser node initialized');
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize analyser node', error);
    }
  }

  /**
   * Play audio from current position
   */
  public async play(): Promise<void> {
    if (!this.player || !this.playerLoaded) {
      console.error('[AudioEngine] Cannot play: Player not initialized or not loaded');
      throw new Error('AudioEngine: No audio loaded');
    }

    // Resume audio context if suspended
    if (Tone.context.state !== 'running') {
      console.log('[AudioEngine] Resuming Tone.js context...');
      await Tone.context.resume();
    }

    // If already playing, do nothing
    if (this.isPlaying) {
      console.log('[AudioEngine] Already playing');
      return;
    }

    try {
      // Stop if already started (Tone.Player can't restart while playing)
      if (this.player.state === 'started') {
        this.player.stop();
      }

      // Get current position from store (where we paused)
      const startPosition = useAppStore.getState().audio.currentTime || 0;
      
      // Apply playback rate from store (in case it was changed while paused)
      const storedPlaybackRate = useAppStore.getState().globalControls.playbackRate;
      if (storedPlaybackRate && storedPlaybackRate !== this.currentPlaybackRate) {
        this.setPlaybackRate(storedPlaybackRate);
      }
      
      // Record playback start info for time tracking
      this.playbackStartTime = Tone.now();
      this.playbackStartPosition = startPosition;

      // Start playback from the current position
      this.player.start(Tone.now(), startPosition);

      this.isPlaying = true;
      useAppStore.getState().setIsPlaying(true);

      // Start position tracking using Tone.Transport
      this.startPositionTracking();

      console.log('[AudioEngine] Playback started', {
        startPosition,
        playbackRate: this.currentPlaybackRate,
        pitch: this.currentPitch
      });

    } catch (error) {
      console.error('[AudioEngine] Failed to play audio', error);
      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      throw error;
    }
  }

  /**
   * Pause audio playback
   * Note: Tone.Player doesn't have native pause, so we stop and remember position
   */
  public pause(): void {
    if (!this.isPlaying || !this.player) {
      return;
    }

    try {
      // Calculate and save current position
      const currentTime = this.getCurrentTime();
      
      // Stop the player
      this.player.stop();

      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      
      // Save the position so we can resume from here
      useAppStore.getState().setCurrentTime(currentTime);

      // Stop position tracking
      this.stopPositionTracking();

      console.log('[AudioEngine] Playback paused at', currentTime);

    } catch (error) {
      console.error('[AudioEngine] Failed to pause audio', error);
    }
  }

  /**
   * Stop audio playback and reset to beginning
   */
  public stop(): void {
    try {
      if (this.player && this.player.state === 'started') {
        this.player.stop();
      }

      // Reset playback state
      this.playbackStartPosition = 0;
      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      useAppStore.getState().setCurrentTime(0);

      // Stop position tracking
      this.stopPositionTracking();

      console.log('[AudioEngine] Playback stopped');

    } catch (error) {
      console.error('[AudioEngine] Failed to stop audio', error);
    }
  }

  /**
   * Seek to a specific time position
   */
  public async seek(time: number): Promise<void> {
    if (!this.audioBuffer) {
      throw new Error('AudioEngine: No audio loaded');
    }

    const duration = this.getDuration();
    const seekTime = Math.max(0, Math.min(time, duration));
    const wasPlaying = this.isPlaying;

    // If playing, stop first
    if (wasPlaying && this.player) {
      this.player.stop();
      this.stopPositionTracking();
    }

    // Update position
    this.playbackStartPosition = seekTime;
    useAppStore.getState().setCurrentTime(seekTime);

    // If was playing, resume from new position
    if (wasPlaying) {
      await this.play();
    }

    console.log('[AudioEngine] Seeked to', seekTime);
  }

  /**
   * Get current playback time in seconds
   * Calculated from when playback started and current playback rate
   */
  public getCurrentTime(): number {
    if (!this.isPlaying) {
      // When paused, return the saved position from store
      return useAppStore.getState().audio.currentTime || this.playbackStartPosition;
    }

    // Calculate elapsed time since playback started
    const elapsed = (Tone.now() - this.playbackStartTime) * this.currentPlaybackRate;
    const currentTime = this.playbackStartPosition + elapsed;
    
    // Clamp to duration
    return Math.min(currentTime, this.getDuration());
  }

  /**
   * Start position tracking using Tone.Transport
   */
  private startPositionTracking(): void {
    this.stopPositionTracking();

    // Start Transport if not already started
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }

    // Schedule repeat every 100ms to update position
    this.positionTrackingId = Tone.Transport.scheduleRepeat((time) => {
      if (this.isPlaying) {
        const currentTime = this.getCurrentTime();
        const duration = this.getDuration();
        
        // Update store with current time
        useAppStore.getState().setCurrentTime(currentTime);

        // Check if reached end of audio
        if (currentTime >= duration - 0.05) {
          this.handlePlaybackEnd();
        }
      }
    }, 0.1); // 100ms interval

    console.log('[AudioEngine] Position tracking started');
  }

  /**
   * Stop position tracking
   */
  private stopPositionTracking(): void {
    if (this.positionTrackingId !== null) {
      Tone.Transport.clear(this.positionTrackingId);
      this.positionTrackingId = null;
    }
  }

  /**
   * Handle playback reaching the end
   */
  private handlePlaybackEnd(): void {
    const duration = this.getDuration();
    
    this.isPlaying = false;
    this.playbackStartPosition = duration;
    useAppStore.getState().setIsPlaying(false);
    useAppStore.getState().setCurrentTime(duration);
    
    this.stopPositionTracking();
    
    if (this.player && this.player.state === 'started') {
      this.player.stop();
    }

    console.log('[AudioEngine] Playback ended');
  }

  /**
   * Set playback rate (speed) - independent of pitch
   */
  public setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.25, Math.min(4.0, rate));
    this.currentPlaybackRate = clampedRate;

    if (this.player) {
      this.player.playbackRate = clampedRate;
    }

    console.log('[AudioEngine] Playback rate set to', clampedRate);
  }

  /**
   * Set pitch shift in semitones - independent of speed
   */
  public setPitch(semitones: number): void {
    const clampedPitch = Math.max(-12, Math.min(12, semitones));
    this.currentPitch = clampedPitch;

    if (this.pitchShift) {
      this.pitchShift.pitch = clampedPitch;
    }

    console.log('[AudioEngine] Pitch set to', clampedPitch, 'semitones');
  }

  /**
   * Set volume in dB
   */
  public setVolume(db: number): void {
    const clampedDb = Math.max(-60, Math.min(6, db));
    
    if (this.volumeNode) {
      this.volumeNode.volume.value = clampedDb;
    }

    console.log('[AudioEngine] Volume set to', clampedDb, 'dB');
  }

  /**
   * Get current playback rate
   */
  public getPlaybackRate(): number {
    return this.currentPlaybackRate;
  }

  /**
   * Get current pitch in semitones
   */
  public getPitch(): number {
    return this.currentPitch;
  }

  // ============ Compatibility Methods (for waveform component) ============

  /**
   * Get the current audio buffer (for waveform visualization)
   */
  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  /**
   * Get the audio context (for compatibility)
   */
  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get the analyser node for waveform data
   */
  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Check if audio is loaded
   */
  public isAudioLoaded(): boolean {
    return this.audioBuffer !== null && this.playerLoaded && this.isInitialized;
  }

  /**
   * Get audio duration in seconds
   */
  public getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  /**
   * Get audio sample rate
   */
  public getSampleRate(): number {
    return this.audioBuffer?.sampleRate || 44100;
  }

  /**
   * Get number of audio channels
   */
  public getNumberOfChannels(): number {
    return this.audioBuffer?.numberOfChannels || 0;
  }

  /**
   * Check if audio is currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Resume audio context (required after user interaction)
   */
  public async resumeAudioContext(): Promise<void> {
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
      console.log('[AudioEngine] Tone.js context resumed');
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('[AudioEngine] Web Audio context resumed');
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    console.log('[AudioEngine] Disposing...');

    // Stop playback
    this.stop();

    // Stop position tracking
    this.stopPositionTracking();

    // Dispose Tone.js nodes
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }

    if (this.pitchShift) {
      this.pitchShift.dispose();
      this.pitchShift = null;
    }

    if (this.volumeNode) {
      this.volumeNode.dispose();
      this.volumeNode = null;
    }

    // Clean up Blob URL
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    // Clear references
    this.audioBuffer = null;
    this.analyserNode = null;
    this.audioContext = null;
    this.isInitialized = false;
    this.playerLoaded = false;
    this.isPlaying = false;

    console.log('[AudioEngine] Disposed');
  }
}

// ============ Singleton Management ============

let audioEngineInstance: AudioEngine | null = null;

/**
 * Get or create the AudioEngine singleton instance
 */
export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

/**
 * Reset the AudioEngine singleton
 */
export function resetAudioEngine(): void {
  if (audioEngineInstance) {
    audioEngineInstance.dispose();
    audioEngineInstance = null;
  }
  console.log('[AudioEngine] Singleton reset');
}
