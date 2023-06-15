const {
    contextBridge,
    ipcRenderer
} = require('electron');

function createLogProxy(func) {
    return new Proxy(func, {
        apply(target, thisArg, args) {
            const paramString = args.length > 0 ? JSON.stringify(args).slice(1, -1) : '';
            console.log(`BackendApi.${target.name}${paramString ? `(${paramString})` : ''}`);
            return target.apply(thisArg, args).then((result) => {
                console.log(`Response BackendApi.${target.name}:`, result);
                return result;
            });
        }
    });
}


const BackendApi = {
    openFile: (title, extensions) => ipcRenderer.invoke('openFile', title, extensions),
    createVideoStore: (VideoData) => ipcRenderer.invoke('createVideoStore', VideoData),
    getPendingVideos: () => ipcRenderer.invoke('getPendingVideos'),
    getVideos: () => ipcRenderer.invoke('getVideos'),
    deletePendingVideo: (IdVideo) => ipcRenderer.invoke('deletePendingVideo', IdVideo),
    insertChunk: (Video) => ipcRenderer.invoke('insertChunk', Video),
    addMirror: (Video) => ipcRenderer.invoke('addMirror', Video),
    confirmMirror: (IdVideo) => ipcRenderer.invoke('confirmMirror', IdVideo),
    prepareVideo2Play: (IdVideo, TotalChunks, Size) => ipcRenderer.invoke('prepareVideo2Play', IdVideo, TotalChunks, Size),
    isStoreConfirmed: (idStore) => ipcRenderer.invoke('isStoreConfirmed', idStore),
    unsubscribeVideo: (IdStore) => ipcRenderer.invoke('unsubscribeVideo', IdStore),
    subscribeVideo: (IdStore) => ipcRenderer.invoke('subscribeVideo', IdStore),
    checkPrerequisites: () => ipcRenderer.invoke('checkPrerequisites'),
    stopPrepareVideo2Play: () => ipcRenderer.invoke('stopPrepareVideo2Play'),
    videoPercentageLoaded: () => ipcRenderer.invoke('videoPercentageLoaded'),
    confirmSubscription: (IdVideo) => ipcRenderer.invoke('confirmSubscription', IdVideo),
};

const debugBackendApi = {};
for (const key in BackendApi) {
    debugBackendApi[key] = createLogProxy(BackendApi[key]);
}

contextBridge.exposeInMainWorld('BackendApi', debugBackendApi);