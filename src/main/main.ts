import { app, BrowserWindow } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // Hide the native menu bar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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

app.whenReady().then(() => {
  createWindow();

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

