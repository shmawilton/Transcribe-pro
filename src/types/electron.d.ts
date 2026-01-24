export interface KeyDetectionResult {
  key: string;
  mode: string;
  confidence: number;
  camelot: string;
}

export interface ElectronAPI {
  platform: string;
  isElectron: boolean;
  
  // Window controls
  closeWindow: () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  
  // Audio processing - FILE PATH based (fast, no large data transfer)
  saveTempAudio: (audioData: number[], fileName: string) => Promise<string>;
  pitchShiftFile: (inputPath: string, semitones: number) => Promise<string>;
  timeStretchFile: (inputPath: string, speed: number) => Promise<string>;
  readAudioFile: (filePath: string) => Promise<number[]>;
  cleanupTempFile: (filePath: string) => Promise<void>;
  checkFFmpeg: () => Promise<boolean>;
  
  // Audio effects
  normalizeAudio: (inputPath: string, targetLoudness?: number) => Promise<string>;
  applyFade: (inputPath: string, fadeInDuration: number, fadeOutDuration: number) => Promise<string>;
  
  // Audio analysis
  detectKey: (inputPath: string) => Promise<KeyDetectionResult>;
  
  // File dialogs for project save/load
  saveProjectDialog: (projectData: string) => Promise<{ canceled: boolean; filePath?: string }>;
  saveProjectDirect: (projectData: string, filePath: string) => Promise<{ success: boolean; filePath?: string }>;
  loadProjectDialog: () => Promise<{ canceled: boolean; filePath?: string; projectData?: string }>;
  loadProjectFromPath: (filePath: string) => Promise<{ success: boolean; filePath?: string; projectData?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
