// main.js

const { app, BrowserWindow, dialog , ipcMain } = require('electron')
const path = require('path');
const { splitFileIntoChunks ,reconstructMP4FromChunks} = require('./Utils');

function handleSetTitle (event, title) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win.setTitle(title)
    return event.returnValue = { result: "ok", dato: {} };
}
async function handleFileOpen() {
    const options = {
      filters: [
        { name: 'Archivos MP4', extensions: ['mp4'] }
      ]
    };
  
    const { canceled, filePaths } = await dialog.showOpenDialog(options);
  
    if (!canceled && filePaths.length > 0) {
      return filePaths[0];
    }
}
async function handleFolderOpen() {
    const options = {
      properties: ['openDirectory']
    };
  
    const { canceled, filePaths } = await dialog.showOpenDialog(options);
  
    if (!canceled && filePaths.length > 0) {
      return filePaths[0];
    }
  }
async function handlesplitFileIntoChunks (event,dirName, chunkSizeMB) {
    let FolderOuput = splitFileIntoChunks(dirName,chunkSizeMB );
    return FolderOuput;
}
async function handlereconstructMP4FromChunks (event,FolderPath,OutputName,totalChunks) {
    let Output = reconstructMP4FromChunks(FolderPath ,OutputName,totalChunks);
    return Output;
}

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false, // No es necesario habilitar la integración de Node.js en el proceso de renderizado
            contextIsolation: true, // Se recomienda habilitar el aislamiento de contexto para mayor seguridad
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');

    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    ipcMain.on('set-title', handleSetTitle);
    ipcMain.handle('openFile', handleFileOpen);
    ipcMain.handle('openFolder', handleFolderOpen);
    ipcMain.handle('splitFileIntoChunks', handlesplitFileIntoChunks);
    ipcMain.handle('reconstructMP4FromChunks', handlereconstructMP4FromChunks);
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
