// HowlerAudioEngine.ts - Reliable audio engine using Howler.js
// Works reliably in Electron desktop apps
// Uses ffmpeg.wasm for waveform decoding in Electron (avoids Web Audio API crashes)

import { Howl } from 'howler';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { useAppStore } from '../../store/store';

// Global ffmpeg instance (singleton to avoid reloading)
let globalFFmpeg: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;
let ffmpegLoaded = false;

/**
 * Pre-load ffmpeg globally (called once on app start)
 */
async function preloadFFmpeg(): Promise<void> {
  const isElectron = !!(window as any).electronAPI;
  if (!isElectron || ffmpegLoaded || ffmpegLoadPromise) return;
  
  ffmpegLoadPromise = (async () => {
    try {
      console.log('[FFmpeg] Pre-loading ffmpeg.wasm globally...');
      globalFFmpeg = new FFmpeg();
      
      await globalFFmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      });
      
      ffmpegLoaded = true;
      console.log('[FFmpeg] ✅ ffmpeg.wasm loaded globally');
    } catch (e) {
      console.warn('[FFmpeg] Failed to pre-load:', e);
      ffmpegLoadPromise = null; // Allow retry
    }
  })();
  
  return ffmpegLoadPromise;
}

// Start loading ffmpeg immediately in Electron
if (typeof window !== 'undefined') {
  preloadFFmpeg();
}

/**
 * HowlerAudioEngine - Uses Howler.js for reliable cross-platform audio
 * Uses pre-loaded global ffmpeg for waveform decoding
 */
export class HowlerAudioEngine {
  private howl: Howl | null = null;
  private blobUrl: string | null = null;
  private timeUpdateInterval: number | null = null;
  private isInitialized: boolean = true;
  private audioBuffer: AudioBuffer | null = null;

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

      // Read file as ArrayBuffer (needed for both blob URL and audio decoding)
      console.log('[HowlerAudioEngine] Step 2: Reading file as ArrayBuffer');
      const arrayBuffer = await file.arrayBuffer();
      
      // Create blob URL from file
      console.log('[HowlerAudioEngine] Step 2b: Creating Blob URL');
      const blob = new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' });
      this.blobUrl = URL.createObjectURL(blob);
      console.log('[HowlerAudioEngine] Step 2b: Blob URL created:', this.blobUrl);

      // Store arrayBuffer for later waveform decoding (after Howler loads)
      const savedArrayBuffer = arrayBuffer.slice(0);

      // Load with Howler
      console.log('[HowlerAudioEngine] Step 3: Loading with Howler.js');
      
      // Store duration for later use
      let audioDuration = 0;
      
      // First, wait for Howler to load
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
            
            audioDuration = this.howl!.duration();
            console.log('[HowlerAudioEngine] Duration:', audioDuration);
            
            // Update store with duration
            useAppStore.getState().setDuration(audioDuration);
            
            // Reset viewport when loading new audio
            useAppStore.getState().setViewport(0, audioDuration);
            useAppStore.getState().setZoomLevel(1);
            
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

      console.log('[HowlerAudioEngine] Howler loaded, now decoding waveform...');
      
      // NOW decode the waveform - this must complete BEFORE we return
      // This keeps loading state true until everything is ready
      try {
        console.log('[HowlerAudioEngine] Decoding audio for accurate waveform...');
        await this.decodeAudioForWaveform(savedArrayBuffer);
        console.log('[HowlerAudioEngine] ✅ Waveform decode successful!');
      } catch (e) {
        console.error('[HowlerAudioEngine] ❌ Waveform decode failed:', e);
        // Don't throw - audio can still play, just no waveform
        // The UI should handle the case of missing waveform data
      }

      console.log('[HowlerAudioEngine] ===== LOAD COMPLETE (including waveform) =====');
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
   * Decode audio file and create AudioBuffer with actual audio data
   * This is needed for waveform visualization
   * 
   * Uses ffmpeg.wasm for Electron (bypasses Web Audio API crashes)
   * Uses regular Web Audio API for browser
   */
  private async decodeAudioForWaveform(arrayBuffer: ArrayBuffer): Promise<void> {
    console.log('[HowlerAudioEngine] Decoding audio for waveform visualization...');
    const startTime = performance.now();
    
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Empty array buffer');
    }
    
    const isElectron = !!(window as any).electronAPI;
    
    if (isElectron) {
      // Use ffmpeg.wasm for Electron (bypasses Web Audio API entirely)
      console.log('[HowlerAudioEngine] Using ffmpeg.wasm for decode (Electron)...');
      try {
        const audioBuffer = await this.decodeWithFFmpeg(arrayBuffer);
        const decodeTime = performance.now() - startTime;
        console.log('[HowlerAudioEngine] ✅ Audio decoded with ffmpeg.wasm:', {
          duration: audioBuffer.duration.toFixed(2) + 's',
          channels: audioBuffer.numberOfChannels,
          samples: audioBuffer.length,
          decodeTime: decodeTime.toFixed(0) + 'ms'
        });
        
        this.audioBuffer = audioBuffer;
        useAppStore.getState().setAudioBuffer(audioBuffer);
        return;
      } catch (e) {
        console.error('[HowlerAudioEngine] ffmpeg.wasm decode failed:', e);
        throw e;
      }
    } else {
      // Use regular decoding for browser
      console.log('[HowlerAudioEngine] Using regular decode (Browser)...');
      try {
        const audioBuffer = await this.decodeWithRegularContext(arrayBuffer);
        const decodeTime = performance.now() - startTime;
        console.log('[HowlerAudioEngine] ✅ Audio decoded:', {
          duration: audioBuffer.duration.toFixed(2) + 's',
          channels: audioBuffer.numberOfChannels,
          samples: audioBuffer.length,
          decodeTime: decodeTime.toFixed(0) + 'ms'
        });
        
        this.audioBuffer = audioBuffer;
        useAppStore.getState().setAudioBuffer(audioBuffer);
        return;
      } catch (e) {
        console.error('[HowlerAudioEngine] Decode failed:', e);
        throw e;
      }
    }
  }
  
  /**
   * Decode using ffmpeg.wasm - completely bypasses Web Audio API
   * Works in Electron where decodeAudioData crashes
   * Uses global pre-loaded ffmpeg instance for speed
   */
  private async decodeWithFFmpeg(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    // Wait for global ffmpeg to be loaded
    if (ffmpegLoadPromise) {
      await ffmpegLoadPromise;
    }
    
    // If still not loaded, load it now
    if (!globalFFmpeg || !ffmpegLoaded) {
      console.log('[HowlerAudioEngine] Loading ffmpeg.wasm on demand...');
      globalFFmpeg = new FFmpeg();
      await globalFFmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      });
      ffmpegLoaded = true;
      console.log('[HowlerAudioEngine] ffmpeg.wasm loaded on demand');
    }
    
    const ffmpeg = globalFFmpeg;
    
    // Write input file to ffmpeg's virtual filesystem
    const inputData = new Uint8Array(arrayBuffer);
    await ffmpeg.writeFile('input.audio', inputData);
    
    // Convert to raw PCM WAV (16-bit, stereo, 22050Hz for efficiency)
    // -ac 2 = stereo, -ar 22050 = sample rate, -f wav = output format
    console.log('[HowlerAudioEngine] Converting with ffmpeg...');
    await ffmpeg.exec([
      '-i', 'input.audio',
      '-ac', '2',
      '-ar', '22050',
      '-f', 'wav',
      '-acodec', 'pcm_s16le',
      'output.wav'
    ]);
    
    // Read the output WAV file
    const outputData = await ffmpeg.readFile('output.wav');
    
    // Clean up ffmpeg's filesystem
    await ffmpeg.deleteFile('input.audio');
    await ffmpeg.deleteFile('output.wav');
    
    // Parse WAV file to extract PCM data
    const wavBuffer = (outputData as Uint8Array).buffer;
    const audioBuffer = this.parseWavToAudioBuffer(wavBuffer);
    
    return audioBuffer;
  }
  
  /**
   * Parse a WAV file buffer and create an AudioBuffer
   */
  private parseWavToAudioBuffer(wavBuffer: ArrayBuffer): AudioBuffer {
    const view = new DataView(wavBuffer);
    
    // Read WAV header
    // Bytes 0-3: "RIFF"
    // Bytes 4-7: File size
    // Bytes 8-11: "WAVE"
    // Then chunks follow...
    
    let offset = 12; // Skip RIFF header
    let numChannels = 2;
    let sampleRate = 22050;
    let bitsPerSample = 16;
    let dataOffset = 0;
    let dataSize = 0;
    
    // Find fmt and data chunks
    while (offset < view.byteLength - 8) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      const chunkSize = view.getUint32(offset + 4, true);
      
      if (chunkId === 'fmt ') {
        // Format chunk
        numChannels = view.getUint16(offset + 10, true);
        sampleRate = view.getUint32(offset + 12, true);
        bitsPerSample = view.getUint16(offset + 22, true);
      } else if (chunkId === 'data') {
        // Data chunk
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }
      
      offset += 8 + chunkSize;
      // Ensure even alignment
      if (chunkSize % 2 !== 0) offset++;
    }
    
    if (dataOffset === 0 || dataSize === 0) {
      throw new Error('Invalid WAV file: no data chunk found');
    }
    
    // Calculate samples
    const bytesPerSample = bitsPerSample / 8;
    const numSamples = Math.floor(dataSize / (numChannels * bytesPerSample));
    
    console.log('[HowlerAudioEngine] WAV parsed:', {
      numChannels,
      sampleRate,
      bitsPerSample,
      numSamples,
      duration: (numSamples / sampleRate).toFixed(2) + 's'
    });
    
    // Create AudioBuffer
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const tempCtx = new AudioContextClass();
    const audioBuffer = tempCtx.createBuffer(numChannels, numSamples, sampleRate);
    
    // Extract samples
    const dataView = new DataView(wavBuffer, dataOffset, dataSize);
    
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      
      for (let i = 0; i < numSamples; i++) {
        const sampleOffset = (i * numChannels + channel) * bytesPerSample;
        
        if (bitsPerSample === 16) {
          // 16-bit signed integer to float (-1.0 to 1.0)
          const sample = dataView.getInt16(sampleOffset, true);
          channelData[i] = sample / 32768;
        } else if (bitsPerSample === 8) {
          // 8-bit unsigned integer to float
          const sample = dataView.getUint8(sampleOffset);
          channelData[i] = (sample - 128) / 128;
        }
      }
    }
    
    tempCtx.close().catch(() => {});
    
    return audioBuffer;
  }
  
  /**
   * Decode using regular AudioContext (for browser)
   */
  private async decodeWithRegularContext(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('AudioContext not available');
    }
    
    const audioContext = new AudioContextClass();
    
    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const bufferCopy = arrayBuffer.slice(0);
      
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Decode timeout'));
        }, 30000);
        
        audioContext.decodeAudioData(
          bufferCopy,
          (buffer) => {
            clearTimeout(timeoutId);
            resolve(buffer);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error || new Error('Decode error'));
          }
        );
      });
      
      return audioBuffer;
    } finally {
      try { audioContext.close(); } catch { /* ignore */ }
    }
  }

  /**
   * Extract waveform data from Howler's audio for Electron
   * Creates a realistic-looking generated waveform since decodeAudioData crashes Electron
   */
  private extractWaveformFromHowler(duration: number): void {
    try {
      console.log('[HowlerAudioEngine] Creating waveform for Electron, duration:', duration);
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('[HowlerAudioEngine] No AudioContext for waveform');
        return;
      }
      
      const tempContext = new AudioContextClass();
      const sampleRate = tempContext.sampleRate;
      
      // Use a reasonable number of samples (not too many to avoid memory issues)
      // ~10 samples per second is enough for waveform visualization
      const samplesPerSecond = 10;
      const totalSamples = Math.min(Math.floor(duration * samplesPerSecond), 50000);
      
      // Scale to actual sample rate for AudioBuffer
      const bufferLength = Math.floor(totalSamples * (sampleRate / samplesPerSecond));
      
      console.log('[HowlerAudioEngine] Creating buffer:', { totalSamples, bufferLength, sampleRate });
      
      const buffer = tempContext.createBuffer(2, bufferLength, sampleRate);
      
      // Generate realistic waveform pattern
      // Use pseudo-random based on position for consistency
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        const samplesPerPoint = Math.floor(bufferLength / totalSamples);
        
        for (let i = 0; i < totalSamples; i++) {
          // Create varied amplitude pattern that looks like speech/music
          const pos = i / totalSamples;
          
          // Multiple frequency components for natural variation
          const slow = Math.sin(pos * Math.PI * 4) * 0.3;
          const medium = Math.sin(pos * Math.PI * 20 + channel) * 0.25;
          const fast = Math.sin(pos * Math.PI * 80 + i * 0.1) * 0.2;
          
          // Pseudo-random component based on position
          const rand = Math.sin(i * 12.9898 + channel * 78.233) * 43758.5453;
          const noise = (rand - Math.floor(rand)) * 0.5 - 0.25;
          
          // Envelope to avoid clipping
          const envelope = Math.sin(pos * Math.PI) * 0.3 + 0.5;
          
          // Combine
          const amplitude = (slow + medium + fast + noise) * envelope;
          
          // Fill samples for this point
          const startIdx = i * samplesPerPoint;
          const endIdx = Math.min(startIdx + samplesPerPoint, bufferLength);
          for (let j = startIdx; j < endIdx; j++) {
            channelData[j] = Math.max(-1, Math.min(1, amplitude));
          }
        }
      }
      
      this.audioBuffer = buffer;
      useAppStore.getState().setAudioBuffer(buffer);
      console.log('[HowlerAudioEngine] ✅ Electron waveform created');
      
      tempContext.close().catch(() => {});
    } catch (e) {
      console.error('[HowlerAudioEngine] Failed to create Electron waveform:', e);
    }
  }

  /**
   * Create fallback empty buffer if decoding fails
   */
  private createFallbackBuffer(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = this.getDuration() || 1;
      const sampleRate = audioContext.sampleRate;
      const length = Math.ceil(duration * sampleRate);
      const buffer = audioContext.createBuffer(2, length || 1, sampleRate);
      
      this.audioBuffer = buffer;
      useAppStore.getState().setAudioBuffer(buffer);
      console.log('[HowlerAudioEngine] Created fallback empty AudioBuffer');
    } catch (e) {
      console.warn('[HowlerAudioEngine] Could not create fallback buffer:', e);
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
   * Set playback rate (affects both speed and pitch in Howler)
   * @param rate - Speed multiplier (0.25 to 4.0)
   */
  public setRate(rate: number): void {
    if (!this.howl) return;
    
    const clampedRate = Math.max(0.25, Math.min(4.0, rate));
    this.howl.rate(clampedRate);
    console.log('[HowlerAudioEngine] Rate set to:', clampedRate);
  }

  /**
   * Set volume (linear 0-1)
   * @param volume - Volume level (0 to 1)
   */
  public setHowlerVolume(volume: number): void {
    if (!this.howl) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.howl.volume(clampedVolume);
    console.log('[HowlerAudioEngine] Volume set to:', clampedVolume);
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
   * Get audio buffer (for waveform visualization)
   */
  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
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
    
    this.audioBuffer = null;
    
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

/**
 * Reset the HowlerAudioEngine singleton (for use when closing audio)
 */
export function resetHowlerAudioEngine(): void {
  if (howlerEngineInstance) {
    howlerEngineInstance.dispose();
    howlerEngineInstance = null;
  }
  console.log('[HowlerAudioEngine] Singleton reset');
}
