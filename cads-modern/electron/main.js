import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Needed for loading local images
    }
  });

  // Load the app
  // In development, load from Vite dev server
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) return null;

  const folderPath = result.filePaths[0];

  // Read all image files from the folder
  const files = await fs.readdir(folderPath);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'];

  const imageFiles = files
    .filter(file => {
      const ext = file.toLowerCase().slice(file.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    })
    .map(file => join(folderPath, file));

  return imageFiles;
});

// Handle file save
ipcMain.handle('save-file', async (event, data, filename) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (result.canceled) return false;

  await fs.writeFile(result.filePath, JSON.stringify(data, null, 2));
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
