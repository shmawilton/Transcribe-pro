// ProjectSaver.ts - Wilton - Week 3
// Project saving logic with .tsproj format
// Enhanced for iOS/Android PWA with IndexedDB storage

import { useAppStore } from '../../store/store';
import { ProjectData, RecentProject } from '../../types/types';

const PROJECT_VERSION = '1.0.0';
const APP_VERSION = '1.0.0';
const RECENT_PROJECTS_KEY = 'transcribe-pro-recent-projects';
const WEB_AUTOSAVE_KEY = 'transcribe-pro-web-autosave';
const MAX_RECENT_PROJECTS = 10;
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// IndexedDB constants for mobile PWA storage
const IDB_DATABASE_NAME = 'TranscribeProDB';
const IDB_STORE_NAME = 'projects';
const IDB_VERSION = 1;

// Detect Electron environment
const isElectron = !!(window as any).electronAPI || 
                   (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.electron);

// Detect mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768);
};

// ============ IndexedDB Helper Functions ============

/**
 * Open IndexedDB database
 */
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DATABASE_NAME, IDB_VERSION);
    
    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create projects store if it doesn't exist
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        console.log('[IndexedDB] Created projects store');
      }
    };
  });
};

export interface StoredProject {
  id: string;
  name: string;
  projectData: ProjectData;
  createdAt: string;
  updatedAt: string;
  audioFileName?: string;
  thumbnailColor?: string; // For visual identification
}

/**
 * Save project to IndexedDB
 */
export const saveProjectToIndexedDB = async (project: StoredProject): Promise<void> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IDB_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IDB_STORE_NAME);
    const request = store.put(project);
    
    request.onerror = () => {
      console.error('[IndexedDB] Failed to save project:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('[IndexedDB] Project saved:', project.name);
      resolve();
    };
  });
};

/**
 * Get all projects from IndexedDB
 */
export const getAllProjectsFromIndexedDB = async (): Promise<StoredProject[]> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IDB_STORE_NAME], 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to get projects:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        // Sort by updatedAt descending
        const projects = request.result as StoredProject[];
        projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(projects);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting projects:', error);
    return [];
  }
};

/**
 * Get a single project from IndexedDB by ID
 */
export const getProjectFromIndexedDB = async (id: string): Promise<StoredProject | null> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IDB_STORE_NAME], 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.get(id);
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to get project:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error getting project:', error);
    return null;
  }
};

/**
 * Delete project from IndexedDB
 */
export const deleteProjectFromIndexedDB = async (id: string): Promise<void> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([IDB_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IDB_STORE_NAME);
    const request = store.delete(id);
    
    request.onerror = () => {
      console.error('[IndexedDB] Failed to delete project:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('[IndexedDB] Project deleted:', id);
      resolve();
    };
  });
};

// ============ End IndexedDB Helper Functions ============

export class ProjectSaver {
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private currentProjectPath: string | null = null;
  private onNotification?: (message: string, type: 'success' | 'error') => void;
  private onProjectNameChange?: (name: string) => void;
  private lastAutoSavedAt: number = 0;

  constructor(
    onNotification?: (message: string, type: 'success' | 'error') => void,
    onProjectNameChange?: (name: string) => void
  ) {
    this.onNotification = onNotification;
    this.onProjectNameChange = onProjectNameChange;
  }

  /**
   * Show a notification message
   */
  private notify(message: string, type: 'success' | 'error' = 'success') {
    if (this.onNotification) {
      this.onNotification(message, type);
    } else {
      // Fallback to console or alert
      console.log(`[ProjectSaver] ${type.toUpperCase()}: ${message}`);
      if (type === 'error') {
        alert(`Error: ${message}`);
      }
    }
  }

  /**
   * Convert audio file to base64
   */
  private async audioFileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:audio/mpeg;base64,")
        const base64Data = result.split(',')[1] || result;
        resolve({
          data: base64Data,
          mimeType: file.type || 'audio/mpeg'
        });
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get current project data from store
   */
  private async getProjectData(): Promise<ProjectData> {
    const store = useAppStore.getState();
    const audioFile = store.audio.file;
    
    // Get audio file path or name (for backward compatibility)
    let audioFilePath = '';
    let audioFileName = '';
    let audioFileData: string | undefined;
    let audioFileMimeType: string | undefined;
    
    if (audioFile) {
      audioFileName = audioFile.name;
      
      // Embed audio file as base64 (REQUIRED for new format)
      try {
        console.log('[ProjectSaver] Embedding audio file:', {
          name: audioFileName,
          size: audioFile.size,
          type: audioFile.type
        });
        
        const audioData = await this.audioFileToBase64(audioFile);
        audioFileData = audioData.data;
        audioFileMimeType = audioData.mimeType;
        
        if (!audioFileData || audioFileData.length === 0) {
          throw new Error('Failed to encode audio file - empty data');
        }
        
        console.log('[ProjectSaver] Audio file embedded successfully:', {
          name: audioFileName,
          originalSize: audioFile.size,
          mimeType: audioFileMimeType,
          base64Length: audioFileData.length,
          estimatedSize: Math.round(audioFileData.length * 0.75) // Base64 is ~33% larger
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ProjectSaver] CRITICAL: Failed to embed audio file:', errorMessage);
        // Don't fall back - this is a critical error
        // Projects MUST have embedded audio in the new format
        throw new Error(`Failed to embed audio file in project: ${errorMessage}. Please try again.`);
      }
    }

    return {
      version: PROJECT_VERSION,
      audioFilePath: audioFilePath || undefined, // Optional for backward compatibility
      audioFileName: audioFileName || undefined,
      audioFileData, // Embedded audio as base64
      audioFileMimeType, // MIME type for proper loading
      markers: store.markers,
      globalControls: store.globalControls,
      uiState: {
        zoomLevel: store.ui.zoomLevel,
        viewportStart: store.ui.viewportStart,
        viewportEnd: store.ui.viewportEnd,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: APP_VERSION,
      },
    };
  }

  /**
   * Browser-only auto-save to localStorage so reloads don't lose state
   * Stores the full ProjectData including embedded audio.
   */
  private saveToLocalStorage(projectData: ProjectData): void {
    try {
      localStorage.setItem(WEB_AUTOSAVE_KEY, JSON.stringify(projectData));
      this.lastAutoSavedAt = Date.now();
      // Track in store for unsaved-changes warnings
      try {
        (useAppStore.getState() as any).setLastAutoSaveAt?.(this.lastAutoSavedAt);
      } catch (_) {}
      console.log('[ProjectSaver] Web auto-saved project to localStorage');
    } catch (error) {
      console.warn('[ProjectSaver] Failed to web auto-save to localStorage:', error);
    }
  }

  /**
   * Save project data to a file
   */
  private async saveToFile(projectData: ProjectData, filePath?: string): Promise<string | null> {
    try {
      const jsonData = JSON.stringify(projectData, null, 2);

      if (isElectron && (window as any).electronAPI) {
        // Use Electron file dialog or direct save
        if (!filePath) {
          // No path specified - show dialog
          const result = await (window as any).electronAPI.saveProjectDialog(jsonData);
          if (result.canceled) {
            return null;
          }
          filePath = result.filePath;
        } else {
          // Direct save to specified path (for auto-save)
          try {
            const result = await (window as any).electronAPI.saveProjectDirect(jsonData, filePath);
            if (result.success) {
              filePath = result.filePath || filePath;
            } else {
              throw new Error('Direct save failed');
            }
          } catch (error) {
            // If direct save fails (e.g., file was moved/deleted), fall back to dialog
            console.warn('[ProjectSaver] Direct save failed, falling back to dialog:', error);
            const result = await (window as any).electronAPI.saveProjectDialog(jsonData);
            if (result.canceled) {
              return null;
            }
            filePath = result.filePath;
          }
        }
      } else {
        // Browser: download as file
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath || 'project.tsproj';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // In browser, we can't get the actual file path, so return a placeholder
        // Auto-save is handled via localStorage instead
        filePath = 'browser-download';
      }

      return filePath || null;
    } catch (error) {
      console.error('[ProjectSaver] Error saving project:', error);
      throw error;
    }
  }

  /**
   * Save project - auto-saves with untitled name if no path is set
   */
  async saveProject(): Promise<boolean> {
    try {
      const store = useAppStore.getState();
      
      // Check if audio is loaded
      if (!store.audio.file || !store.audio.isLoaded) {
        this.notify('Please load an audio file before saving a project.', 'error');
        return false;
      }

      const projectData = await this.getProjectData();
      
      // Verify that audio was embedded
      if (!projectData.audioFileData) {
        this.notify('Failed to embed audio file in project. Please try again.', 'error');
        return false;
      }
      
      console.log('[ProjectSaver] Project data ready:', {
        hasEmbeddedAudio: !!projectData.audioFileData,
        audioFileName: projectData.audioFileName,
        markersCount: projectData.markers.length
      });
      
      // If no path is set, auto-save with untitled name
      let filePath = this.currentProjectPath;
      if (!filePath || filePath === 'browser-download') {
        // Auto-save: show dialog with suggested untitled name
        this.notify('Auto-saving project...', 'success');
        // The save dialog will handle suggesting the untitled name
        filePath = await this.saveToFile(projectData);
      } else {
        // Save to existing path (auto-save)
        this.notify('Auto-saving project...', 'success');
        filePath = await this.saveToFile(projectData, filePath);
      }

      if (!filePath) {
        // User cancelled
        return false;
      }

      // Update current project path
      this.currentProjectPath = filePath;
      // Mark project as saved for web-restore semantics too
      try {
        (useAppStore.getState() as any).setLastManualSaveAt?.(Date.now());
      } catch (_) {}

      // Extract and notify project name change
      const fileName = filePath.split(/[/\\]/).pop() || 'project.tsproj';
      const projectName = fileName.replace(/\.tsproj$/, '');
      if (this.onProjectNameChange) {
        this.onProjectNameChange(projectName);
      }

      // Add to recent projects
      this.addToRecentProjects(filePath, projectData.audioFileName || 'Unknown');

      // Always update web autosave snapshot on manual save too
      if (!isElectron) {
        this.saveToLocalStorage(projectData);
      }

      this.notify('Project saved successfully!', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project';
      this.notify(`Failed to save project: ${errorMessage}`, 'error');
      return false;
    }
  }

  /**
   * Save project as - always opens dialog
   */
  async saveProjectAs(): Promise<boolean> {
    try {
      const store = useAppStore.getState();
      
      // Check if audio is loaded
      if (!store.audio.file || !store.audio.isLoaded) {
        this.notify('Please load an audio file before saving a project.', 'error');
        return false;
      }

      const projectData = await this.getProjectData();
      
      // Verify that audio was embedded
      if (!projectData.audioFileData) {
        this.notify('Failed to embed audio file in project. Please try again.', 'error');
        return false;
      }
      
      console.log('[ProjectSaver] Project data ready:', {
        hasEmbeddedAudio: !!projectData.audioFileData,
        audioFileName: projectData.audioFileName,
        markersCount: projectData.markers.length
      });
      
      this.notify('Saving project with embedded audio...', 'success');
      const filePath = await this.saveToFile(projectData);

      if (!filePath) {
        // User cancelled
        return false;
      }

      // Update current project path
      this.currentProjectPath = filePath;
      try {
        (useAppStore.getState() as any).setLastManualSaveAt?.(Date.now());
      } catch (_) {}

      // Extract and notify project name change
      const fileName = filePath.split(/[/\\]/).pop() || 'project.tsproj';
      const projectName = fileName.replace(/\.tsproj$/, '');
      if (this.onProjectNameChange) {
        this.onProjectNameChange(projectName);
      }

      // Add to recent projects
      this.addToRecentProjects(filePath, projectData.audioFileName || 'Unknown');

      if (!isElectron) {
        this.saveToLocalStorage(projectData);
      }

      this.notify('Project saved successfully!', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project';
      this.notify(`Failed to save project: ${errorMessage}`, 'error');
      return false;
    }
  }

  /**
   * Set current project path (used when loading a project)
   */
  setCurrentProjectPath(filePath: string | null) {
    this.currentProjectPath = filePath;
  }

  /**
   * Get current project path
   */
  getCurrentProjectPath(): string | null {
    return this.currentProjectPath;
  }

  /**
   * Get current project name from path
   */
  getCurrentProjectName(): string {
    if (!this.currentProjectPath) {
      return 'Untitled Project';
    }
    const fileName = this.currentProjectPath.split(/[/\\]/).pop() || 'project.tsproj';
    return fileName.replace(/\.tsproj$/, '');
  }

  /**
   * Check if project has been saved (has a path)
   */
  hasSavedProject(): boolean {
    return this.currentProjectPath !== null && this.currentProjectPath !== 'browser-download';
  }

  /**
   * Get next available untitled project name
   */
  async getNextUntitledProjectName(): Promise<string> {
    // For now, use timestamp-based naming to avoid conflicts
    // In the future, we could check for existing files if Electron API supports it
    const timestamp = Date.now();
    return `untitled-${timestamp}.tsproj`;
  }

  /**
   * Start auto-save (saves every 5 minutes)
   */
  startAutoSave() {
    this.stopAutoSave(); // Clear any existing timer

    // Read settings (from SettingsModal localStorage)
    let enabled = true;
    let intervalMs = AUTO_SAVE_INTERVAL;
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.autoSaveEnabled === 'boolean') enabled = parsed.autoSaveEnabled;
        if (typeof parsed.autoSaveInterval === 'number' && isFinite(parsed.autoSaveInterval)) {
          const minutes = Math.max(1, Math.min(60, parsed.autoSaveInterval));
          intervalMs = minutes * 60 * 1000;
        }
      }
    } catch (_) {}

    if (!enabled) {
      console.log('[ProjectSaver] Auto-save disabled in settings');
      return;
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        const store = useAppStore.getState();
        if (!store.audio.file || !store.audio.isLoaded) return;

        const projectData = await this.getProjectData();

        if (isElectron) {
          // Only auto-save to disk if we have a saved project path
          if (this.currentProjectPath) {
            await this.saveToFile(projectData, this.currentProjectPath);
            console.log('[ProjectSaver] Auto-saved project to file');
          }
        } else {
          // Web: always auto-save to localStorage snapshot
          this.saveToLocalStorage(projectData);
        }
      } catch (error) {
        console.error('[ProjectSaver] Auto-save failed:', error);
        // Don't show error notification for auto-save failures
      }
    }, intervalMs);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Add project to recent projects list
   */
  private addToRecentProjects(filePath: string, audioFileName?: string) {
    try {
      const recentProjects = this.getRecentProjects();
      
      // Remove if already exists
      const filtered = recentProjects.filter(p => p.filePath !== filePath);
      
      // Add to beginning
      const newProject: RecentProject = {
        filePath,
        fileName: filePath.split(/[/\\]/).pop() || 'project.tsproj',
        lastOpened: new Date().toISOString(),
        audioFileName,
      };
      
      const updated = [newProject, ...filtered].slice(0, MAX_RECENT_PROJECTS);
      
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[ProjectSaver] Failed to add to recent projects:', error);
    }
  }

  /**
   * Get recent projects list
   */
  getRecentProjects(): RecentProject[] {
    try {
      const data = localStorage.getItem(RECENT_PROJECTS_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data) as RecentProject[];
    } catch (error) {
      console.error('[ProjectSaver] Failed to get recent projects:', error);
      return [];
    }
  }

  /**
   * Remove project from recent projects
   */
  removeRecentProject(filePath: string) {
    try {
      const recentProjects = this.getRecentProjects();
      const filtered = recentProjects.filter(p => p.filePath !== filePath);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('[ProjectSaver] Failed to remove recent project:', error);
    }
  }

  /**
   * Clear all recent projects
   */
  clearRecentProjects() {
    try {
      localStorage.removeItem(RECENT_PROJECTS_KEY);
    } catch (error) {
      console.error('[ProjectSaver] Failed to clear recent projects:', error);
    }
  }

  // ============ Mobile PWA Save Methods ============

  /**
   * Current project ID for IndexedDB storage
   */
  private currentProjectId: string | null = null;

  /**
   * Save project to device storage (IndexedDB) - Mobile friendly
   * This saves the project locally without triggering a file download
   */
  async saveToDevice(projectName?: string): Promise<{ success: boolean; projectId?: string }> {
    try {
      const store = useAppStore.getState();
      
      // Check if audio is loaded
      if (!store.audio.file || !store.audio.isLoaded) {
        this.notify('Please load an audio file before saving.', 'error');
        return { success: false };
      }

      const projectData = await this.getProjectData();
      
      // Verify that audio was embedded
      if (!projectData.audioFileData) {
        this.notify('Failed to prepare project for saving.', 'error');
        return { success: false };
      }

      // Generate or use existing project ID
      const projectId = this.currentProjectId || `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const name = projectName || this.getCurrentProjectName() || 'Untitled Project';
      const now = new Date().toISOString();

      // Determine a color for the project thumbnail based on first marker or random
      const markers = store.markers;
      const thumbnailColor = markers.length > 0 ? markers[0].color : '#006644';

      const storedProject: StoredProject = {
        id: projectId,
        name,
        projectData,
        createdAt: this.currentProjectId ? (await getProjectFromIndexedDB(projectId))?.createdAt || now : now,
        updatedAt: now,
        audioFileName: projectData.audioFileName,
        thumbnailColor,
      };

      await saveProjectToIndexedDB(storedProject);
      
      // Update current project ID
      this.currentProjectId = projectId;
      
      // Mark as saved
      try {
        (useAppStore.getState() as any).setLastManualSaveAt?.(Date.now());
      } catch (_) {}

      // Also save to localStorage as backup
      this.saveToLocalStorage(projectData);

      // Update project name
      if (this.onProjectNameChange) {
        this.onProjectNameChange(name);
      }

      this.notify('Project saved to device!', 'success');
      return { success: true, projectId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project';
      console.error('[ProjectSaver] Save to device failed:', error);
      this.notify(`Save failed: ${errorMessage}`, 'error');
      return { success: false };
    }
  }

  /**
   * Export project as a downloadable file
   * For when users want to backup or share via other apps
   */
  async exportProject(suggestedName?: string): Promise<boolean> {
    try {
      const store = useAppStore.getState();
      
      if (!store.audio.file || !store.audio.isLoaded) {
        this.notify('Please load an audio file before exporting.', 'error');
        return false;
      }

      const projectData = await this.getProjectData();
      
      if (!projectData.audioFileData) {
        this.notify('Failed to prepare project for export.', 'error');
        return false;
      }

      const jsonData = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Use Web Share API if available (better on mobile)
      if (navigator.share && isMobileDevice()) {
        try {
          const fileName = suggestedName || `${this.getCurrentProjectName()}.tsproj`;
          const file = new File([blob], fileName, { type: 'application/json' });
          
          await navigator.share({
            title: 'Transcribe Pro Project',
            text: `Project: ${this.getCurrentProjectName()}`,
            files: [file],
          });
          
          this.notify('Project shared successfully!', 'success');
          return true;
        } catch (shareError) {
          // If share fails (user cancelled or not supported), fall back to download
          console.log('[ProjectSaver] Share failed, falling back to download:', shareError);
        }
      }
      
      // Fallback: Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName || `${this.getCurrentProjectName()}.tsproj`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.notify('Project exported! Check your Downloads folder.', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export project';
      this.notify(`Export failed: ${errorMessage}`, 'error');
      return false;
    }
  }

  /**
   * Get all projects stored in IndexedDB
   */
  async getStoredProjects(): Promise<StoredProject[]> {
    return getAllProjectsFromIndexedDB();
  }

  /**
   * Load a project from IndexedDB by ID
   */
  async loadStoredProject(projectId: string): Promise<StoredProject | null> {
    const project = await getProjectFromIndexedDB(projectId);
    if (project) {
      this.currentProjectId = projectId;
    }
    return project;
  }

  /**
   * Delete a project from IndexedDB
   */
  async deleteStoredProject(projectId: string): Promise<boolean> {
    try {
      await deleteProjectFromIndexedDB(projectId);
      this.notify('Project deleted', 'success');
      return true;
    } catch (error) {
      this.notify('Failed to delete project', 'error');
      return false;
    }
  }

  /**
   * Set current project ID (for tracking which project is open)
   */
  setCurrentProjectId(id: string | null) {
    this.currentProjectId = id;
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Check if running on mobile device
   */
  isMobile(): boolean {
    return isMobileDevice();
  }

  // ============ End Mobile PWA Save Methods ============

  /**
   * Cleanup - stop auto-save
   */
  dispose() {
    this.stopAutoSave();
  }
}

// Export singleton instance
let projectSaverInstance: ProjectSaver | null = null;

/**
 * Get or create the ProjectSaver singleton instance
 */
export function getProjectSaver(
  onNotification?: (message: string, type: 'success' | 'error') => void,
  onProjectNameChange?: (name: string) => void
): ProjectSaver {
  if (!projectSaverInstance) {
    projectSaverInstance = new ProjectSaver(onNotification, onProjectNameChange);
  } else {
    // Update callbacks if instance already exists
    if (onNotification) {
      (projectSaverInstance as any).onNotification = onNotification;
    }
    if (onProjectNameChange) {
      (projectSaverInstance as any).onProjectNameChange = onProjectNameChange;
    }
  }
  return projectSaverInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetProjectSaver() {
  if (projectSaverInstance) {
    projectSaverInstance.dispose();
    projectSaverInstance = null;
  }
}
