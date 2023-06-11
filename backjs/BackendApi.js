// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('BackendApi', {
    createVideoStore: (VideoData) => ipcRenderer.invoke('createVideoStore',VideoData),
    getPendingVideos: () => ipcRenderer.invoke('getPendingVideos'),
    getVideos: () => ipcRenderer.invoke('getVideos'),
    deletePendingVideo: (IdVideo) => ipcRenderer.invoke('deletePendingVideo',IdVideo),
    insertVideoDetailsInChanel: (Video) => ipcRenderer.invoke('insertVideoDetailsInChanel', Video),
    insertChunk: (Video) => ipcRenderer.invoke('insertChunk', Video),
    prepareVideo: (IdVideo,TotalChunks,Size) => ipcRenderer.invoke('prepareVideo', IdVideo,TotalChunks,Size),
    openFile: (title,extensions) => ipcRenderer.invoke('openFile',title,extensions),
    GetChanels: () => ipcRenderer.invoke('GetChanels'),
    GetChanelsPending: () => ipcRenderer.invoke('GetChanelsPending'),
    GetChanelsSubscriptionPending: () => ipcRenderer.invoke('GetChanelsSubscriptionPending'),
    CreateStore: (Fee) => ipcRenderer.invoke('CreateStore',Fee),
    IsStoreConfirmed: (idStore) => ipcRenderer.invoke('IsStoreConfirmed', idStore),
    IsKeyConfirmed: (idStore,key) => ipcRenderer.invoke('IsKeyConfirmed', idStore, key),
    InsertChanelDetails: (chanel) => ipcRenderer.invoke('InsertChanelDetails', chanel),
    GetVideoFile: (IdVideo) => ipcRenderer.invoke('GetVideoFile', IdVideo),
    GetChunk: (IdVideo,ChunkNumber,TotalChunks) => ipcRenderer.invoke('GetChunk', IdVideo,ChunkNumber,TotalChunks),
    UnsubscribeChanel: (IdChanel) => ipcRenderer.invoke('UnsubscribeChanel', IdChanel),
    unsubscribeVideo: (IdStore) => ipcRenderer.invoke('unsubscribeVideo', IdStore),
    SubscribeChanel: (IdChanel) => ipcRenderer.invoke('SubscribeChanel', IdChanel),
    CheckPrerequisites: () => ipcRenderer.invoke('CheckPrerequisites'),
    stopPrepareVideo: () => ipcRenderer.invoke('stopPrepareVideo'),
    PercentageLoaded: () => ipcRenderer.invoke('PercentageLoaded'),
    GetChanelVideos: (idChanel) => ipcRenderer.invoke('GetChanelVideos',idChanel),
    GetChanelVideosPending: (idChanel) => ipcRenderer.invoke('GetChanelVideosPending',idChanel),
    AddVideo: (video) => ipcRenderer.invoke('AddVideo',video),
    openFolder: () => ipcRenderer.invoke('openFolder'),
    splitFileIntoChunks: (FilePath, ChunkSize) => ipcRenderer.invoke('splitFileIntoChunks', FilePath, ChunkSize),
    reconstructMP4FromChunks: (FolderPath,OutputName,totalChunks) => ipcRenderer.invoke('reconstructMP4FromChunks', FolderPath,OutputName,totalChunks),
    
})
// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }
  
    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency])
    }
})