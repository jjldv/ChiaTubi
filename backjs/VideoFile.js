const ChiaDataLayer = require('./ChiaDataLayer');
const chiaDataLayer = new ChiaDataLayer();
const fs = require('fs');
const path = require('path');
const {
    nativeImage,
    app
} = require('electron');

function VideoFile(IdVideo, TotalChunks, Size) {
    this.Id = IdVideo;
    this.TotalChunks = TotalChunks;
    this.Size = Size;
    this.SizeInBytes = this.Size * 1024 * 1024;
    this.HexBuffer = [];
    this.NextIndexHexBuffer = 0;
    this.ByteFile = Buffer.alloc(0);
    this.ActiveRequests = 5;
    this.StopLoading = false;

    this.currentTime = 0;
}
VideoFile.prototype.IsLoaded = function () {
    return this.NextIndexHexBuffer === this.TotalChunks;
}
VideoFile.prototype.percentageLoaded = function () {
    return (this.NextIndexHexBuffer / this.TotalChunks) * 100;
}
VideoFile.prototype.DeleteCurrentPlayerTemp = async function () {
    const tempFolderPath = path.join(app.getAppPath(), 'temp', 'CurrentPlayer');

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
        this.ByteFile = Buffer.alloc(0);
        this.HexBuffer = new Array(this.TotalChunks);
        this.NextIndexHexBuffer = _indexstart;
        await this.DeleteCurrentPlayerTemp();
    }
    this.ActiveRequests = 0;

    let MaxRequests = 5;

    let ChunkIndex = _indexstart + 1;
    while (this.NextIndexHexBuffer != this.TotalChunks && !this.StopLoading) {
        if (this.ActiveRequests < MaxRequests) {
            this.GetChunk(ChunkIndex);
            ChunkIndex++;
            if (ChunkIndex > this.TotalChunks) {
                ChunkIndex = _indexstart + 1;
            }
        }
        await this.sleep(1000);
    }
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
    this.ActiveRequests++;
    chiaDataLayer.getChunk(this.Id, ChunkIndex, this.TotalChunks).then((chunkHex) => {
        this.ActiveRequests--;
        if (chunkHex !== null && !this.StopLoading) {
            console.log("Chunk found " + ChunkIndex + " of " + this.TotalChunks);
            this.HexBuffer[ChunkIndex - 1] = chunkHex;
            this.ProcessChunks();
        }

    });
}
VideoFile.prototype.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports = VideoFile;