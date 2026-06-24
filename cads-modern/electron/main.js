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

// ---------------------------------------------------------------------------
// Checkpointing — lets a long analysis survive closing the app.
// Stored in the OS user-data dir: meta.json, features.json, features.bin
// (ORB descriptors), distances.bin (Float32 upper-triangle distance matrix).
// ---------------------------------------------------------------------------
const checkpointDir = () => join(app.getPath('userData'), 'cads-checkpoint');

const toBuffer = (arr) =>
  Buffer.from(arr.buffer ?? arr, arr.byteOffset ?? 0, arr.byteLength ?? arr.length);

ipcMain.handle('checkpoint-exists', async () => {
  try {
    return JSON.parse(await fs.readFile(join(checkpointDir(), 'meta.json'), 'utf8'));
  } catch {
    return null;
  }
});

ipcMain.handle('checkpoint-save-meta', async (event, meta) => {
  await fs.mkdir(checkpointDir(), { recursive: true });
  await fs.writeFile(join(checkpointDir(), 'meta.json'), JSON.stringify(meta));
  return true;
});

ipcMain.handle('checkpoint-save-features', async (event, descData, rows, cols, keypointCounts) => {
  await fs.mkdir(checkpointDir(), { recursive: true });
  await fs.writeFile(join(checkpointDir(), 'features.bin'), toBuffer(descData));
  await fs.writeFile(
    join(checkpointDir(), 'features.json'),
    JSON.stringify({ rows, cols, keypointCounts })
  );
  return true;
});

ipcMain.handle('checkpoint-save-distances', async (event, distances, pairIndex) => {
  const dir = checkpointDir();
  await fs.mkdir(dir, { recursive: true });
  // Write atomically so a crash mid-write can't corrupt the checkpoint
  const tmp = join(dir, 'distances.bin.tmp');
  await fs.writeFile(tmp, toBuffer(distances));
  await fs.rename(tmp, join(dir, 'distances.bin'));
  try {
    const meta = JSON.parse(await fs.readFile(join(dir, 'meta.json'), 'utf8'));
    meta.pairIndex = pairIndex;
    meta.savedAt = Date.now();
    await fs.writeFile(join(dir, 'meta.json'), JSON.stringify(meta));
  } catch {
    // meta missing — ignore
  }
  return true;
});

ipcMain.handle('checkpoint-load', async () => {
  try {
    const dir = checkpointDir();
    const meta = JSON.parse(await fs.readFile(join(dir, 'meta.json'), 'utf8'));
    const featureInfo = JSON.parse(await fs.readFile(join(dir, 'features.json'), 'utf8'));
    const descriptors = await fs.readFile(join(dir, 'features.bin'));
    let distances = null;
    try {
      distances = await fs.readFile(join(dir, 'distances.bin'));
    } catch {
      // no distances yet — resume from the start of matching
    }
    return { meta, featureInfo, descriptors, distances };
  } catch {
    return null;
  }
});

ipcMain.handle('checkpoint-clear', async () => {
  await fs.rm(checkpointDir(), { recursive: true, force: true });
  return true;
});

// Open a previously exported study JSON
ipcMain.handle('open-study', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  if (result.canceled) return null;
  try {
    return JSON.parse(await fs.readFile(result.filePaths[0], 'utf8'));
  } catch (error) {
    return { error: `Could not read study file: ${error.message}` };
  }
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
