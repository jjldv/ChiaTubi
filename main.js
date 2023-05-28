// main.js

const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path');
const {
    splitFileIntoChunks,
    reconstructMP4FromChunks,
    IsChanelConfirmed,
    createChanel,
    InsertChanelDetails,
    IsChanelDetailsConfirmed,
    GetChanels
} = require('./Utils');

function handleSetTitle(event, title) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win.setTitle(title)
    return event.returnValue = {
        result: "ok",
        dato: {}
    };
}
async function handleFileOpen(event, title, extensions) {
    const options = {
        filters: [{
            name: title,
            extensions: [extensions]
        }]
    };

    const {
        canceled,
        filePaths
    } = await dialog.showOpenDialog(options);
    if (!canceled && filePaths.length > 0) {
        return filePaths[0];
    }
}
async function handlecreateChanel(event, Chanel) {
    let Response = await createChanel(Chanel);

    return Response;
}
async function handleIsChanelConfirmed(event, idChanel) {
    let Response = await IsChanelConfirmed(idChanel);

    return Response;
}
async function handleIsChanelDetailsConfirmed(event, idChanel) {
    let Response = await IsChanelDetailsConfirmed(idChanel);

    return Response;
}
async function handleInsertChanelDetails(event, chanel) {
    let Response = await InsertChanelDetails(chanel);

    return Response;
}
async function handleGetChanels(event) {
    let Response = await GetChanels();

    return Response;
}
async function handleFolderOpen() {
    const options = {
        properties: ['openDirectory']
    };

    const {
        canceled,
        filePaths
    } = await dialog.showOpenDialog(options);

    if (!canceled && filePaths.length > 0) {
        return filePaths[0];
    }
    return null;
}
async function handlesplitFileIntoChunks(event, dirName, chunkSizeMB) {
    let FolderOuput = splitFileIntoChunks(dirName, chunkSizeMB);
    return FolderOuput;
}
async function handlereconstructMP4FromChunks(event, FolderPath, OutputName, totalChunks) {
    let Output = reconstructMP4FromChunks(FolderPath, OutputName, totalChunks);
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
    ipcMain.handle('createChanel', handlecreateChanel);
    ipcMain.handle('IsChanelConfirmed', handleIsChanelConfirmed);
    ipcMain.handle('IsChanelDetailsConfirmed', handleIsChanelDetailsConfirmed);
    ipcMain.handle('InsertChanelDetails', handleInsertChanelDetails);
    ipcMain.handle('GetChanels', handleGetChanels);
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