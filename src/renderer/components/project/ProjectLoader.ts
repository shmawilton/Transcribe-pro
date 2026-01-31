// ProjectLoader.ts - Julius - Week 3
// Project loading logic with comprehensive error handling

import { useAppStore } from '../../store/store';
import { ProjectData, Marker, GlobalControls, RecentProject } from '../../types/types';
import { pickAudioFile, validateAudioFile } from '../audio/audioFilePicker';

const PROJECT_VERSION = '1.0.0';
const RECENT_PROJECTS_KEY = 'transcribe-pro-recent-projects';
const WEB_AUTOSAVE_KEY = 'transcribe-pro-web-autosave';

// Detect Electron environment
const isElectron = !!(window as any).electronAPI || 
                   (typeof process !== 'undefined' && (process as any).versions && (process as any).versions.electron);

export interface LoadProjectResult {
  success: boolean;
  error?: string;
  projectData?: ProjectData;
}

export class ProjectLoader {
  private onNotification?: (message: string, type: 'success' | 'error') => void;
  private onProjectNameChange?: (name: string) => void;
  private onProjectPathChange?: (filePath: string | null) => void;

  constructor(
    onNotification?: (message: string, type: 'success' | 'error') => void,
    onProjectNameChange?: (name: string) => void,
    onProjectPathChange?: (filePath: string | null) => void
  ) {
    this.onNotification = onNotification;
    this.onProjectNameChange = onProjectNameChange;
    this.onProjectPathChange = onProjectPathChange;
  }

  /**
   * Show a notification message
   */
  private notify(message: string, type: 'success' | 'error' = 'success') {
    if (this.onNotification) {
      this.onNotification(message, type);
    } else {
      console.log(`[ProjectLoader] ${type.toUpperCase()}: ${message}`);
      if (type === 'error') {
        alert(`Error: ${message}`);
      }
    }
  }

  /**
   * Validate project data structure
   */
  private validateProjectData(data: any): { valid: boolean; error?: string; projectData?: ProjectData } {
    try {
      // Check if data is an object
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid project file: Not a valid JSON object' };
      }

      // Check version
      if (!data.version || typeof data.version !== 'string') {
        return { valid: false, error: 'Invalid project file: Missing or invalid version field' };
      }

      // Check if version is compatible (for now, accept 1.0.0)
      if (data.version !== PROJECT_VERSION) {
        console.warn(`[ProjectLoader] Project version ${data.version} may not be fully compatible with current version ${PROJECT_VERSION}`);
      }

      // Check required fields
      if (!data.metadata || typeof data.metadata !== 'object') {
        return { valid: false, error: 'Invalid project file: Missing metadata' };
      }

      if (!data.markers || !Array.isArray(data.markers)) {
        return { valid: false, error: 'Invalid project file: Markers must be an array' };
      }

      if (!data.globalControls || typeof data.globalControls !== 'object') {
        return { valid: false, error: 'Invalid project file: Missing global controls' };
      }

      // Validate markers
      const validatedMarkers: Marker[] = [];
      for (let i = 0; i < data.markers.length; i++) {
        const marker = data.markers[i];
        if (!marker || typeof marker !== 'object') {
          console.warn(`[ProjectLoader] Skipping invalid marker at index ${i}`);
          continue;
        }

        // Validate required marker fields
        if (typeof marker.id !== 'string' || !marker.id) {
          console.warn(`[ProjectLoader] Marker at index ${i} missing id, generating one`);
          marker.id = `marker-${Date.now()}-${i}`;
        }

        if (typeof marker.start !== 'number' || isNaN(marker.start) || marker.start < 0) {
          console.warn(`[ProjectLoader] Marker ${marker.id} has invalid start time, skipping`);
          continue;
        }

        if (typeof marker.end !== 'number' || isNaN(marker.end) || marker.end < 0) {
          console.warn(`[ProjectLoader] Marker ${marker.id} has invalid end time, skipping`);
          continue;
        }

        if (marker.end <= marker.start) {
          console.warn(`[ProjectLoader] Marker ${marker.id} has end time <= start time, fixing`);
          marker.end = marker.start + 0.1; // Minimum 0.1 second duration
        }

        if (typeof marker.name !== 'string') {
          console.warn(`[ProjectLoader] Marker ${marker.id} missing name, using default`);
          marker.name = `Marker ${i + 1}`;
        }

        // Validate optional fields
        if (marker.speed !== undefined && (typeof marker.speed !== 'number' || marker.speed < 0.25 || marker.speed > 4.0)) {
          console.warn(`[ProjectLoader] Marker ${marker.id} has invalid speed, resetting to 1.0`);
          marker.speed = 1.0;
        }

        if (marker.loop !== undefined && typeof marker.loop !== 'boolean') {
          marker.loop = false;
        }

        validatedMarkers.push(marker as Marker);
      }

      // Validate global controls
      const controls = data.globalControls || {};
      const validatedControls: GlobalControls = {
        pitch: typeof controls.pitch === 'number' && !isNaN(controls.pitch) 
          ? Math.max(-2, Math.min(2, controls.pitch)) 
          : 0,
        volume: typeof controls.volume === 'number' && !isNaN(controls.volume)
          ? Math.max(-60, Math.min(6, controls.volume))
          : 6,
        playbackRate: typeof controls.playbackRate === 'number' && !isNaN(controls.playbackRate)
          ? Math.max(0.5, Math.min(2.0, controls.playbackRate))
          : 1.0,
        isMuted: typeof controls.isMuted === 'boolean' ? controls.isMuted : false,
        previousVolume: typeof controls.previousVolume === 'number' && !isNaN(controls.previousVolume)
          ? Math.max(-60, Math.min(6, controls.previousVolume))
          : 6,
      };

      // Validate UI state (optional)
      let validatedUIState = undefined;
      if (data.uiState && typeof data.uiState === 'object') {
        validatedUIState = {
          zoomLevel: typeof data.uiState.zoomLevel === 'number' && !isNaN(data.uiState.zoomLevel) && data.uiState.zoomLevel > 0
            ? Math.max(1, Math.min(8, data.uiState.zoomLevel))
            : 1,
          viewportStart: typeof data.uiState.viewportStart === 'number' && !isNaN(data.uiState.viewportStart) && data.uiState.viewportStart >= 0
            ? data.uiState.viewportStart
            : 0,
          viewportEnd: typeof data.uiState.viewportEnd === 'number' && !isNaN(data.uiState.viewportEnd) && data.uiState.viewportEnd > 0
            ? data.uiState.viewportEnd
            : 0,
        };
      }

      // Build validated project data
      const projectData: ProjectData = {
        version: data.version,
        audioFilePath: typeof data.audioFilePath === 'string' ? data.audioFilePath : undefined,
        audioFileName: typeof data.audioFileName === 'string' ? data.audioFileName : undefined,
        // Preserve embedded audio data (new format)
        audioFileData: typeof data.audioFileData === 'string' && data.audioFileData.length > 0 
          ? data.audioFileData 
          : undefined,
        audioFileMimeType: typeof data.audioFileMimeType === 'string' && data.audioFileMimeType.length > 0
          ? data.audioFileMimeType
          : undefined,
        markers: validatedMarkers,
        globalControls: validatedControls,
        uiState: validatedUIState,
        metadata: {
          createdAt: typeof data.metadata.createdAt === 'string' ? data.metadata.createdAt : new Date().toISOString(),
          updatedAt: typeof data.metadata.updatedAt === 'string' ? data.metadata.updatedAt : new Date().toISOString(),
          version: typeof data.metadata.version === 'string' ? data.metadata.version : '1.0.0',
        },
      };
      
      // Log what format we detected
      if (projectData.audioFileData) {
        console.log('[ProjectLoader] Project has embedded audio (new format)');
      } else {
        console.log('[ProjectLoader] Project uses legacy format (no embedded audio)');
      }

      return { valid: true, projectData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      return { valid: false, error: `Validation error: ${errorMessage}` };
    }
  }

  /**
   * Load an auto-saved project snapshot from localStorage (web only).
   * Returns false if none exists or if invalid.
   */
  async loadAutoSavedProject(loadFileCallback?: (file: File) => Promise<void>): Promise<boolean> {
    if (isElectron) return false;
    try {
      const raw = localStorage.getItem(WEB_AUTOSAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const validation = this.validateProjectData(parsed);
      if (!validation.valid || !validation.projectData) return false;
      return await this.applyProjectData(validation.projectData, loadFileCallback, { silent: true, filePath: 'web-autosave' });
    } catch (e) {
      console.warn('[ProjectLoader] Failed to load auto-saved project:', e);
      return false;
    }
  }

  /**
   * Apply already-parsed ProjectData into the app (shared by loadProject + autosave restore).
   */
  private async applyProjectData(
    projectData: ProjectData,
    loadFileCallback?: (file: File) => Promise<void>,
    opts?: { silent?: boolean; filePath?: string }
  ): Promise<boolean> {
    // Load audio file (from embedded data or prompt user)
    const audioFile = await this.loadAudioFile(projectData);
    if (!audioFile) {
      if (!opts?.silent) this.notify('Audio file is required to load the project', 'error');
      return false;
    }

    const store = useAppStore.getState();

    // Load audio using provided callback (preferred)
    if (loadFileCallback) {
      try {
        await loadFileCallback(audioFile);
      } catch (audioError) {
        const errorMessage = audioError instanceof Error ? audioError.message : 'Failed to load audio file';
        if (!opts?.silent) this.notify(`Failed to load audio: ${errorMessage}`, 'error');
        return false;
      }
    } else {
      store.setAudioFile(audioFile);
    }

    // Wait a bit for audio file to be set
    await new Promise(resolve => setTimeout(resolve, 100));

    // Apply markers only - reset all other settings to defaults
    store.setMarkers(projectData.markers);

    // Reset global controls to defaults (don't restore saved values)
    store.setPitch(0); // Default pitch
    store.setVolume(6); // Default volume (+6 dB)
    store.setPlaybackRate(1); // Default speed (1.0x)
    if (store.globalControls.isMuted) {
      store.toggleMute(); // Unmute if muted
    }

    // Reset UI state to defaults - show 20% (1/5) of audio initially
    const DEFAULT_ZOOM = 5;
    store.setZoomLevel(DEFAULT_ZOOM);

    // Poll for audio load completion then reset viewport to 20% view
    let attempts = 0;
    const maxAttempts = 100;
    const checkAudioLoaded = setInterval(() => {
      attempts++;
      const audioStore = useAppStore.getState();
      if (audioStore.audio.isLoaded && audioStore.audio.duration > 0) {
        clearInterval(checkAudioLoaded);
        // Reset viewport to show first 20% of audio (zoom level 5)
        const duration = audioStore.audio.duration;
        audioStore.setViewport(0, duration / DEFAULT_ZOOM);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkAudioLoaded);
      }
    }, 100);

    if (!opts?.silent) this.notify('Project loaded successfully!', 'success');
    return true;
  }

  /**
   * Load project file from path (Electron) or dialog
   */
  private async loadProjectFile(): Promise<{ canceled: boolean; filePath?: string; projectData?: ProjectData }> {
    try {
      if (isElectron && (window as any).electronAPI) {
        // Use Electron file dialog
        const result = await (window as any).electronAPI.loadProjectDialog();
        if (result.canceled || !result.projectData) {
          return { canceled: true };
        }

        // Parse JSON
        let parsedData: any;
        try {
          parsedData = JSON.parse(result.projectData);
        } catch (parseError) {
          throw new Error('Invalid JSON format in project file');
        }

        // Validate project data
        const validation = this.validateProjectData(parsedData);
        if (!validation.valid || !validation.projectData) {
          throw new Error(validation.error || 'Project validation failed');
        }

        return {
          canceled: false,
          filePath: result.filePath,
          projectData: validation.projectData,
        };
      } else {
        // Browser: use file input
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.tsproj,application/json';
          input.style.display = 'none';

          // Safe cleanup function that checks if element is still in DOM
          const safeCleanup = () => {
            console.log('[ProjectLoader] safeCleanup called');
            try {
              console.log('[ProjectLoader] Checking if input is in DOM...', {
                parentNode: input.parentNode,
                isBody: input.parentNode === document.body,
                bodyChildren: document.body.children.length
              });
              // Check if input is still a child of body before removing
              if (input.parentNode === document.body) {
                console.log('[ProjectLoader] Removing input from DOM');
                document.body.removeChild(input);
                console.log('[ProjectLoader] Input removed successfully');
              } else {
                console.log('[ProjectLoader] Input not in body, skipping removal', {
                  parentNode: input.parentNode,
                  parentNodeType: input.parentNode?.nodeName
                });
              }
            } catch (error) {
              // Element might have already been removed, ignore error
              console.error('[ProjectLoader] Cleanup error:', error);
              console.error('[ProjectLoader] Error details:', {
                errorName: error instanceof Error ? error.name : 'Unknown',
                errorMessage: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                inputParent: input.parentNode,
                inputInBody: input.parentNode === document.body
              });
            }
          };

          let resolved = false;
          console.log('[ProjectLoader] Setting up file input for project file selection');
          
          // Safety timeout: only fires if user cancels and onchange never fires (5 minutes)
          const safetyTimeout = setTimeout(() => {
            console.log('[ProjectLoader] Safety timeout fired (user likely cancelled)');
            if (!resolved) {
              console.log('[ProjectLoader] Resolving with canceled (timeout)');
              safeCleanup();
              resolved = true;
              resolve({ canceled: true });
            }
          }, 5 * 60 * 1000); // 5 minutes

          input.onchange = async (event) => {
            console.log('[ProjectLoader] onchange event fired');
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            console.log('[ProjectLoader] File selected:', file ? { name: file.name, size: file.size } : 'null');
            
            console.log('[ProjectLoader] Clearing safety timeout');
            clearTimeout(safetyTimeout);
            
            // Clean up safely after a small delay to avoid React render conflicts
            setTimeout(() => {
              console.log('[ProjectLoader] Executing cleanup in setTimeout');
              safeCleanup();
            }, 0);

            if (!file) {
              if (!resolved) {
                console.log('[ProjectLoader] No file selected, resolving with canceled');
                resolved = true;
                resolve({ canceled: true });
              } else {
                console.log('[ProjectLoader] Already resolved, ignoring');
              }
              return;
            }

            try {
              // Read file
              const text = await file.text();
              
              // Parse JSON
              let parsedData: any;
              try {
                parsedData = JSON.parse(text);
              } catch (parseError) {
                throw new Error('Invalid JSON format in project file');
              }

              // Validate project data
              const validation = this.validateProjectData(parsedData);
              if (!validation.valid || !validation.projectData) {
                throw new Error(validation.error || 'Project validation failed');
              }

              if (!resolved) {
                console.log('[ProjectLoader] Resolving with project data:', {
                  filePath: file.name,
                  hasProjectData: !!validation.projectData
                });
                resolved = true;
                resolve({
                  canceled: false,
                  filePath: file.name,
                  projectData: validation.projectData,
                });
              } else {
                console.log('[ProjectLoader] Already resolved, ignoring result');
              }
            } catch (error) {
              console.error('[ProjectLoader] Error loading project file:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to load project file';
              this.notify(errorMessage, 'error');
              if (!resolved) {
                console.log('[ProjectLoader] Resolving with canceled due to error');
                resolved = true;
                resolve({ canceled: true });
              }
            }
          };

          // Note: We don't handle oncancel explicitly because it's not reliably supported
          // The safety timeout (5 minutes) will handle cancellation cases

          console.log('[ProjectLoader] Appending input to body and triggering click');
          document.body.appendChild(input);
          console.log('[ProjectLoader] Input appended, body children count:', document.body.children.length);
          input.click();
          console.log('[ProjectLoader] Click triggered, waiting for user selection...');
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project file';
      this.notify(errorMessage, 'error');
      return { canceled: true };
    }
  }

  /**
   * Convert base64 to File object
   */
  private base64ToFile(base64Data: string, mimeType: string, fileName: string): File {
    // Convert base64 to binary
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
  }

  /**
   * Load audio file from embedded data or prompt user
   */
  private async loadAudioFile(
    projectData: ProjectData
  ): Promise<File | null> {
    try {
      // First, try to load from embedded audio data (new format with embedded audio)
      if (projectData.audioFileData && projectData.audioFileMimeType && projectData.audioFileName) {
        try {
          console.log('[ProjectLoader] Attempting to load embedded audio:', {
            fileName: projectData.audioFileName,
            mimeType: projectData.audioFileMimeType,
            dataLength: projectData.audioFileData.length
          });
          
          const file = this.base64ToFile(
            projectData.audioFileData,
            projectData.audioFileMimeType,
            projectData.audioFileName
          );
          
          console.log('[ProjectLoader] Successfully loaded audio from embedded data:', {
            name: file.name,
            size: file.size,
            type: file.type
          });
          
          // Validate the reconstructed file
          const validation = validateAudioFile(file);
          if (!validation.valid) {
            throw new Error(validation.error || 'Invalid embedded audio file');
          }
          
          return file;
        } catch (error) {
          console.error('[ProjectLoader] Failed to load embedded audio:', error);
          // If embedded audio fails, we need to fall back to file selection
          // But this should be rare - log it as an error
          const errorMessage = error instanceof Error ? error.message : 'Failed to decode embedded audio';
          this.notify(`Failed to load embedded audio: ${errorMessage}. Please select the audio file.`, 'error');
        }
      } else {
        // No embedded audio - this is an old project format
        console.log('[ProjectLoader] No embedded audio found - using legacy format (file path/name only)');
      }

      // Fallback: Prompt user to select audio file (for backward compatibility with old projects)
      // Only show this if we don't have embedded audio
      if (!projectData.audioFileData) {
        console.warn('[ProjectLoader] Project does not have embedded audio - this is a legacy format project');
        
        if (projectData.audioFileName) {
          // Use a less alarming message for old projects
          const proceed = confirm(
            `This project was saved in an older format and doesn't include the audio file.\n\n` +
            `Expected audio file: ${projectData.audioFileName}\n\n` +
            `Please select the audio file to continue loading the project.\n\n` +
            `Note: Save this project again to include the audio file in the project.`
          );
          if (!proceed) {
            return null;
          }
        } else {
          const proceed = confirm(
            `This project doesn't include the audio file.\n\n` +
            `Please select the audio file to continue loading the project.\n\n` +
            `Note: Save this project again to include the audio file in the project.`
          );
          if (!proceed) {
            return null;
          }
        }
      }

      const file = await pickAudioFile();
      if (!file) {
        return null;
      }

      // Validate file
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        this.notify(validation.error || 'Invalid audio file', 'error');
        return null;
      }

      // Check if filename matches (optional validation)
      if (projectData.audioFileName && file.name !== projectData.audioFileName) {
        const proceed = confirm(
          `The audio file name doesn't match the project.\n` +
          `Expected: ${projectData.audioFileName}\n` +
          `Selected: ${file.name}\n\n` +
          `Do you want to continue anyway?`
        );
        if (!proceed) {
          return null;
        }
      }

      return file;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audio file';
      this.notify(errorMessage, 'error');
      return null;
    }
  }

  /**
   * Load project - main entry point
   * @param loadFileCallback - Function to load audio file (from useAudioEngine hook)
   */
  async loadProject(loadFileCallback?: (file: File) => Promise<void>): Promise<boolean> {
    try {
      // Load project file
      const fileResult = await this.loadProjectFile();
      if (fileResult.canceled || !fileResult.projectData) {
        return false;
      }

      const projectData = fileResult.projectData;
      // Apply to app
      const applied = await this.applyProjectData(projectData, loadFileCallback, { silent: false, filePath: fileResult.filePath });
      if (!applied) return false;

      // Update project name and path
      if (fileResult.filePath) {
        if (this.onProjectNameChange) {
          const fileName = fileResult.filePath.split(/[/\\]/).pop() || 'project.tsproj';
          const projectName = fileName.replace(/\.tsproj$/, '');
          this.onProjectNameChange(projectName);
        }
        
        // Notify about project path change (for ProjectSaver)
        if (this.onProjectPathChange) {
          this.onProjectPathChange(fileResult.filePath);
        }
      }

      // Add to recent projects
      if (fileResult.filePath) {
        this.addToRecentProjects(
          fileResult.filePath,
          projectData.audioFileName || 'Project'
        );
      }

      // Wait for audio to load, then apply viewport
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project';
      this.notify(`Failed to load project: ${errorMessage}`, 'error');
      return false;
    }
  }

  /**
   * Load project from file path (for recent projects)
   * @param filePath - Path to project file
   * @param loadFileCallback - Function to load audio file (from useAudioEngine hook)
   */
  async loadProjectFromPath(filePath: string, loadFileCallback?: (file: File) => Promise<void>): Promise<boolean> {
    try {
      let projectData: ProjectData;

      if (isElectron && (window as any).electronAPI) {
        // Read file directly from path in Electron
        const result = await (window as any).electronAPI.loadProjectFromPath(filePath);
        if (!result.success || !result.projectData) {
          throw new Error('Failed to load project file');
        }

        // Parse and validate
        let parsedData: any;
        try {
          parsedData = JSON.parse(result.projectData);
        } catch (parseError) {
          throw new Error('Invalid JSON format in project file');
        }

        const validation = this.validateProjectData(parsedData);
        if (!validation.valid || !validation.projectData) {
          throw new Error(validation.error || 'Project validation failed');
        }

        projectData = validation.projectData;
      } else {
        // Browser: can't load from path directly
        this.notify('Loading from path is not supported in browser. Please use Load Project.', 'error');
        return false;
      }

      // Continue with loading (same as loadProject)
      const audioFile = await this.loadAudioFile(projectData);

      if (!audioFile) {
        return false;
      }

      // Load audio using the provided callback (from useAudioEngine)
      if (loadFileCallback) {
        try {
          await loadFileCallback(audioFile);
        } catch (audioError) {
          const errorMessage = audioError instanceof Error ? audioError.message : 'Failed to load audio file';
          this.notify(`Failed to load audio: ${errorMessage}`, 'error');
          return false;
        }
      } else {
        // Fallback: set audio file in store
        const store = useAppStore.getState();
        store.setAudioFile(audioFile);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Apply markers only - reset all other settings to defaults
      const store = useAppStore.getState();
      store.setMarkers(projectData.markers);
      
      // Reset global controls to defaults
      store.setPitch(0); // Default pitch
      store.setVolume(6); // Default volume (+6 dB)
      store.setPlaybackRate(1); // Default speed (1.0x)
      if (store.globalControls.isMuted) {
        store.toggleMute(); // Unmute if muted
      }

      // Reset UI state to defaults - show 20% (1/5) of audio initially
      const DEFAULT_ZOOM_2 = 5;
      store.setZoomLevel(DEFAULT_ZOOM_2);
      
      // Poll for audio load completion then reset viewport to 20% view
      let attempts = 0;
      const maxAttempts = 100;
      const checkAudioLoaded = setInterval(() => {
        attempts++;
        const audioStore = useAppStore.getState();
        if (audioStore.audio.isLoaded && audioStore.audio.duration > 0) {
          clearInterval(checkAudioLoaded);
          // Reset viewport to show first 20% of audio (zoom level 5)
          const duration = audioStore.audio.duration;
          audioStore.setViewport(0, duration / DEFAULT_ZOOM_2);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkAudioLoaded);
          console.warn('[ProjectLoader] Audio did not load within timeout, viewport may not be restored');
        }
      }, 100);

      // Update project name
      if (this.onProjectNameChange) {
        const fileName = filePath.split(/[/\\]/).pop() || 'project.tsproj';
        const projectName = fileName.replace(/\.tsproj$/, '');
        this.onProjectNameChange(projectName);
      }

      this.notify('Project loaded successfully!', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project';
      this.notify(`Failed to load project: ${errorMessage}`, 'error');
      return false;
    }
  }

  /**
   * Add project to recent projects list
   */
  private addToRecentProjects(filePath: string, audioFileName?: string) {
    try {
      const data = localStorage.getItem(RECENT_PROJECTS_KEY);
      const recentProjects: RecentProject[] = data ? JSON.parse(data) : [];
      
      // Remove if already exists
      const filtered = recentProjects.filter(p => p.filePath !== filePath);
      
      // Add to beginning
      const newProject: RecentProject = {
        filePath,
        fileName: filePath.split(/[/\\]/).pop() || 'project.tsproj',
        lastOpened: new Date().toISOString(),
        audioFileName,
      };
      
      const updated = [newProject, ...filtered].slice(0, 10);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[ProjectLoader] Failed to add to recent projects:', error);
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
      console.error('[ProjectLoader] Failed to get recent projects:', error);
      return [];
    }
  }

  /**
   * Load a project from IndexedDB storage (for mobile PWA)
   * @param projectData - The project data from IndexedDB
   * @param loadFileCallback - Function to load audio file
   */
  async loadFromStoredProject(
    projectData: ProjectData,
    loadFileCallback?: (file: File) => Promise<void>
  ): Promise<boolean> {
    try {
      // Validate the project data
      const validation = this.validateProjectData(projectData);
      if (!validation.valid || !validation.projectData) {
        this.notify(validation.error || 'Invalid project data', 'error');
        return false;
      }

      // Apply the project data
      const success = await this.applyProjectData(
        validation.projectData,
        loadFileCallback,
        { silent: false, filePath: 'indexeddb-storage' }
      );

      if (success) {
        this.notify('Project loaded from device storage!', 'success');
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project';
      console.error('[ProjectLoader] Load from stored project failed:', error);
      this.notify(`Load failed: ${errorMessage}`, 'error');
      return false;
    }
  }
}

// Export singleton instance
let projectLoaderInstance: ProjectLoader | null = null;/**
 * Get or create the ProjectLoader singleton instance
 */
export function getProjectLoader(
  onNotification?: (message: string, type: 'success' | 'error') => void,
  onProjectNameChange?: (name: string) => void,
  onProjectPathChange?: (filePath: string | null) => void
): ProjectLoader {
  if (!projectLoaderInstance) {
    projectLoaderInstance = new ProjectLoader(onNotification, onProjectNameChange, onProjectPathChange);
  } else {
    // Update callbacks if instance already exists
    if (onNotification) {
      (projectLoaderInstance as any).onNotification = onNotification;
    }
    if (onProjectNameChange) {
      (projectLoaderInstance as any).onProjectNameChange = onProjectNameChange;
    }
    if (onProjectPathChange) {
      (projectLoaderInstance as any).onProjectPathChange = onProjectPathChange;
    }
  }
  return projectLoaderInstance;
}/**
 * Reset the singleton (useful for testing)
 */
export function resetProjectLoader() {
  projectLoaderInstance = null;
}
