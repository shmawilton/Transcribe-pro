import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';

// Get FFmpeg path - works with ffmpeg-static
let ffmpegPath: string;
try {
  // ffmpeg-static provides the path to the bundled ffmpeg binary
  ffmpegPath = require('ffmpeg-static');
  console.log('[Main] FFmpeg path:', ffmpegPath);
} catch (e) {
  console.error('[Main] ffmpeg-static not found, falling back to system ffmpeg');
  ffmpegPath = 'ffmpeg';
}

let mainWindow: BrowserWindow | null = null;

// Enable audio features for Electron
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');

// Additional flags to help with audio decoding stability
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

// Increase memory limits for audio processing
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // Hide the native menu bar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable Web Audio API and other media features
      webSecurity: true,
      allowRunningInsecureContent: false,
      // These help with audio in Electron
      backgroundThrottling: false, // Prevent audio issues when window is in background
    },
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // In development, load from Vite dev server
    const devUrl = 'http://localhost:3000';
    console.log('Loading dev server at:', devUrl);
    
    // Wait a bit for dev server to be ready, then load
    setTimeout(() => {
      mainWindow?.loadURL(devUrl).then(() => {
        console.log('Successfully loaded dev server');
      }).catch((err) => {
        console.error('Failed to load dev server:', err);
        console.log('Retrying in 1 second...');
        setTimeout(() => {
          mainWindow?.loadURL(devUrl).catch((retryErr) => {
            console.error('Retry failed:', retryErr);
          });
        }, 1000);
      });
    }, 500);
    
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from file
    const filePath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading production file:', filePath);
    mainWindow.loadFile(filePath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

/**
 * Apply time-stretching to audio file using native FFmpeg
 * Changes speed without changing pitch using atempo filter
 * @param inputPath - Path to the input audio file
 * @param speed - Speed multiplier (0.25 to 4.0)
 * @returns Promise<string> - Path to the time-stretched output file
 */
async function applyTimeStretchFile(inputPath: string, speed: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `speed_output_${Date.now()}_${speed.toFixed(2)}.mp3`);

    // Clamp speed to valid range
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

    // Build atempo filter chain (atempo only accepts 0.5-2.0)
    let atempoFilters: string[] = [];
    let remainingSpeed = clampedSpeed;
    
    while (remainingSpeed < 0.5 || remainingSpeed > 2.0) {
      if (remainingSpeed < 0.5) {
        atempoFilters.push('atempo=0.5');
        remainingSpeed = remainingSpeed / 0.5;
      } else if (remainingSpeed > 2.0) {
        atempoFilters.push('atempo=2.0');
        remainingSpeed = remainingSpeed / 2.0;
      }
    }
    
    // Add final atempo filter with remaining speed
    atempoFilters.push(`atempo=${remainingSpeed.toFixed(6)}`);
    
    const filterComplex = atempoFilters.join(',');

    console.log('[Main] FFmpeg time-stretch:', clampedSpeed, 'x speed, filters:', filterComplex);

    // Run FFmpeg directly on file paths - FAST!
    const ffmpeg = spawn(ffmpegPath, [
      '-i', inputPath,
      '-af', filterComplex,
      '-ar', '44100',
      '-y',
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        try { fs.unlinkSync(outputPath); } catch (e) {}
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      try { fs.unlinkSync(outputPath); } catch (e) {}
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * Apply pitch shift to audio file using native FFmpeg
 * Works directly with file paths - no buffer transfer needed!
 * @param inputPath - Path to the input audio file
 * @param semitones - Pitch shift in semitones (-2 to +2)
 * @returns Promise<string> - Path to the pitch-shifted output file
 */
async function applyPitchShiftFile(inputPath: string, semitones: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `pitch_output_${Date.now()}_${semitones}.mp3`);

    // Calculate pitch shift parameters
    const pitchFactor = Math.pow(2, semitones / 12);
    const sampleRate = 44100;
    const newRate = Math.round(sampleRate * pitchFactor);
    const tempoFactor = 1 / pitchFactor;

    // Build atempo filter chain (atempo only accepts 0.5-2.0)
    let atempoFilters: string[] = [];
    let tempo = tempoFactor;
    while (tempo < 0.5 || tempo > 2.0) {
      if (tempo < 0.5) {
        atempoFilters.push('atempo=0.5');
        tempo = tempo / 0.5;
      } else if (tempo > 2.0) {
        atempoFilters.push('atempo=2.0');
        tempo = tempo / 2.0;
      }
    }
    atempoFilters.push(`atempo=${tempo.toFixed(6)}`);

    const filterComplex = `asetrate=${newRate},${atempoFilters.join(',')},aresample=${sampleRate}`;

    console.log('[Main] FFmpeg pitch shift:', semitones, 'semitones');

    // Run FFmpeg directly on file paths - FAST!
    const ffmpeg = spawn(ffmpegPath, [
      '-i', inputPath,
      '-af', filterComplex,
      '-ar', '44100',
      '-y',
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        try { fs.unlinkSync(outputPath); } catch (e) {}
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      try { fs.unlinkSync(outputPath); } catch (e) {}
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

// Register custom protocol for serving local audio files
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'audio-file', 
    privileges: { 
      standard: true, 
      secure: true, 
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    } 
  }
]);

app.whenReady().then(() => {
  // Register protocol handler for audio files
  protocol.handle('audio-file', (request) => {
    // URL format: audio-file:///C:/path/to/file.mp3 (note triple slash)
    let filePath = decodeURIComponent(request.url.replace('audio-file:///', ''));
    // Handle Windows paths
    if (process.platform === 'win32' && !filePath.includes(':')) {
      // If colon is missing, it might be parsed incorrectly
      filePath = filePath.replace(/^([a-zA-Z])\//, '$1:/');
    }
    console.log('[Main] Serving audio file:', filePath);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  // IPC handlers for window controls
  ipcMain.on('close-window', () => {
    mainWindow?.close();
  });
  
  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
  });
  
  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  // IPC handler for pitch shifting - FILE PATH based (fast, no data transfer)
  ipcMain.handle('pitch-shift-file', async (_event, inputFilePath: string, semitones: number) => {
    try {
      console.log('[Main] Pitch shift request:', semitones, 'semitones, file:', inputFilePath);
      
      if (semitones === 0) {
        return inputFilePath; // No change needed
      }

      const outputPath = await applyPitchShiftFile(inputFilePath, semitones);
      console.log('[Main] Pitch shift complete:', outputPath);
      return outputPath;
    } catch (error) {
      console.error('[Main] Pitch shift error:', error);
      throw error;
    }
  });

  // IPC handler for time-stretching - FILE PATH based (fast, no data transfer)
  ipcMain.handle('time-stretch-file', async (_event, inputFilePath: string, speed: number) => {
    try {
      console.log('[Main] Time-stretch request:', speed, 'x speed, file:', inputFilePath);
      
      if (speed === 1.0) {
        return inputFilePath; // No change needed
      }

      const outputPath = await applyTimeStretchFile(inputFilePath, speed);
      console.log('[Main] Time-stretch complete:', outputPath);
      return outputPath;
    } catch (error) {
      console.error('[Main] Time-stretch error:', error);
      throw error;
    }
  });

  // IPC handler to save audio data to temp file (only called once per file load)
  ipcMain.handle('save-temp-audio', async (_event, audioData: number[], fileName: string) => {
    try {
      const tempDir = os.tmpdir();
      const ext = path.extname(fileName) || '.mp3';
      const tempPath = path.join(tempDir, `transcribe_original_${Date.now()}${ext}`);
      
      fs.writeFileSync(tempPath, Buffer.from(audioData));
      console.log('[Main] Saved temp audio:', tempPath, 'size:', audioData.length);
      
      return tempPath;
    } catch (error) {
      console.error('[Main] Save temp audio error:', error);
      throw error;
    }
  });

  // IPC handler to read processed file back
  ipcMain.handle('read-audio-file', async (_event, filePath: string) => {
    try {
      const data = fs.readFileSync(filePath);
      return Array.from(data);
    } catch (error) {
      console.error('[Main] Read audio file error:', error);
      throw error;
    }
  });

  // Cleanup temp files
  ipcMain.handle('cleanup-temp-file', async (_event, filePath: string) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // Check if FFmpeg is available
  ipcMain.handle('check-ffmpeg', async () => {
    return new Promise((resolve) => {
      const ffmpeg = spawn(ffmpegPath, ['-version']);
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });
      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  });

  // IPC handler for saving project file (with dialog)
  ipcMain.handle('save-project-dialog', async (_event, projectData: string) => {
    try {
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Project',
        defaultPath: 'project.tsproj',
        filters: [
          { name: 'Transcribe Pro Project', extensions: ['tsproj'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['createDirectory'],
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }

      // Ensure .tsproj extension
      let filePath = result.filePath;
      if (!filePath.endsWith('.tsproj')) {
        filePath += '.tsproj';
      }

      // Write project data to file
      fs.writeFileSync(filePath, projectData, 'utf-8');
      console.log('[Main] Project saved to:', filePath);

      return { canceled: false, filePath };
    } catch (error) {
      console.error('[Main] Save project error:', error);
      throw error;
    }
  });

  // IPC handler for saving project file directly (no dialog, for auto-save)
  ipcMain.handle('save-project-direct', async (_event, projectData: string, filePath: string) => {
    try {
      // Ensure .tsproj extension
      let finalPath = filePath;
      if (!finalPath.endsWith('.tsproj')) {
        finalPath += '.tsproj';
      }

      // Write project data to file
      fs.writeFileSync(finalPath, projectData, 'utf-8');
      console.log('[Main] Project auto-saved to:', finalPath);

      return { success: true, filePath: finalPath };
    } catch (error) {
      console.error('[Main] Direct save project error:', error);
      throw error;
    }
  });

  // IPC handler for loading project file
  ipcMain.handle('load-project-dialog', async () => {
    try {
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Load Project',
        filters: [
          { name: 'Transcribe Pro Project', extensions: ['tsproj'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      const projectData = fs.readFileSync(filePath, 'utf-8');
      console.log('[Main] Project loaded from:', filePath);

      return { canceled: false, filePath, projectData };
    } catch (error) {
      console.error('[Main] Load project error:', error);
      throw error;
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
