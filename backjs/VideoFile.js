const ChiaDataLayer = require('./ChiaDataLayer');
const Utils = require('./Utils');
const fs = require('fs');
const path = require('path');
const {
    app
} = require('electron');
const {
    fork
} = require('child_process');


function VideoFile(IdVideo = 0, TotalChunks = 0, Size = 0) {
    this.Id = IdVideo;
    this.TotalChunks = TotalChunks;
    this.Size = Size;
    this.HexBuffer = [];
    this.NextIndexHexBuffer = 0;
    this.ByteFile = Buffer.alloc(0);
    this.ActiveRequests = 5;
    this.StopLoading = false;

    this.activeProcesses = [];
    this.DL = new ChiaDataLayer();
    this.Util = new Utils();

}
VideoFile.prototype.isLoaded = function () {
    return this.NextIndexHexBuffer === this.TotalChunks;
}
VideoFile.prototype.percentageLoaded = function () {
    return (this.NextIndexHexBuffer / this.TotalChunks) * 100;
}
VideoFile.prototype.deleteCurrentPlayerTemp = async function () {
    const tempFolderPath = path.join(app.getAppPath(), 'temp', 'CurrentPlayer');
    this.Util.ensureFolderExists(tempFolderPath);

    try {
        const files = await fs.promises.readdir(tempFolderPath);

        for (const file of files) {
            const filePath = path.join(tempFolderPath, file);
            await fs.promises.unlink(filePath);
        }

        console.log('Contenido de la carpeta temp/CurrentPlayer eliminado exitosamente.');
    } catch (error) {
        console.error('Error al eliminar el contenido de la carpeta temp/CurrentPlayer:', error);
    }
};
VideoFile.prototype.loadVideoAsync = async function (_indexstart = 0) {

    if (_indexstart == 0) {
        await this.deleteCurrentPlayerTemp();
        this.ByteFile = Buffer.alloc(0);
        this.HexBuffer = new Array(this.TotalChunks);
        this.NextIndexHexBuffer = _indexstart;
    }
    this.ActiveRequests = 0;

    let MaxRequests = 10;

    let ChunkIndex = _indexstart + 1;
    while (this.NextIndexHexBuffer != this.TotalChunks && !this.StopLoading) {
        if (this.ActiveRequests < MaxRequests) {
            this.getChunkProcess(ChunkIndex);
            ChunkIndex++;
            if (ChunkIndex > this.TotalChunks) {
                ChunkIndex = _indexstart + 1;
            }
        }
        if(this.StopLoading){
            this.cancelAllGetChunks();
        }
        await this.sleep(1000);
    }
    this.cancelAllGetChunks();
};
VideoFile.prototype.processChunks = function () {
    if (this.StopLoading)
        return;
    for (let i = 0; i < this.HexBuffer.length; i++) {
        if (this.NextIndexHexBuffer === i && this.HexBuffer[i] !== undefined) {
            console.log("Chunk processed bytefile " + i + " of " + this.TotalChunks);
            this.addChunkToBytes(this.HexBuffer[i]);
            this.NextIndexHexBuffer++;
            this.HexBuffer[i] = undefined;
        }
    }
}
VideoFile.prototype.addChunkToBytes = function (chunkHex) {
    const partBuffer = Buffer.from(chunkHex, 'hex');
    this.ByteFile = Buffer.concat([this.ByteFile, partBuffer]);
}
VideoFile.prototype.getChunkProcess = function (ChunkIndex) {
    if (this.NextIndexHexBuffer + 1 > ChunkIndex || this.HexBuffer[ChunkIndex - 1] !== undefined)
        return;
    const childProcess = fork(path.join(__dirname, 'getChunkProcess.js'));
    childProcess.send({
        Id: this.Id,
        ChunkIndex,
        TotalChunks: this.TotalChunks,
        AppPath: app.getAppPath()
    });
    this.ActiveRequests++;
    childProcess.on('message', (chunkHex) => {
        this.ActiveRequests--;
        if (chunkHex !== null && !this.StopLoading) {
            console.log("Chunk found " + ChunkIndex + " of " + this.TotalChunks);
            this.HexBuffer[ChunkIndex - 1] = chunkHex;
            this.processChunks();
        }

        // Remover el proceso hijo de la lista de procesos activos
        const index = this.activeProcesses.indexOf(childProcess);
        if (index !== -1) {
            this.activeProcesses.splice(index, 1);
        }

        childProcess.disconnect();
    });

    childProcess.on('error', (error) => {
        this.ActiveRequests--;
        console.error("Error fetching chunk:", error);

        // Remover el proceso hijo de la lista de procesos activos
        const index = this.activeProcesses.indexOf(childProcess);
        if (index !== -1) {
            this.activeProcesses.splice(index, 1);
        }

        childProcess.disconnect();
    });

    // Agregar el proceso hijo a la lista de procesos activos
    this.activeProcesses.push(childProcess);
};
VideoFile.prototype.cancelAllGetChunks = function () {
    for (const childProcess of this.activeProcesses) {
        childProcess.kill();
        childProcess.disconnect();
    }

    this.activeProcesses = []; // Limpiar la lista de procesos activos
    this.ActiveRequests = 0;

};
VideoFile.prototype.cancelGetChunk = function () {
    if (this.childProcess) {
        this.childProcess.kill();
        this.childProcess = null; // Limpiar la referencia al proceso hijo
    }
};
VideoFile.prototype.prepareVideo2Play = async function (IdVideo, TotalChunks,Size) {
    this.Id = IdVideo;
    this.TotalChunks = TotalChunks;
    this.Size = Size;
    this.HexBuffer = [];
    this.NextIndexHexBuffer = 0;
    this.ByteFile = Buffer.alloc(0);
    this.ActiveRequests = 5;
    this.StopLoading = false;

    this.activeProcesses = []
    this.loadVideoAsync();
    return true;
}
VideoFile.prototype.stopPrepareVideo2Play = function () {
    this.StopLoading = true;
    this.ByteFile = Buffer.alloc(0);
    return true;
}
VideoFile.prototype.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
VideoFile.prototype.getChunk = async function (IdVideo, Part, TotalChunks, AppPath = app.getAppPath()) {
    let RootHistory = await this.DL.getRootHistory(IdVideo);
    if (RootHistory.root_history !== undefined && RootHistory.root_history.length - 1 >= Part) {
        let Parameters = {
            "id": IdVideo,
            "key": this.Util.stringToHex(`VideoChunk`),
            "root_hash": RootHistory.root_history[Part].root_hash
        };
        const folderPath = path.join(AppPath, 'temp', "CurrentPlayer");
        this.Util.ensureFolderExists(folderPath);
        const filePath = path.join(folderPath, RootHistory.root_history[Part].root_hash + '_Part' + Part + '_p.json');
        await this.Util.createTempJsonFile(Parameters, filePath, AppPath);
        let Response = await this.DL.getValue(filePath,AppPath);
        if (Response.value !== undefined) {
            Response.value = this.Util.hexToString(Response.value);
            const indexPipe = Response.value.indexOf("|");
            const chunkName = Response.value.substring(0, indexPipe).trim();
            Response.value = Response.value.substring(indexPipe + 1).trim();
            console.log(`Chunk ${Part} ${chunkName} de ${TotalChunks} obtenido`);
            return this.Util.stringToHex(Response.value);
        }
    }
    return null;
}
module.exports = VideoFile;