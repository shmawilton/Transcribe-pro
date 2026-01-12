import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,
  
  // Window controls
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  
  // Audio processing - FILE PATH based (fast, no large data transfer)
  // Save original audio to temp file (only once per file load)
  saveTempAudio: async (audioData: number[], fileName: string): Promise<string> => {
    return await ipcRenderer.invoke('save-temp-audio', audioData, fileName);
  },
  
  // Apply pitch shift using file paths (fast!)
  pitchShiftFile: async (inputPath: string, semitones: number): Promise<string> => {
    return await ipcRenderer.invoke('pitch-shift-file', inputPath, semitones);
  },
  
  // Apply time-stretch using file paths (fast!)
  timeStretchFile: async (inputPath: string, speed: number): Promise<string> => {
    return await ipcRenderer.invoke('time-stretch-file', inputPath, speed);
  },
  
  // Read processed audio file back
  readAudioFile: async (filePath: string): Promise<number[]> => {
    return await ipcRenderer.invoke('read-audio-file', filePath);
  },
  
  // Cleanup temp files
  cleanupTempFile: async (filePath: string): Promise<void> => {
    return await ipcRenderer.invoke('cleanup-temp-file', filePath);
  },
  
  // Check if FFmpeg is available
  checkFFmpeg: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('check-ffmpeg');
  },
});
