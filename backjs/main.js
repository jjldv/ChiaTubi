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
const Video = require('./Video');
const Chanel = require('./Chanel');
const Utils = require('./Utils');
const VideoFile = require('./VideoFile');
const rangeParser = require('range-parser');

const chiaDataLayer = new ChiaDataLayer();
let VFile = new VideoFile();
let video = new Video();
let chanel = new Chanel();
let utils = new Utils();



function SetTitle(event, title) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win.setTitle(title)
    return event.returnValue = {
        result: "ok",
        dato: {}
    };
}
function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: '#141414',
        icon: path.join(app.getAppPath(),"img", 'icon.png'), // Ruta al archivo de icono
        webPreferences: {
            nodeIntegration: false, 
            contextIsolation: true, 
            preload: path.join(__dirname, 'BackendApi.js')
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.maximize();
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    ipcMain.handle('openFile', (event,Title,Extension)=>{return utils.openFile(Title,Extension);});
    ipcMain.handle('createVideoStore', (event,VideoData)=>{return video.createVideoStore(VideoData);});
    ipcMain.handle('getPendingVideos', (event)=>{return video.getPending();});
    ipcMain.handle('getVideos', (event)=>{return video.get();});
    ipcMain.handle('deletePendingVideo', (event,IdVideo)=>{return video.deletePending(IdVideo);});
    ipcMain.handle('insertChunk', (event, Video)=> {return video.insertChunk(Video);});
    ipcMain.handle('insertVideoDetailsInChanel', (event, Video)=> {return  chanel.insertVideoDetails(Video);});
    ipcMain.handle('IsStoreConfirmed', (event, idStore)=> {return chiaDataLayer.isStoreConfirmed(idStore)});
    ipcMain.handle('IsKeyConfirmed', (event, idStore, key)=> {return  chiaDataLayer.isKeyConfirmed(idStore, key)});
    ipcMain.handle('InsertChanelDetails', (event, chanel) =>{return chiaDataLayer.insertChanelDetails(chanel);});
    ipcMain.handle('GetChanelVideos', (event, idChanel) =>{return chiaDataLayer.getChanelVideos(idChanel);});
    ipcMain.handle('GetChanelVideosPending', (event, idChanel) =>{return chiaDataLayer.getChanelVideosPending(idChanel);});
    ipcMain.handle('GetVideoFile', (event, Id) =>{return chiaDataLayer.getVideoFile(Id);});
    ipcMain.handle('GetChunk', (event, IdVideo, ChunkNumber, TotalChunks)=> {return chiaDataLayer.getChunk(IdVideo, ChunkNumber, TotalChunks);});
    ipcMain.handle('prepareVideo', (event,IdVideo, TotalChunks,Size)=>{VFile.prepareVideo(IdVideo, TotalChunks,Size)});
    ipcMain.handle('stopPrepareVideo', (event)=>{VFile.stopPrepareVideo()});
    ipcMain.handle('PercentageLoaded', (event)=> {return VFile.percentageLoaded();});
    ipcMain.handle('unsubscribeVideo', (event,IdStore)=>{ return video.unsubscribeVideo(IdStore) });
    ipcMain.handle('GetChanels', (event)=> {return chiaDataLayer.getChanels();});
    ipcMain.handle('CheckPrerequisites', ()=>{return chiaDataLayer.checkPrerequisites()});
    ipcMain.handle('UnsubscribeChanel', (event,IdChanel)=>{ return chiaDataLayer.unsubscribeChanel(IdChanel) });
    ipcMain.handle('SubscribeChanel', (event,IdChanel)=>{ return chiaDataLayer.subscribeChanel(IdChanel) });
    ipcMain.handle('GetChanelsPending', (event)=> {return chiaDataLayer.getChanelsPending();});
    ipcMain.handle('GetChanelsSubscriptionPending', (event)=> {return chiaDataLayer.getChanelsSubscriptionPending();});
    ipcMain.handle('splitFileIntoChunks', (event, dirName, chunkSizeMB)=> {return chiaDataLayer.splitFileIntoChunks(dirName, chunkSizeMB);});
    ipcMain.handle('reconstructMP4FromChunks', (event, FolderPath, OutputName, totalChunks)=> {return chiaDataLayer.reconstructMP4FromChunks(FolderPath, OutputName, totalChunks);});
    VFile.stopPrepareVideo();
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
    try{
        const videoSize = VFile.IsLoaded() ? VFile.ByteFile.length : VFile.Size ;
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
    }
    catch(err){
        console.log(err);
    }
});




appExpress.listen(8000, () => {
    console.log('Servidor Express iniciado en el puerto 3000');
});