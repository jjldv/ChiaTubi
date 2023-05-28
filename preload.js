// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    openFile: (title,extensions) => ipcRenderer.invoke('openFile',title,extensions),
    GetChanels: () => ipcRenderer.invoke('GetChanels'),
    createChanel: (Chanel) => ipcRenderer.invoke('createChanel', Chanel),
    IsChanelConfirmed: (idChanel) => ipcRenderer.invoke('IsChanelConfirmed', idChanel),
    IsChanelDetailsConfirmed: (idChanel) => ipcRenderer.invoke('IsChanelDetailsConfirmed', idChanel),
    InsertChanelDetails: (chanel) => ipcRenderer.invoke('InsertChanelDetails', chanel),
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