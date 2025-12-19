import { create } from 'zustand';
import { Marker, AudioState, UIState, GlobalControls, ProjectData } from '../types/types';

interface AppStore {
  // Audio State
  audio: AudioState;
  setAudioFile: (file: File | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setDuration: (duration: number) => void;
  setAudioBuffer: (buffer: AudioBuffer) => void;

  // Markers State
  markers: Marker[];
  addMarker: (marker: Marker) => void;
  updateMarker: (id: string, updates: Partial<Marker>) => void;
  deleteMarker: (id: string) => void;
  setMarkers: (markers: Marker[]) => void;

  // UI State
  ui: UIState;
  setSelectedMarkerId: (id: string | null) => void;
  setIsMarkerEditorOpen: (isOpen: boolean) => void;
  setIsSettingsModalOpen: (isOpen: boolean) => void;
  setIsHelpModalOpen: (isOpen: boolean) => void;
  setZoomLevel: (zoom: number) => void;
  setViewport: (start: number, end: number) => void;

  // Global Controls
  globalControls: GlobalControls;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;

  // Project Management
  loadProject: (project: ProjectData) => void;
  resetProject: () => void;

  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

const initialAudioState: AudioState = {
  file: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  isLoaded: false,
};

const initialUIState: UIState = {
  selectedMarkerId: null,
  isMarkerEditorOpen: false,
  isSettingsModalOpen: false,
  isHelpModalOpen: false,
  zoomLevel: 1,
  viewportStart: 0,
  viewportEnd: 0,
};

const initialGlobalControls: GlobalControls = {
  pitch: 0,
  volume: 1,
  playbackRate: 1,
};

export const useAppStore = create<AppStore>((set) => ({
  // Audio State
  audio: initialAudioState,
  setAudioFile: (file) =>
    set((state) => ({
      audio: { ...state.audio, file, isLoaded: file !== null },
    })),
  setCurrentTime: (time) =>
    set((state) => ({ audio: { ...state.audio, currentTime: time } })),
  setIsPlaying: (isPlaying) =>
    set((state) => ({ audio: { ...state.audio, isPlaying } })),
  setDuration: (duration) =>
    set((state) => ({ audio: { ...state.audio, duration } })),
  setAudioBuffer: (buffer) =>
    set((state) => ({
      audio: { ...state.audio, buffer, sampleRate: buffer.sampleRate },
    })),

  // Markers State
  markers: [],
  addMarker: (marker) =>
    set((state) => ({ markers: [...state.markers, marker] })),
  updateMarker: (id, updates) =>
    set((state) => ({
      markers: state.markers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  deleteMarker: (id) =>
    set((state) => ({ markers: state.markers.filter((m) => m.id !== id) })),
  setMarkers: (markers) => set({ markers }),

  // UI State
  ui: initialUIState,
  setSelectedMarkerId: (id) =>
    set((state) => ({ ui: { ...state.ui, selectedMarkerId: id } })),
  setIsMarkerEditorOpen: (isOpen) =>
    set((state) => ({ ui: { ...state.ui, isMarkerEditorOpen: isOpen } })),
  setIsSettingsModalOpen: (isOpen) =>
    set((state) => ({ ui: { ...state.ui, isSettingsModalOpen: isOpen } })),
  setIsHelpModalOpen: (isOpen) =>
    set((state) => ({ ui: { ...state.ui, isHelpModalOpen: isOpen } })),
  setZoomLevel: (zoom) =>
    set((state) => ({ ui: { ...state.ui, zoomLevel: zoom } })),
  setViewport: (start, end) =>
    set((state) => ({ ui: { ...state.ui, viewportStart: start, viewportEnd: end } })),

  // Global Controls
  globalControls: initialGlobalControls,
  setPitch: (pitch) =>
    set((state) => ({
      globalControls: { ...state.globalControls, pitch },
    })),
  setVolume: (volume) =>
    set((state) => ({
      globalControls: { ...state.globalControls, volume },
    })),
  setPlaybackRate: (rate) =>
    set((state) => ({
      globalControls: { ...state.globalControls, playbackRate: rate },
    })),

  // Project Management
  loadProject: (project) =>
    set({
      markers: project.markers,
      globalControls: project.globalControls,
      audio: { ...initialAudioState },
    }),
  resetProject: () =>
    set({
      audio: initialAudioState,
      markers: [],
      ui: initialUIState,
      globalControls: initialGlobalControls,
    }),

  // Theme
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  },
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    });
  },
}));

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  useAppStore.setState({ theme: savedTheme });
} else {
  document.documentElement.setAttribute('data-theme', 'dark');
}

