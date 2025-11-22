import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';

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

// Handle image analysis using Python backend
ipcMain.handle('analyze-images', async (event, imagePaths) => {
  return new Promise((resolve, reject) => {
    // Path to Python script
    const pythonScript = join(__dirname, '..', 'python', 'main.py');

    // Spawn Python process
    // Use 'python3' command - should work on Mac M4
    const pythonProcess = spawn('python3', [pythonScript]);

    let stdoutBuffer = '';
    let stderrBuffer = '';

    // Handle Python stdout (JSON messages)
    pythonProcess.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();

      // Process complete JSON messages (one per line)
      const lines = stdoutBuffer.split('\n');

      // Keep the last incomplete line in buffer
      stdoutBuffer = lines.pop() || '';

      // Process each complete line
      lines.forEach(line => {
        if (!line.trim()) return;

        try {
          const message = JSON.parse(line);

          if (message.type === 'progress') {
            // Send progress update to renderer
            event.sender.send('analysis-progress', {
              current: message.current,
              total: message.total,
              status: message.message
            });
          } else if (message.type === 'error') {
            // Send error to renderer
            event.sender.send('analysis-error', message.message);
          } else if (message.type === 'result') {
            // Final result received
            resolve(message.data);
          }
        } catch (e) {
          console.error('Failed to parse Python output:', line, e);
        }
      });
    });

    // Handle Python stderr (errors and debug output)
    pythonProcess.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
      console.error('Python stderr:', data.toString());
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        const error = `Python process exited with code ${code}\nStderr: ${stderrBuffer}`;
        console.error(error);
        reject(new Error(error));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      reject(new Error(`Failed to start Python: ${error.message}`));
    });

    // Send command to Python via stdin
    const command = {
      command: 'analyze',
      image_paths: imagePaths
    };

    pythonProcess.stdin.write(JSON.stringify(command));
    pythonProcess.stdin.end();
  });
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
