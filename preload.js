// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    openFile: (title,extensions) => ipcRenderer.invoke('openFile',title,extensions),
    GetChanels: () => ipcRenderer.invoke('GetChanels'),
    CreateStore: (Fee) => ipcRenderer.invoke('CreateStore',Fee),
    IsStoreConfirmed: (idStore) => ipcRenderer.invoke('IsStoreConfirmed', idStore),
    IsKeyConfirmed: (idStore,key) => ipcRenderer.invoke('IsKeyConfirmed', idStore, key),
    InsertChanelDetails: (chanel) => ipcRenderer.invoke('InsertChanelDetails', chanel),
    InsertVideoDetails: (Video) => ipcRenderer.invoke('InsertVideoDetails', Video),
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