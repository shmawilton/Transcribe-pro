// AudioEngine.ts - Wilton - Week 1-2
// Core audio processing using Web Audio API + Tone.js

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
 * AudioEngine - Handles audio file loading and processing
 * 
 * Responsibilities:
 * - Load audio files (MP3, WAV, OGG, FLAC, M4A, AAC)
 * - Decode audio using Web Audio API
 * - Manage audio context and buffer
 * - Integrate with Zustand store
 */
export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized: boolean = false;

  // Playback state
  private startTime: number = 0; // When playback started (AudioContext time)
  private pausedTime: number = 0; // Current position when paused (in seconds)
  private isPlaying: boolean = false;
  private timeUpdateInterval: number | null = null; // For updating current time

  constructor() {
    this.initializeAudioContext();
  }

  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      // Use AudioContext or webkitAudioContext for browser compatibility
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser');
      }

      this.audioContext = new AudioContextClass();
      this.isInitialized = true;
      
      console.log('AudioEngine: AudioContext initialized', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state,
      });
    } catch (error) {
      console.error('AudioEngine: Failed to initialize AudioContext', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if a file format is supported
   */
  public isFormatSupported(file: File): boolean {
    const mimeType = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase();

    // Check MIME type
    if (SUPPORTED_AUDIO_FORMATS.some(format => mimeType.includes(format.split('/')[1]))) {
      return true;
    }

    // Fallback: Check file extension
    const supportedExtensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
    return supportedExtensions.includes(extension || '');
  }

  /**
   * Load and decode an audio file
   * 
   * @param file - The audio file to load
   * @returns Promise that resolves when audio is loaded and decoded
   */
  public async loadAudioFile(file: File): Promise<void> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioEngine: AudioContext not initialized');
    }

    // Check if format is supported
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

      console.log('[AudioEngine] Step 1: Updating store with file');
      useAppStore.getState().setAudioFile(file);
      console.log('[AudioEngine] Step 1: Store updated, checking state...');
      const storeAfterFile = useAppStore.getState();
      console.log('[AudioEngine] Store state after file:', {
        hasFile: !!storeAfterFile.audio.file,
        fileName: storeAfterFile.audio.file?.name,
        isLoaded: storeAfterFile.audio.isLoaded
      });

      console.log('[AudioEngine] Step 2: Reading file as ArrayBuffer');
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      console.log('[AudioEngine] Step 2: ArrayBuffer read, size:', arrayBuffer.byteLength);

      // Validate file size (basic corruption check)
      if (arrayBuffer.byteLength === 0) {
        throw new Error('AudioEngine: File is empty or corrupted');
      }

      // Decode audio data with enhanced error handling
      console.log('[AudioEngine] Step 3: Starting audio decode...', {
        arrayBufferSize: arrayBuffer.byteLength,
        fileSize: file.size,
        fileType: file.type,
        fileName: file.name
      });
      
      let decodedBuffer: AudioBuffer;
      
      try {
        console.log('[AudioEngine] Step 3a: Starting decode using BLOB URL method (Electron-compatible)...');
        
        // ELECTRON FIX: Use Blob URL approach which is more reliable
        // Create a Blob from the ArrayBuffer
        const blob = new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        console.log('[AudioEngine] Step 3b: Created Blob URL:', blobUrl);
        
        // Use HTML5 Audio element to validate the file first
        console.log('[AudioEngine] Step 3c: Validating audio with HTML5 Audio element...');
        
        await new Promise<void>((resolve, reject) => {
          const testAudio = new Audio();
          const timeout = setTimeout(() => {
            testAudio.src = '';
            reject(new Error('Audio validation timed out after 10 seconds'));
          }, 10000);
          
          testAudio.oncanplaythrough = () => {
            clearTimeout(timeout);
            console.log('[AudioEngine] Step 3c: ✅ HTML5 Audio can play this file!');
            console.log('[AudioEngine] Step 3c: Duration from Audio element:', testAudio.duration);
            testAudio.src = '';
            resolve();
          };
          
          testAudio.onerror = (e) => {
            clearTimeout(timeout);
            console.error('[AudioEngine] Step 3c: ❌ HTML5 Audio error:', e);
            testAudio.src = '';
            reject(new Error('Audio file is not playable. Try a different format (MP3/WAV).'));
          };
          
          testAudio.src = blobUrl;
          testAudio.load();
        });
        
        // Now decode using fetch + AudioContext (more reliable in Electron)
        console.log('[AudioEngine] Step 3d: Fetching audio via Blob URL...');
        
        // Ensure AudioContext is running
        if (this.audioContext!.state === 'suspended') {
          console.log('[AudioEngine] Step 3d: Resuming suspended AudioContext...');
          await this.audioContext!.resume();
        }
        console.log('[AudioEngine] Step 3d: AudioContext state:', this.audioContext!.state);
        
        // Fetch the blob URL and decode
        const response = await fetch(blobUrl);
        const fetchedBuffer = await response.arrayBuffer();
        console.log('[AudioEngine] Step 3e: Fetched ArrayBuffer size:', fetchedBuffer.byteLength);
        
        // Decode with timeout
        console.log('[AudioEngine] Step 3f: Decoding audio data...');
        
        decodedBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Audio decode timed out after 30 seconds'));
          }, 30000);
          
          this.audioContext!.decodeAudioData(fetchedBuffer)
            .then((buffer) => {
              clearTimeout(timeout);
              console.log('[AudioEngine] Step 3f: ✅ Decode successful!');
              resolve(buffer);
            })
            .catch((error) => {
              clearTimeout(timeout);
              console.error('[AudioEngine] Step 3f: ❌ Decode failed:', error);
              reject(error);
            });
        });
        
        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);
        console.log('[AudioEngine] Step 3g: Audio decode completed successfully!');
        console.log('[AudioEngine] Step 3d: Decoded buffer info:', {
          duration: decodedBuffer.duration,
          sampleRate: decodedBuffer.sampleRate,
          numberOfChannels: decodedBuffer.numberOfChannels,
          length: decodedBuffer.length
        });
      } catch (decodeError) {
        console.error('[AudioEngine] Step 3 ERROR: Decode failed!');
        console.error('[AudioEngine] Decode error type:', typeof decodeError);
        console.error('[AudioEngine] Decode error constructor:', decodeError?.constructor?.name);
        console.error('[AudioEngine] Decode error details:', {
          error: decodeError,
          errorName: decodeError instanceof DOMException ? decodeError.name : 'Unknown',
          errorMessage: decodeError instanceof Error ? decodeError.message : String(decodeError),
          errorStack: decodeError instanceof Error ? decodeError.stack : 'No stack',
          file: file.name,
          fileType: file.type,
          fileSize: file.size,
          arrayBufferSize: arrayBuffer.byteLength
        });
        
        // Handle specific decode errors
        if (decodeError instanceof DOMException) {
          if (decodeError.name === 'EncodingError') {
            throw new Error(
              `AudioEngine: Failed to decode audio file. The file may be corrupted or in an unsupported format. ` +
              `File: ${file.name}, Type: ${file.type}, Error: ${decodeError.message}. ` +
              `Try converting to MP3 or WAV format.`
            );
          } else if (decodeError.name === 'NotSupportedError') {
            throw new Error(
              `AudioEngine: Audio format not supported by browser. ` +
              `File: ${file.name}, Type: ${file.type}. ` +
              `M4A files may not be supported in all browsers. Try converting to MP3 or WAV format.`
            );
          }
        }
        
        // Check if it's a timeout error
        if (decodeError instanceof Error && decodeError.message.includes('timed out')) {
          throw decodeError;
        }
        
        throw new Error(
          `AudioEngine: Failed to decode audio file: ${decodeError instanceof Error ? decodeError.message : 'Unknown decode error'}. ` +
          `File: ${file.name}, Type: ${file.type}. ` +
          `This format may not be supported. Try converting to MP3 or WAV.`
        );
      }

      console.log('[AudioEngine] Step 3e: Validating decoded buffer...');
      
      // Validate decoded buffer
      if (!decodedBuffer) {
        console.error('[AudioEngine] Step 3e ERROR: decodedBuffer is null/undefined');
        throw new Error('AudioEngine: Decoded audio buffer is null or undefined');
      }
      
      if (decodedBuffer.length === 0) {
        console.error('[AudioEngine] Step 3e ERROR: decodedBuffer.length is 0');
        throw new Error('AudioEngine: Decoded audio buffer is empty or invalid');
      }

      if (decodedBuffer.duration <= 0 || !isFinite(decodedBuffer.duration)) {
        console.error('[AudioEngine] Step 3e ERROR: Invalid duration:', decodedBuffer.duration);
        throw new Error(`AudioEngine: Invalid audio duration (${decodedBuffer.duration}). File may be corrupted.`);
      }
      
      console.log('[AudioEngine] Step 3e: Buffer validation passed');

      console.log('[AudioEngine] Step 4: Storing decoded buffer');
      this.audioBuffer = decodedBuffer;
      console.log('[AudioEngine] Step 4: Buffer stored in engine');

      console.log('[AudioEngine] Step 5: Updating store with buffer and duration');
      useAppStore.getState().setAudioBuffer(decodedBuffer);
      console.log('[AudioEngine] Step 5a: Buffer updated in store');
      useAppStore.getState().setDuration(decodedBuffer.duration);
      console.log('[AudioEngine] Step 5b: Duration updated in store');
      
      const storeAfterBuffer = useAppStore.getState();
      console.log('[AudioEngine] Store state after buffer:', {
        hasBuffer: !!storeAfterBuffer.audio.buffer,
        duration: storeAfterBuffer.audio.duration,
        isLoaded: storeAfterBuffer.audio.isLoaded,
        sampleRate: storeAfterBuffer.audio.sampleRate
      });

      console.log('[AudioEngine] Audio file loaded successfully', {
        duration: decodedBuffer.duration,
        sampleRate: decodedBuffer.sampleRate,
        numberOfChannels: decodedBuffer.numberOfChannels,
        length: decodedBuffer.length,
      });

      console.log('[AudioEngine] Step 6: Initializing audio nodes');
      this.initializeAudioNodes();
      console.log('[AudioEngine] Step 6: Audio nodes initialized');

      console.log('[AudioEngine] Step 7: Resetting playback state');
      // Reset playback state when loading new file (safely)
      try {
        this.stop();
        console.log('[AudioEngine] Step 7: Playback state reset');
      } catch (stopError) {
        // Ignore stop errors during load - state will be reset anyway
        console.warn('[AudioEngine] Step 7: Error during stop on load (ignored):', stopError);
      }
      
      console.log('[AudioEngine] ===== LOAD AUDIO FILE COMPLETE =====');
    } catch (error) {
      console.error('AudioEngine: Failed to load audio file', error);
      
      // Comprehensive store reset on error
      const store = useAppStore.getState();
      store.setAudioFile(null);
      store.setDuration(0);
      store.setCurrentTime(0);
      store.setIsPlaying(false);
      store.clearAudioBuffer(); // Clear buffer
      
      // Re-throw with enhanced error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`AudioEngine: Failed to load audio file: ${errorMessage}`);
    }
  }

  /**
   * Read file as ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      console.log('[AudioEngine] readFileAsArrayBuffer: Starting to read file...');
      const reader = new FileReader();

      reader.onload = (event) => {
        console.log('[AudioEngine] readFileAsArrayBuffer: FileReader onload fired');
        if (event.target?.result instanceof ArrayBuffer) {
          console.log('[AudioEngine] readFileAsArrayBuffer: Got ArrayBuffer, size:', event.target.result.byteLength);
          resolve(event.target.result);
        } else {
          console.error('[AudioEngine] readFileAsArrayBuffer: Result is not ArrayBuffer');
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };

      reader.onerror = (error) => {
        console.error('[AudioEngine] readFileAsArrayBuffer: FileReader error:', error);
        reject(new Error('FileReader error while reading file'));
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          console.log(`[AudioEngine] readFileAsArrayBuffer: Progress ${percent}%`);
        }
      };

      console.log('[AudioEngine] readFileAsArrayBuffer: Calling readAsArrayBuffer...');
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Initialize audio nodes for playback and analysis
   */
  private initializeAudioNodes(): void {
    if (!this.audioContext) return;

    try {
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      // Create analyser node for waveform visualization
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.analyserNode.connect(this.gainNode);

      console.log('AudioEngine: Audio nodes initialized');
    } catch (error) {
      console.error('AudioEngine: Failed to initialize audio nodes', error);
    }
  }

  /**
   * Get the current audio buffer
   */
  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  /**
   * Get the audio context
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
   * Get the gain node for volume control
   */
  public getGainNode(): GainNode | null {
    return this.gainNode;
  }

  /**
   * Check if audio is loaded
   */
  public isAudioLoaded(): boolean {
    return this.audioBuffer !== null && this.isInitialized;
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
    return this.audioBuffer?.sampleRate || this.audioContext?.sampleRate || 44100;
  }

  /**
   * Get number of audio channels
   */
  public getNumberOfChannels(): number {
    return this.audioBuffer?.numberOfChannels || 0;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Stop playback
    this.stop();

    // Stop source node
    this.stopSourceNode();

    // Stop time updates
    this.stopTimeUpdate();

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    // Clear all references
    this.audioBuffer = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.audioContext = null;
    this.isInitialized = false;
    this.pausedTime = 0;
    this.isPlaying = false;

    console.log('AudioEngine: Disposed');
  }

  /**
   * Resume audio context (required after user interaction)
   */
  public async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('AudioEngine: AudioContext resumed');
    }
  }

  /**
   * Play audio from current position
   */
  public async play(): Promise<void> {
    if (!this.isAudioLoaded() || !this.audioContext || !this.audioBuffer) {
      throw new Error('AudioEngine: No audio loaded');
    }

    // Resume audio context if suspended
    await this.resumeAudioContext();

    // If already playing, do nothing
    if (this.isPlaying) {
      return;
    }

    try {
      // Stop any existing source node
      this.stopSourceNode();

      // Create new source node
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;

      // Connect to analyser -> gain -> destination
      this.sourceNode.connect(this.analyserNode || this.gainNode || this.audioContext.destination);

      // Handle playback end
      this.sourceNode.onended = () => {
        this.handlePlaybackEnd();
      };

      // Get playback rate from store
      const playbackRate = useAppStore.getState().globalControls.playbackRate;
      this.sourceNode.playbackRate.value = playbackRate;

      // Start playback from paused position
      const offset = this.pausedTime;
      this.startTime = this.audioContext.currentTime - offset;
      this.sourceNode.start(0, offset);

      this.isPlaying = true;
      useAppStore.getState().setIsPlaying(true);

      // Start time update loop
      this.startTimeUpdate();

      console.log('AudioEngine: Playback started', { offset, playbackRate });
    } catch (error) {
      console.error('AudioEngine: Failed to play audio', error);
      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      throw error;
    }
  }

  /**
   * Pause audio playback
   */
  public pause(): void {
    if (!this.isPlaying) {
      return;
    }

    try {
      // Calculate current position
      if (this.audioContext && this.sourceNode) {
        const elapsed = this.audioContext.currentTime - this.startTime;
        this.pausedTime = Math.min(elapsed, this.getDuration());
      }

      // Stop source node
      this.stopSourceNode();

      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);

      // Stop time update loop
      this.stopTimeUpdate();

      // Update current time in store
      useAppStore.getState().setCurrentTime(this.pausedTime);

      console.log('AudioEngine: Playback paused', { pausedTime: this.pausedTime });
    } catch (error) {
      console.error('AudioEngine: Failed to pause audio', error);
    }
  }

  /**
   * Stop audio playback and reset to beginning
   */
  public stop(): void {
    try {
      // Stop source node
      this.stopSourceNode();

      // Reset playback state
      this.pausedTime = 0;
      this.isPlaying = false;
      useAppStore.getState().setIsPlaying(false);
      useAppStore.getState().setCurrentTime(0);

      // Stop time update loop
      this.stopTimeUpdate();

      console.log('AudioEngine: Playback stopped');
    } catch (error) {
      console.error('AudioEngine: Failed to stop audio', error);
    }
  }

  /**
   * Seek to a specific time position
   * 
   * @param time - Time in seconds (0 to duration)
   */
  public async seek(time: number): Promise<void> {
    if (!this.isAudioLoaded() || !this.audioBuffer) {
      throw new Error('AudioEngine: No audio loaded');
    }

    // Clamp time to valid range
    const duration = this.getDuration();
    const seekTime = Math.max(0, Math.min(time, duration));

    const wasPlaying = this.isPlaying;

    // If playing, pause first
    if (wasPlaying) {
      this.pause();
    }

    // Update paused time
    this.pausedTime = seekTime;
    useAppStore.getState().setCurrentTime(seekTime);

    // If was playing, resume from new position
    if (wasPlaying) {
      await this.play();
    }

    console.log('AudioEngine: Seeked to', seekTime);
  }

  /**
   * Get current playback time in seconds
   */
  public getCurrentTime(): number {
    if (!this.isPlaying || !this.audioContext) {
      return this.pausedTime;
    }

    const elapsed = this.audioContext.currentTime - this.startTime;
    return Math.min(elapsed, this.getDuration());
  }

  /**
   * Stop the current source node
   */
  private stopSourceNode(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  /**
   * Handle playback end (reached end of audio)
   */
  private handlePlaybackEnd(): void {
    this.pausedTime = this.getDuration();
    this.isPlaying = false;
    useAppStore.getState().setIsPlaying(false);
    useAppStore.getState().setCurrentTime(this.getDuration());
    this.stopTimeUpdate();
    this.sourceNode = null;

    console.log('AudioEngine: Playback ended');
  }

  /**
   * Start time update loop to update store with current time
   * Updates Zustand store every 100ms with current playback position
   */
  private startTimeUpdate(): void {
    this.stopTimeUpdate(); // Clear any existing interval

    this.timeUpdateInterval = window.setInterval(() => {
      if (this.isPlaying && this.audioContext) {
        try {
          const currentTime = this.getCurrentTime();
          const duration = this.getDuration();
          
          // Update store with current time (real-time position tracking)
          useAppStore.getState().setCurrentTime(currentTime);

          // Check if reached end (with small tolerance for timing)
          if (currentTime >= duration - 0.1) {
            this.handlePlaybackEnd();
          }
        } catch (error) {
          console.error('AudioEngine: Error in time update loop', error);
          // Stop updates on error
          this.stopTimeUpdate();
        }
      }
    }, 100); // Update every 100ms for smooth UI updates
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
   * Check if audio is currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Export singleton instance (optional - can also create new instances)
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
