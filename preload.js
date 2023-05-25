// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    openFile: () => ipcRenderer.invoke('openFile'),
    splitFileIntoChunks: (FilePath, ChunkSize) => ipcRenderer.invoke('splitFileIntoChunks', FilePath, ChunkSize),
    reconstructMP4FromChunks: (FolderPath,OutputName) => ipcRenderer.invoke('reconstructMP4FromChunks', FolderPath,OutputName),
    
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