// main.js

const {
    app,
    BrowserWindow,
    dialog,
    ipcMain
} = require('electron')
const fs = require('fs');
const express = require('express');
const appExpress = express();
const path = require('path');
const ChiaDataLayer = require('./ChiaDataLayer');
const VideoFile = require('./VideoFile');
const rangeParser = require('range-parser');

const chiaDataLayer = new ChiaDataLayer();
let VFile = new VideoFile(0, 0);



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

async function PrepareVideo(event, IdVideo, TotalChunks,Size) {

    VFile = new VideoFile(IdVideo, TotalChunks,Size);
    VFile.LoadVideoAsync();
    return true;
}
async function StopPrepareVideo(event,) {

    VFile.StopLoading = true;
    VFile.ByteFile = Buffer.alloc(0);
    return true;
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

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: '#141414',
        icon: path.join(__dirname,"img", 'icon.png'), // Ruta al archivo de icono
        webPreferences: {
            nodeIntegration: false, 
            contextIsolation: true, 
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.maximize();
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    ipcMain.handle('openFile', FileOpen);
    ipcMain.handle('CreateStore', (event,Fee)=>{return chiaDataLayer.createStore(Fee)});
    ipcMain.handle('IsStoreConfirmed', (event, idStore)=> {return chiaDataLayer.isStoreConfirmed(idStore)});
    ipcMain.handle('IsKeyConfirmed', (event, idStore, key)=> {return  chiaDataLayer.isKeyConfirmed(idStore, key)});
    ipcMain.handle('InsertChanelDetails', (event, chanel) =>{return chiaDataLayer.insertChanelDetails(chanel);});
    ipcMain.handle('InsertVideoDetails', (event, Video)=> {return  chiaDataLayer.insertVideoDetails(Video);});
    ipcMain.handle('GetChanelVideos', (event, idChanel) =>{return chiaDataLayer.getChanelVideos(idChanel);});
    ipcMain.handle('InsertVideoFile', (event, Video)=> {return chiaDataLayer.insertVideoFile(Video);});
    ipcMain.handle('GetVideoFile', (event, Id) =>{return chiaDataLayer.getVideoFile(Id);});
    ipcMain.handle('GetChunk', (event, IdVideo, ChunkNumber, TotalChunks)=> {return chiaDataLayer.getChunk(IdVideo, ChunkNumber, TotalChunks);});
    ipcMain.handle('PrepareVideo', PrepareVideo);
    ipcMain.handle('StopPrepareVideo', StopPrepareVideo);
    ipcMain.handle('PercentageLoaded', (event)=> {return VFile.percentageLoaded();});
    ipcMain.handle('CreateTempFileStore',(event, Chanel)=>{return chiaDataLayer.createTempFileStore(Chanel)})
    ipcMain.handle('DeleteTempFileStore',(event, Chanel) =>{return chiaDataLayer.deleteTempFileStore(Chanel);})
    ipcMain.handle('GetChanels', (event)=> {return chiaDataLayer.getChanels();});
    ipcMain.handle('IsChiaInstalled', ()=>{return chiaDataLayer.isChiaInstalled()});
    ipcMain.handle('UnsubscribeChanel', (event,IdChanel)=>{ return chiaDataLayer.unsubscribeChanel(IdChanel) });
    ipcMain.handle('SubscribeChanel', (event,IdChanel)=>{ return chiaDataLayer.subscribeChanel(IdChanel) });
    ipcMain.handle('GetChanelsPending', (event)=> {return chiaDataLayer.getChanelsPending();});
    ipcMain.handle('openFolder', FolderOpen);
    ipcMain.handle('splitFileIntoChunks', (event, dirName, chunkSizeMB)=> {return chiaDataLayer.splitFileIntoChunks(dirName, chunkSizeMB);});
    ipcMain.handle('reconstructMP4FromChunks', (event, FolderPath, OutputName, totalChunks)=> {return chiaDataLayer.reconstructMP4FromChunks(FolderPath, OutputName, totalChunks);});
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


appExpress.get('/CurrentPlayer', (req, res) => {
    const videoSize = VFile.IsLoaded() ? VFile.ByteFile.length : VFile.SizeInBytes ;
    const range = req.headers.range || 'bytes=0-';
    const parts = rangeParser(videoSize, range, {
        combine: true
    });

    const start = parts[0].start;
    const end = parts[0].end;
    const chunkSize = (end - start) + 1;

    res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4'
    });

    const videoPart = VFile.ByteFile.slice(start, end + 1);
    res.end(videoPart);
});




appExpress.listen(8000, () => {
    console.log('Servidor Express iniciado en el puerto 3000');
});