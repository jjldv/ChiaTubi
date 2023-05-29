// main.js

const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path');
const ChiaDataLayer = require('./ChiaDataLayer');

const chiaDataLayer = new ChiaDataLayer();


function SetTitle(event, title) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win.setTitle(title)
    return event.returnValue = {
        result: "ok",
        dato: {}
    };
}
async function FileOpen(event, title, extensions) {
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
async function CreateStore(event,Fee) {
    let Response = await chiaDataLayer.createStore(Fee);

    return Response;
}
async function IsStoreConfirmed(event, idStore) {
    let Response = await chiaDataLayer.isStoreConfirmed(idStore);

    return Response;
}
async function IsKeyConfirmed(event, idStore, key) {
    let Response = await chiaDataLayer.isKeyConfirmed(idStore, key);

    return Response;
}
async function InsertChanelDetails(event, chanel) {
    let Response = await chiaDataLayer.insertChanelDetails(chanel);

    return Response;
}
async function InsertVideoDetails(event, Video) {
    let Response = await chiaDataLayer.insertVideoDetails(Video);

    return Response;
}
async function GetChanels(event) {
    let Response = await chiaDataLayer.getChanels();

    return Response;
}
async function GetChanelVideos(event, idChanel) {
    let Response = await chiaDataLayer.getChanelVideos(idChanel);

    return Response;
}
async function FolderOpen() {
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
async function splitFileIntoChunks(event, dirName, chunkSizeMB) {
    let FolderOuput = chiaDataLayer.splitFileIntoChunks(dirName, chunkSizeMB);
    return FolderOuput;
}
async function reconstructMP4FromChunks(event, FolderPath, OutputName, totalChunks) {
    let Output = chiaDataLayer.reconstructMP4FromChunks(FolderPath, OutputName, totalChunks);
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
    ipcMain.handle('set-title', SetTitle);
    ipcMain.handle('openFile', FileOpen);
    ipcMain.handle('CreateStore', CreateStore);
    ipcMain.handle('IsStoreConfirmed', IsStoreConfirmed);
    ipcMain.handle('IsKeyConfirmed', IsKeyConfirmed);
    ipcMain.handle('InsertChanelDetails', InsertChanelDetails);
    ipcMain.handle('InsertVideoDetails', InsertVideoDetails);
    ipcMain.handle('GetChanelVideos', GetChanelVideos);
    ipcMain.handle('GetChanels', GetChanels);
    ipcMain.handle('openFolder', FolderOpen);
    ipcMain.handle('splitFileIntoChunks', splitFileIntoChunks);
    ipcMain.handle('reconstructMP4FromChunks', reconstructMP4FromChunks);
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