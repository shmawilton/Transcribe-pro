// AudioExporter.ts - Export audio regions and full audio
import { useAppStore } from '../../store/store';
import { FFmpeg } from '@ffmpeg/ffmpeg';

let globalFFmpeg: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;
let ffmpegLoaded = false;

async function ensureFFmpegLoaded(): Promise<FFmpeg> {
  if (globalFFmpeg && ffmpegLoaded) return globalFFmpeg;
  if (ffmpegLoadPromise) {
    await ffmpegLoadPromise;
    return globalFFmpeg!;
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
      console.error('[AudioExporter] Failed to load FFmpeg:', e);
      throw e;
    }
  })();
  await ffmpegLoadPromise;
  return globalFFmpeg!;
}

export interface ExportOptions {
  startTime?: number; // Start time in seconds (0 = beginning)
  endTime?: number; // End time in seconds (undefined = end)
  format?: 'mp3' | 'wav' | 'ogg' | 'flac';
  quality?: number; // 0-100 for MP3 bitrate
  onProgress?: (progress: number) => void;
}

export class AudioExporter {
  /**
   * Export selected region of audio
   */
  static async exportRegion(
    audioFile: File,
    options: ExportOptions = {}
  ): Promise<Blob> {
    const {
      startTime = 0,
      endTime,
      format = 'mp3',
      quality = 128,
      onProgress,
    } = options;

    const store = useAppStore.getState();
    const duration = store.audio.duration || 0;
    const actualEndTime = endTime !== undefined ? Math.min(endTime, duration) : duration;

    if (startTime >= actualEndTime) {
      throw new Error('Start time must be less than end time');
    }

    try {
      const ffmpeg = await ensureFFmpegLoaded();
      
      // Read audio file
      const arrayBuffer = await audioFile.arrayBuffer();
      const fileName = `input.${audioFile.name.split('.').pop()}`;
      await ffmpeg.writeFile(fileName, new Uint8Array(arrayBuffer));

      // Determine output format
      const outputFileName = `output.${format}`;
      const outputMimeType = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        flac: 'audio/flac',
      }[format];

      // Build FFmpeg command
      const args = [
        '-i', fileName,
        '-ss', startTime.toString(),
        '-t', (actualEndTime - startTime).toString(),
      ];

      if (format === 'mp3') {
        args.push('-b:a', `${quality}k`);
      }

      args.push('-y', outputFileName);

      // Execute FFmpeg
      if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
          onProgress(Math.min(100, progress));
        });
      }

      await ffmpeg.exec(args);

      // Read output file
      const data = await ffmpeg.readFile(outputFileName);
      const blob = new Blob([data], { type: outputMimeType });

      // Cleanup
      await ffmpeg.deleteFile(fileName);
      await ffmpeg.deleteFile(outputFileName);

      return blob;
    } catch (error) {
      console.error('[AudioExporter] Export failed:', error);
      throw new Error(`Failed to export audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export full audio file
   */
  static async exportFull(
    audioFile: File,
    options: Omit<ExportOptions, 'startTime' | 'endTime'> = {}
  ): Promise<Blob> {
    return this.exportRegion(audioFile, {
      ...options,
      startTime: 0,
      endTime: undefined,
    });
  }
}
