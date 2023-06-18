//to spawn a child process
const childProcessFile = process.argv[1] ?? '';

if (childProcessFile.includes('getChunkProcess')) {
    require(childProcessFile);
    return;
}
const {
    app,
    BrowserWindow,
    ipcMain
} = require('electron')
const express = require('express');
const appExpress = express();
const path = require('path');
const ChiaDataLayer = require('./ChiaDataLayer');
const Video = require('./Video');
const Utils = require('./Utils');
const VideoFile = require('./VideoFile');
const rangeParser = require('range-parser');

const chiaDataLayer = new ChiaDataLayer();
let VFile = new VideoFile();
let video = new Video();
let utils = new Utils();
PUBLIC_IP = null;
const gotSingleInstanceLock = app.requestSingleInstanceLock();

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: '#141414',
        icon: path.join(app.getAppPath(), "img", 'icon.png'),
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

if (!gotSingleInstanceLock) {
    app.quit();
} else {
    app.whenReady().then(() => {
        ipcMain.handle('checkPrerequisites', () => {
            return chiaDataLayer.checkPrerequisites()
        });
        ipcMain.handle('openFile', (event, Title, Extension) => {
            return utils.openFile(Title, Extension);
        });
        ipcMain.handle('createVideoStore', (event, VideoData) => {
            return video.createVideoStore(VideoData);
        });
        ipcMain.handle('getPendingVideos', (event) => {
            return video.getPending();
        });
        ipcMain.handle('getVideos', (event) => {
            return video.get();
        });
        ipcMain.handle('deletePending', (event, IdVideo) => {
            return video.deletePending(IdVideo);
        });
        ipcMain.handle('insertChunk', (event, Video) => {
            return video.insertChunk(Video);
        });
        ipcMain.handle('addMirror', (event, Video, PublicIP) => {
            return video.addMirror(Video, PublicIP);
        });
        ipcMain.handle('confirmMirror', (event, IdVideo, Mirror) => {
            return video.confirmMirror(IdVideo, Mirror);
        });
        ipcMain.handle('isStoreConfirmed', (event, idStore) => {
            return chiaDataLayer.isStoreConfirmed(idStore)
        });
        ipcMain.handle('prepareVideo2Play', (event, IdVideo, TotalChunks, Size) => {
            return VFile.prepareVideo2Play(IdVideo, TotalChunks, Size)
        });
        ipcMain.handle('stopPrepareVideo2Play', (event) => {
            return VFile.stopPrepareVideo2Play()
        });
        ipcMain.handle('videoPercentageLoaded', (event) => {
            return VFile.percentageLoaded();
        });
        ipcMain.handle('unsubscribeVideo', (event, IdStore) => {
            return video.unsubscribe(IdStore)
        });
        ipcMain.handle('subscribeVideo', (event, IdStore) => {
            return video.subscribe(IdStore)
        });
        ipcMain.handle('confirmSubscription', (event, IdVideo) => {
            return video.confirmSubscription(IdVideo)
        });
        ipcMain.handle('setPublicIP', (event, PublicIP) => {
            PUBLIC_IP = PublicIP;
        });
        ipcMain.handle('getMirrors', (event, IdVideo) => {
            return video.getMirrors(IdVideo)
        });
        ipcMain.handle('deleteMirror', (event, CoinId, IdStore) => {
            return video.deleteMirror(CoinId, IdStore)
        });
        ipcMain.handle('confirmDeleteMirror', (event, CoinId, IdStore) => {
            return video.confirmDeleteMirror(CoinId, IdStore)
        });
        ipcMain.handle('addCustomMirror', (event, CustomMirror) => {
            return video.addCustomMirror(CustomMirror)
        });
        VFile.stopPrepareVideo2Play();
        utils.deleteTempFiles();
        createWindow();
        utils.getPublicIP().then((PublicIP) => {
            PUBLIC_IP = PublicIP;
        });
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('second-instance', () => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
        }
    });

}
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

if (!gotSingleInstanceLock) {
    return;
}
appExpress.get('/CurrentPlayer', (req, res) => {
    try {
        const videoSize = VFile.isLoaded() ? VFile.ByteFile.length : VFile.Size;
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
    } catch (err) {
        console.log(err);
    }
});
appExpress.listen(8000, () => {
    console.log('Express on port 8000');
});