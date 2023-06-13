// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('BackendApi', {
    openFile: (title,extensions) => ipcRenderer.invoke('openFile',title,extensions),
    createVideoStore: (VideoData) => ipcRenderer.invoke('createVideoStore',VideoData),
    getPendingVideos: () => ipcRenderer.invoke('getPendingVideos'),
    getVideos: () => ipcRenderer.invoke('getVideos'),
    deletePendingVideo: (IdVideo) => ipcRenderer.invoke('deletePendingVideo',IdVideo),
    insertChunk: (Video) => ipcRenderer.invoke('insertChunk', Video),
    prepareVideo2Play: (IdVideo,TotalChunks,Size) => ipcRenderer.invoke('prepareVideo2Play', IdVideo,TotalChunks,Size),
    isStoreConfirmed: (idStore) => ipcRenderer.invoke('isStoreConfirmed', idStore),
    unsubscribeVideo: (IdStore) => ipcRenderer.invoke('unsubscribeVideo', IdStore),
    subscribeVideo: (IdStore) => ipcRenderer.invoke('subscribeVideo', IdStore),
    checkPrerequisites: () => ipcRenderer.invoke('checkPrerequisites'),
    stopPrepareVideo2Play: () => ipcRenderer.invoke('stopPrepareVideo2Play'),
    videoPercentageLoaded: () => ipcRenderer.invoke('videoPercentageLoaded'),    
    getVideoDetails: (IdVideo) => ipcRenderer.invoke('getVideoDetails',IdVideo),
})