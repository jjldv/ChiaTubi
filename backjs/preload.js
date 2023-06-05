// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: (title,extensions) => ipcRenderer.invoke('openFile',title,extensions),
    GetChanels: () => ipcRenderer.invoke('GetChanels'),
    GetChanelsPending: () => ipcRenderer.invoke('GetChanelsPending'),
    GetChanelsSubscriptionPending: () => ipcRenderer.invoke('GetChanelsSubscriptionPending'),
    CreateStore: (Fee) => ipcRenderer.invoke('CreateStore',Fee),
    IsStoreConfirmed: (idStore) => ipcRenderer.invoke('IsStoreConfirmed', idStore),
    IsKeyConfirmed: (idStore,key) => ipcRenderer.invoke('IsKeyConfirmed', idStore, key),
    InsertChanelDetails: (chanel) => ipcRenderer.invoke('InsertChanelDetails', chanel),
    InsertVideoDetails: (Video) => ipcRenderer.invoke('InsertVideoDetails', Video),
    InsertVideoFile: (Video) => ipcRenderer.invoke('InsertVideoFile', Video),
    GetVideoFile: (IdVideo) => ipcRenderer.invoke('GetVideoFile', IdVideo),
    GetChunk: (IdVideo,ChunkNumber,TotalChunks) => ipcRenderer.invoke('GetChunk', IdVideo,ChunkNumber,TotalChunks),
    PrepareVideo: (IdVideo,TotalChunks,Size) => ipcRenderer.invoke('PrepareVideo', IdVideo,TotalChunks,Size),
    UnsubscribeChanel: (IdChanel) => ipcRenderer.invoke('UnsubscribeChanel', IdChanel),
    SubscribeChanel: (IdChanel) => ipcRenderer.invoke('SubscribeChanel', IdChanel),
    IsChiaInstalled: () => ipcRenderer.invoke('IsChiaInstalled'),
    StopPrepareVideo: () => ipcRenderer.invoke('StopPrepareVideo'),
    PercentageLoaded: () => ipcRenderer.invoke('PercentageLoaded'),
    CreateTempFileStore: (Chanel,Type,PendingType) => ipcRenderer.invoke('CreateTempFileStore', Chanel,Type,PendingType),
    DeleteTempFileStore: (Chanel,Type,PendingType) => ipcRenderer.invoke('DeleteTempFileStore', Chanel,Type,PendingType),
    GetChanelVideos: (idChanel) => ipcRenderer.invoke('GetChanelVideos',idChanel),
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