const ChiaDataLayer = require('./ChiaDataLayer');
const chiaDataLayer = new ChiaDataLayer();
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

    this.activeProcesses = []

}
VideoFile.prototype.IsLoaded = function () {
    console.log(this.ByteFile.length);
    console.log(this.Size);
    return this.NextIndexHexBuffer === this.TotalChunks;
}
VideoFile.prototype.percentageLoaded = function () {
    return (this.NextIndexHexBuffer / this.TotalChunks) * 100;
}
VideoFile.prototype.DeleteCurrentPlayerTemp = async function () {
    const tempFolderPath = path.join(app.getAppPath(), 'temp', 'CurrentPlayer');
    this.ensureFolderExists(tempFolderPath);

    try {
        // Obtener la lista de archivos en la carpeta temp/CurrentPlayer
        const files = await fs.promises.readdir(tempFolderPath);

        // Eliminar cada archivo individualmente
        for (const file of files) {
            const filePath = path.join(tempFolderPath, file);
            await fs.promises.unlink(filePath);
        }

        console.log('Contenido de la carpeta temp/CurrentPlayer eliminado exitosamente.');
    } catch (error) {
        console.error('Error al eliminar el contenido de la carpeta temp/CurrentPlayer:', error);
    }
};
VideoFile.prototype.LoadVideoAsync = async function (_indexstart = 0) {

    if (_indexstart == 0) {
        await this.DeleteCurrentPlayerTemp();
        this.ByteFile = Buffer.alloc(0);
        this.HexBuffer = new Array(this.TotalChunks);
        this.NextIndexHexBuffer = _indexstart;
    }
    this.ActiveRequests = 0;

    let MaxRequests = 10;

    let ChunkIndex = _indexstart + 1;
    while (this.NextIndexHexBuffer != this.TotalChunks && !this.StopLoading) {
        if (this.ActiveRequests < MaxRequests) {
            this.GetChunk(ChunkIndex);
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

VideoFile.prototype.ProcessChunks = function () {
    if (this.StopLoading)
        return;
    for (let i = 0; i < this.HexBuffer.length; i++) {
        if (this.NextIndexHexBuffer === i && this.HexBuffer[i] !== undefined) {
            console.log("Chunk processed bytefile " + i + " of " + this.TotalChunks);
            this.AddChunkToBytes(this.HexBuffer[i]);
            this.NextIndexHexBuffer++;
            this.HexBuffer[i] = undefined;
        }
    }
    // if (this.NextIndexHexBuffer === this.TotalChunks) {
    //     // Guardar el archivo en disco
    //     const filename = 'MrDennisVideo.mp4'; // Nombre del archivo de salida
    //     fs.writeFile(filename, this.ByteFile, (err) => {
    //         if (err) {
    //             console.log('Error al guardar el archivo MP4:', err);
    //         } else {
    //             console.log('Archivo MP4 guardado:', filename);
    //         }
    //     });
    // }


}
VideoFile.prototype.AddChunkToBytes = function (chunkHex) {
    const partBuffer = Buffer.from(chunkHex, 'hex');
    this.ByteFile = Buffer.concat([this.ByteFile, partBuffer]);
}
VideoFile.prototype.GetFirstChunk = async function () {
    this.ByteFile = Buffer.alloc(0);
    this.NextIndexHexBuffer = 0;
    this.HexBuffer = new Array(this.TotalChunks);
    let chunk = await chiaDataLayer.getChunk(this.Id, 1, this.TotalChunks);
    if (chunk !== null) {
        this.HexBuffer[0] = chunk;
        this.ProcessChunks();
        return true;
    }
    return false;
}

VideoFile.prototype.GetChunk = function (ChunkIndex) {
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
            this.ProcessChunks();
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
VideoFile.prototype.prepareVideo = async function (IdVideo, TotalChunks,Size) {
    this.Id = IdVideo;
    this.TotalChunks = TotalChunks;
    this.Size = Size;
    this.HexBuffer = [];
    this.NextIndexHexBuffer = 0;
    this.ByteFile = Buffer.alloc(0);
    this.ActiveRequests = 5;
    this.StopLoading = false;

    this.activeProcesses = []
    this.LoadVideoAsync();
    return true;
}
VideoFile.prototype.stopPrepareVideo = function () {
    this.StopLoading = true;
    this.ByteFile = Buffer.alloc(0);
    return true;
}
VideoFile.prototype.ensureFolderExists = function (folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, {
            recursive: true
        });
        console.log(`Temp created: ${folderPath}`);
    }
}
VideoFile.prototype.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports = VideoFile;