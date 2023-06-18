const {
    contextBridge,
    ipcRenderer
} = require('electron');
let LOGENABLED = true;
function createLogProxy(func) {
    return new Proxy(func, {
        apply(target, thisArg, args) {
            const paramString = args.length > 0 ? JSON.stringify(args).slice(1, -1) : '';
            if (LOGENABLED)
                console.log(`BackendApi.${target.name}${paramString ? `(${paramString})` : ''}`);
            return target.apply(thisArg, args).then((result) => {
                if (LOGENABLED)
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
    deletePending: (IdStore) => ipcRenderer.invoke('deletePending', IdStore),
    insertChunk: (Video) => ipcRenderer.invoke('insertChunk', Video),
    addMirror: (Video,PublicIP) => ipcRenderer.invoke('addMirror', Video,PublicIP),
    confirmMirror: (IdStore,Mirror) => ipcRenderer.invoke('confirmMirror', IdStore,Mirror),
    prepareVideo2Play: (IdStore, TotalChunks, Size) => ipcRenderer.invoke('prepareVideo2Play', IdStore, TotalChunks, Size),
    isStoreConfirmed: (idStore) => ipcRenderer.invoke('isStoreConfirmed', idStore),
    unsubscribeVideo: (IdStore) => ipcRenderer.invoke('unsubscribeVideo', IdStore),
    subscribeVideo: (IdStore) => ipcRenderer.invoke('subscribeVideo', IdStore),
    checkPrerequisites: () => ipcRenderer.invoke('checkPrerequisites'),
    stopPrepareVideo2Play: () => ipcRenderer.invoke('stopPrepareVideo2Play'),
    videoPercentageLoaded: () => ipcRenderer.invoke('videoPercentageLoaded'),
    confirmSubscription: (IdStore) => ipcRenderer.invoke('confirmSubscription', IdStore),
    setPublicIP: (PublicIP) => ipcRenderer.invoke('setPublicIP', PublicIP),
    getMirrors: (IdStore) => ipcRenderer.invoke('getMirrors', IdStore),
    deleteMirror: (CoinId,IdStore) => ipcRenderer.invoke('deleteMirror', CoinId,IdStore),
    confirmDeleteMirror: (CoinId,IdStore) => ipcRenderer.invoke('confirmDeleteMirror', CoinId,IdStore),
    addCustomMirror: (CustomMirror) => ipcRenderer.invoke('addCustomMirror', CustomMirror),
};

const debugBackendApi = {};
for (const key in BackendApi) {
    debugBackendApi[key] = createLogProxy(BackendApi[key]);
}

contextBridge.exposeInMainWorld('BackendApi', debugBackendApi);