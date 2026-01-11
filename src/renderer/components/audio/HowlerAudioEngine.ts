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
  
  private duration: number = 0;

  constructor() {
    console.log('[HowlerEngine] Initialized with on-demand pitch conversion');
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
    }
    if (this.originalBlobUrl) URL.revokeObjectURL(this.originalBlobUrl);
    
    this.originalTempPath = null;
    this.originalBlobUrl = null;
    this.currentPitchedBlobUrl = null;
    this.currentPitchedFilePath = null;
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
  }

  public async loadAudioFile(file: File): Promise<void> {
    console.log('[HowlerEngine] ===== LOADING =====');
    console.log('[HowlerEngine] File:', file.name, file.size, 'bytes');

    this.unloadCurrentAudio();
    await this.cleanup();
    this.currentPitch = 0;
    this.targetPitch = 0;
    this.originalDataArray = [];
    this.isProcessingPitch = false;

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
        console.log('[HowlerEngine] Saved temp file:', this.originalTempPath);
      }

      // Load original with Howler
      console.log('[HowlerEngine] Loading original...');
      await this.loadHowlerFromUrl(this.originalBlobUrl);

      // Decode waveform
      await ensureFFmpegLoaded();
      const waveformBuffer = new Uint8Array(this.originalDataArray).buffer;
      this.audioBuffer = await this.decodeWaveform(waveformBuffer, file.name);
      if (this.audioBuffer) {
        useAppStore.getState().setAudioBuffer(this.audioBuffer);
      }

      useAppStore.getState().setIsLoading(false);
      console.log('[HowlerEngine] ===== LOADED =====');

    } catch (error) {
      console.error('[HowlerEngine] Load failed:', error);
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
          this.duration = newHowl.duration();
          
          // If preserving state, seek and play
          if (preserveState) {
            const seekTime = Math.min(preserveState.time, this.duration);
            newHowl.seek(seekTime);
            
            if (preserveState.playing) {
              this.currentSoundId = newHowl.play() as number;
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
            useAppStore.getState().setDuration(this.duration);
            useAppStore.getState().setViewport(0, this.duration);
            useAppStore.getState().setZoomLevel(1);
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
    
    console.log(`[HowlerEngine] 🎵 Processing pitch change to ${targetPitch > 0 ? '+' : ''}${targetPitch}...`);
    emitPitchStatus({ isProcessing: true, targetPitch, progress: 0 });

    try {
      // Check if going back to original
      if (Math.abs(targetPitch) < 0.05) {
        // Switch back to original
        const wasPlaying = this.howl?.playing() || false;
        const currentTime = this.getCurrentTime();
        
        if (this.originalBlobUrl) {
          await this.loadHowlerFromUrl(this.originalBlobUrl, { time: currentTime, playing: wasPlaying });
        }
        
        // Cleanup pitched file
        if (this.currentPitchedFilePath && window.electronAPI?.cleanupTempFile) {
          await window.electronAPI.cleanupTempFile(this.currentPitchedFilePath).catch(() => {});
          this.currentPitchedFilePath = null;
        }
        this.currentPitchedBlobUrl = null;
        
        this.currentPitch = 0;
        console.log('[HowlerEngine] ✅ Switched to original');
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
        console.log('[HowlerEngine] Pitch processing aborted');
        this.isProcessingPitch = false;
        return;
      }

      // Cleanup OLD pitched file before creating new one
      if (this.currentPitchedFilePath && window.electronAPI?.cleanupTempFile) {
        await window.electronAPI.cleanupTempFile(this.currentPitchedFilePath).catch(() => {});
        this.currentPitchedFilePath = null;
      }

      // Call native FFmpeg
      const pitchedPath = await window.electronAPI.pitchShiftFile(this.originalTempPath!, targetPitch);
      
      emitPitchStatus({ isProcessing: true, targetPitch, progress: 80 });

      // Check for abort again
      if (this.pitchProcessingAborted) {
        console.log('[HowlerEngine] Pitch processing aborted after FFmpeg');
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
      console.log(`[HowlerEngine] ✅ Pitch changed to ${targetPitch > 0 ? '+' : ''}${targetPitch}`);
      emitPitchStatus({ isProcessing: false, targetPitch, progress: 100 });

    } catch (error) {
      console.error('[HowlerEngine] Pitch change failed:', error);
      emitPitchStatus({ isProcessing: false, targetPitch: this.currentPitch, progress: 0 });
    }

    this.isProcessingPitch = false;
  }

  // === Standard playback methods ===

  public async play(): Promise<void> {
    if (!this.howl) throw new Error('No audio');
    this.currentSoundId = this.howl.play() as number;
    useAppStore.getState().setIsPlaying(true);
    this.startTimeUpdate();
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

  public stop(): void {
    if (!this.howl) return;
    this.howl.stop();
    this.currentSoundId = null;
    useAppStore.getState().setIsPlaying(false);
    useAppStore.getState().setCurrentTime(0);
    this.stopTimeUpdate();
  }

  public async seek(time: number): Promise<void> {
    if (!this.howl) return;
    const t = Math.max(0, Math.min(time, this.duration));
    const wasPlaying = this.currentSoundId !== null && this.howl.playing(this.currentSoundId);
    
    if (this.currentSoundId !== null) {
      this.howl.seek(t, this.currentSoundId);
    } else {
      this.howl.seek(t);
    }
    useAppStore.getState().setCurrentTime(t);
    
    if (wasPlaying && this.currentSoundId !== null && !this.howl.playing(this.currentSoundId)) {
      this.howl.play(this.currentSoundId);
    }
  }

  public getCurrentTime(): number {
    if (!this.howl) return 0;
    const t = this.currentSoundId !== null ? this.howl.seek(this.currentSoundId) : this.howl.seek();
    return typeof t === 'number' ? t : 0;
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

  public setRate(_rate: number): void {}
  public async resumeAudioContext(): Promise<void> {}

  private startTimeUpdate(): void {
    this.stopTimeUpdate();
    this.timeUpdateInterval = window.setInterval(() => {
      if (this.howl?.playing()) {
        useAppStore.getState().setCurrentTime(this.getCurrentTime());
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
