// Core types for Transcribe Pro

export interface Marker {
  id: string;
  start: number; // start time in seconds
  end: number; // end time in seconds
  name: string; // marker name/label
  color?: string;
  notes?: string;
}

export interface AudioState {
  file: File | null;
  duration: number; // in seconds
  currentTime: number; // in seconds
  isPlaying: boolean;
  isLoaded: boolean;
  sampleRate?: number;
  buffer?: AudioBuffer;
}

export interface UIState {
  selectedMarkerId: string | null;
  isMarkerEditorOpen: boolean;
  isSettingsModalOpen: boolean;
  isHelpModalOpen: boolean;
  zoomLevel: number; // waveform zoom
  viewportStart: number; // waveform viewport start time
  viewportEnd: number; // waveform viewport end time
}

export interface GlobalControls {
  pitch: number; // -12 to +12 semitones
  volume: number; // 0 to 1
  playbackRate: number; // 0.5 to 2.0
}

export interface ProjectData {
  audioFilePath: string;
  markers: Marker[];
  globalControls: GlobalControls;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

















