const path = require('path');
const fs = require('fs');
const {
    nativeImage,
    app
} = require('electron');
const ChiaDataLayer = require('./ChiaDataLayer');
const Utils = require('./Utils');
const sqlite3 = require('sqlite3').verbose();

function Video() {
    this.DL = new ChiaDataLayer();
    this.Util = new Utils();
    this.ChunkSizeMB = 2; //in MB
    this.ChunkSize = this.ChunkSizeMB * 1024 * 1024; //in bytes
    this.Size = 0;
    this.TotalChunks = 0;
    this.DB = null;
}
Video.prototype.dbConnect = async function () {
    let DBPath = path.join(app.getAppPath(), "db", 'database.db');
    if (!this.DB || !this.DB.open) {
        this.DB = new sqlite3.Database(DBPath);
    }
}
Video.prototype.dbDisconnect = async function () {
    if (this.DB && this.DB.open) {
        this.DB.close();
        this.DB = null;
    }
}
Video.prototype.createVideoStore = async function (VideoData) {
    try {
        let Response = await this.DL.createStore(VideoData.Fee);
        if (Response.success !== undefined && Response.success === false || (Response.status !== undefined && Response.status === "error")) {
            return {
                status: "error",
                message: Response.message
            };
        }
        VideoData.Id = Response.id;
        let IsPending = await this.setPending(VideoData);
        if (!IsPending) {
            return {
                status: "error",
                message: "Error creating video pending"
            };
        }
        Response.Video = VideoData;
        Response.Video.Type = "VideoInsert";
        return Response;
    } catch (ex) {
        return {
            status: "error",
            message: ex.message
        };
    }
}
Video.prototype.setPendingCustomMirror = async function (MrrorData) {
    this.dbConnect();
    const videoPendingInsert = `INSERT INTO Pending (Id, Type, Data) VALUES (?, ?, ?)`;
    const videoPendingValues = [MrrorData.Id, "AddCustomMirror", JSON.stringify(MrrorData)];
    return new Promise((resolve, reject) => {
        this.DB.run(videoPendingInsert, videoPendingValues, (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
            this.dbDisconnect();
        });
    });
}
Video.prototype.setPendingSubscription = async function (Video) {
    this.dbConnect();
    const videoPendingInsert = `INSERT INTO Pending (Id, Type, Data) VALUES (?, ?, ?)`;
    const videoPendingValues = [Video.Id, "VideoSubscription", JSON.stringify(Video)];
    return new Promise((resolve, reject) => {
        this.DB.run(videoPendingInsert, videoPendingValues, (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
            this.dbDisconnect();
        });
    });
}
Video.prototype.setPendingDeleteMirror = async function (CoinId, IdStore) {
    this.dbConnect();
    let PendingData = {
        Id: CoinId,
        IdStore: IdStore,
        Name: "Removing Mirror",
        Type: "DeleteMirror",
    }
    const videoPendingInsert = `INSERT INTO Pending (Id, Type, Data) VALUES (?, ?, ?)`;
    const videoPendingValues = [CoinId, "DeleteMirror", JSON.stringify(PendingData)];
    return new Promise((resolve, reject) => {
        this.DB.run(videoPendingInsert, videoPendingValues, (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
            this.dbDisconnect();
        });
    });
}
Video.prototype.setPending = async function (Video) {
    this.dbConnect();
    Video.Size = await this.getFileSize(Video.VideoPath);
    Video.SizeMB = Video.Size / 1024 / 1024;
    Video.TotalChunks = Math.ceil(Video.Size / this.ChunkSize);
    Video.ChunkSizeMB = this.ChunkSizeMB;
    Video.ChunkSize = this.ChunkSize;
    const videoPendingInsert = `INSERT INTO Pending (Id, Type, Data) VALUES (?, ?, ?)`;
    const videoPendingValues = [Video.Id, "VideoInsert", JSON.stringify(Video)];
    return new Promise((resolve, reject) => {
        this.DB.run(videoPendingInsert, videoPendingValues, (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true); // Resuelve la promesa con true si la inserción fue exitosa
            }
            this.dbDisconnect();
        });
    });
};
Video.prototype.deleteFromDbById = async function (Id) {
    this.dbConnect();
    const deleteQuery = 'DELETE FROM Video WHERE Id = ?';
    const deleteValues = [Id];
    return new Promise((resolve, reject) => {
        this.DB.run(deleteQuery, deleteValues, (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
            this.dbDisconnect();
        });
    });
};
Video.prototype.saveDbLocal = async function (Video) {
    this.dbConnect();
    const videoPendingInsert = `INSERT INTO Video (Id, Name, IdChanel, Image, ChunkSize, Size, TotalChunks,VideoPath,Fee) VALUES (?, ?, ?, ?, ?, ?, ?,?,?)`;
    const videoPendingValues = [Video.Id, Video.Name, Video.IdChanel, Video.Image, Video.ChunkSize, Video.Size, Video.TotalChunks, Video.VideoPath, Video.Fee];
    return new Promise((resolve, reject) => {
        this.DB.run(videoPendingInsert, videoPendingValues, (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
            this.dbDisconnect();
        });
    });
};
Video.prototype.getPending = function () {
    let Response = {};
    this.dbConnect();
    return new Promise((resolve, reject) => {
        try {
            const sql = 'SELECT * FROM Pending  ';
            this.DB.all(sql, (err, rows) => {
                if (err) {
                    console.error('Error getting Pending records:', err);
                    Response.status = "error";
                    Response.message = err.message;
                    reject(Response);
                    return;
                }
                Response.status = "success";
                Response.Videos = this.parsePending(rows);
                Response.message = "Success";
                resolve(Response);
            });
            this.dbDisconnect();
        } catch (ex) {
            console.log(ex);
            Response.status = "success";
            Response.Videos = [];
            Response.message = ex.message;
            resolve(Response);
        }
    });
};
Video.prototype.parsePending = function (rows) {
    let Videos = [];
    rows.forEach((row) => {
        let Video = JSON.parse(row.Data);
        Video.Type = row.Type;
        Videos.push(Video);
    });
    return Videos;
}
Video.prototype.countRows = async function () {
    this.dbConnect();
    return new Promise((resolve, reject) => {
        try {
            const sql = 'SELECT COUNT(*) as Cantidad FROM Video';

            this.DB.all(sql, (err, rows) => {
                if (err) {
                    console.error('Error al obtener los registros de la tabla VideoPending:', err);

                    reject(0);
                    return;
                }
                resolve(rows[0].Cantidad);
            });
            this.dbDisconnect();
        } catch (ex) {
            console.log(ex);
            resolve(0);
            return;
        }
    });
}
Video.prototype.getInfo = async function (IdStore) {
    let KeyIdStore = this.Util.stringToHex("VideoDetails");
    let Parameters = {
        "id": IdStore,
        "key": KeyIdStore
    };
    const filePath = await this.Util.createTempJsonFile(Parameters);
    let OutputCmddata = await this.DL.getValue(filePath);
    if (OutputCmddata.status !== undefined && OutputCmddata.status === "error")
        return null;
    let Video = JSON.parse(this.Util.hexToString(OutputCmddata.value));
    Video.Image = this.Util.hexToBase64(Video.Image);
    return Video;
}
Video.prototype.unsubscribe = async function (IdStore) {
    let Response = await this.DL.unsubscribe(IdStore);
    if (Response.success === undefined || Response.success === false) {
        return {
            status: "error",
            message: "Error unsubscribing"
        };
    }
    this.deleteOurMirrors(IdStore);

    this.deleteFromDbById(IdStore);
    return {
        status: "success",
        message: "Unsubscribed"
    };
}
Video.prototype.deleteMirror = async function (CoinId, IdStore) {
    let Response = await this.DL.deleteMirror(CoinId);
    if (Response.success === undefined || Response.success === true) {
        this.setPendingDeleteMirror(CoinId, IdStore);
    }
    return Response;
}
Video.prototype.deleteOurMirrors = async function (IdStore) {
    let ResponseMirror = await this.DL.getMirrors(IdStore);
    if (ResponseMirror.mirrors !== undefined && ResponseMirror.mirrors.length > 0) {
        for (let i = 0; i < ResponseMirror.mirrors.length; i++) {
            if (ResponseMirror.mirrors[i].ours === true) {
                this.DL.deleteMirror(ResponseMirror.mirrors[i].coin_id);
            }
        }
    }
}
Video.prototype.getOurMirrorsCoinsId = function () {
    const mirrors = this.mirrors; // Supongamos que `mirrors` es una propiedad existente en el objeto `Video`
    if (!mirrors) {
        return [];
    }

    const coinsId = [];
    for (let i = 0; i < mirrors.length; i++) {
        if (mirrors[i].ours === true) {
            coinsId.push(mirrors[i].coin_id);
        }
    }

    return coinsId;
}
Video.prototype.subscribe = async function (Video) {
    let isAlreadySubscribed = await this.isAlreadySubscribed(Video.Id);
    if (isAlreadySubscribed) {
        return {
            status: "error",
            message: "Already subscribed"
        };
    }
    let Response = await this.DL.subscribe(Video.Id);
    Video.Fee = 0; //prevent cost on subscribe
    if (Response.success === undefined || Response.success === false) {
        return {
            status: "error",
            message: "Cant subscribe to video, check ID"
        };
    }
    this.setPendingSubscription(Video);
    return {
        status: "success",
        message: "subscribe"
    };
}
Video.prototype.isAlreadySubscribed = async function (IdStore) {
    this.dbConnect();
    return new Promise((resolve, reject) => {
        try {
            const sql = 'SELECT * FROM Video WHERE Id = ?';
            const values = [IdStore];
            this.DB.get(sql, values, (err, row) => {
                if (err) {
                    console.error('Error getting Pending records:', err);
                    resolve(false);
                    return;
                }
                if (row === undefined)
                    resolve(false);
                else
                    resolve(true);
            })

            this.dbDisconnect();
        } catch (ex) {
            console.log(ex);
            resolve(false);
        }
    });
}
Video.prototype.isVideoStore = async function (IdStore) {
    let OutPutKeys = await this.DL.getKeys(IdStore);
    if (OutPutKeys === null || OutPutKeys.keys === undefined)
        return false;
    for (let i = 0; i < OutPutKeys.keys.length; i++) {
        let KeyString = this.Util.hexToString(OutPutKeys.keys[i].replace("0x", ""));
        KeyString = KeyString.trim();
        if (KeyString.startsWith("IsChanel")) {
            return false;
        }
        if (KeyString.startsWith("VideoDetails")) {
            return true;
        }
    }
    return false;
}
Video.prototype.getFromChain = async function () {
    let Videos = [];
    let OutputCmd = await this.DL.getSubscriptions();
    if (OutputCmd.store_ids !== undefined) {
        for (let i = 0; i < OutputCmd.store_ids.length; i++) {
            let isVideo = await this.isVideoStore(OutputCmd.store_ids[i]);
            if (isVideo === false)
                continue;
            let video = await this.getInfo(OutputCmd.store_ids[i]);
            if (video === null)
                continue;
            await this.saveDbLocal(video);
        }
    }
    return Videos;
}
Video.prototype.confirmDeleteMirror = async function (CoinId, IdStore) {
    let RMirrors = await this.DL.getMirrors(IdStore);
    if (RMirrors.success === "false" || RMirrors.mirrors === undefined) {
        return {
            status: "error",
            message: "Error getting mirrors"
        }
    }
    if (RMirrors.mirrors.length == 0) {
        return {
            status: "success",
            message: "Mirror deleted"
        }
    }
    let IsCoinIdPresent = await this.isCoinIdPresent(CoinId, RMirrors.mirrors);
    if (IsCoinIdPresent === false) {
        return {
            status: "success",
            message: "Mirror deleted"
        }
    }
    return {
        status: "error",
        message: "Mirror not deleted"
    }

}
Video.prototype.isCoinIdPresent = function (CoinId, Mirrors) {
    for (let i = 0; i < Mirrors.length; i++) {
        if (Mirrors[i].coin_id === CoinId) {
            return true;
        }
    }
    return false;
}
Video.prototype.confirmSubscription = async function (IdStore) {
    let IsVideoStore = await this.isVideoStore(IdStore);
    let Mirrors = await this.DL.getMirrors(IdStore);
    let CantMirrors = Mirrors.mirrors.length !== undefined ? Mirrors.mirrors.length : 0;
    if (IsVideoStore === false)
        return {
            status: "error",
            message: `Not a video store (${CantMirrors} mirrors)})`
        };
    let Video = await this.getInfo(IdStore);
    if (Video === null)
        return {
            status: "error",
            message: "Error getting video info"
        };
    this.saveDbLocal(Video);
    Video.Fee = 0; //prevent cost on mirror
    await this.addMirror(Video);
    return {
        status: "success",
        message: "Success",
        Video: Video
    };

}
Video.prototype.get = async function (FromChain = false) {
    let Response = {};
    let countRows = await this.countRows();
    if (FromChain || countRows === 0) {
        await this.getFromChain();
    }
    this.dbConnect();
    return new Promise((resolve, reject) => {
        try {
            const sql = 'SELECT * FROM Video';
            this.DB.all(sql, (err, rows) => {
                if (err) {
                    console.error('Error al obtener los registros de la tabla Video:', err);
                    Response.status = "error";
                    Response.Videos = [];
                    Response.message = err.message;
                    reject(Response);
                    return;
                }
                Response.status = "success";
                Response.Videos = rows;
                Response.message = "Success";
                resolve(Response);
            });
            this.dbDisconnect();
        } catch (ex) {
            console.log(ex);
            Response.status = "success";
            Response.Videos = [];
            Response.message = ex.message;
            resolve(Response);
        }
        this.dbConnect();
    });
};
Video.prototype.getMirrors = async function (IdStore) {
    let Mirrors = await this.DL.getMirrors(IdStore);
    return Mirrors;
}
Video.prototype.addCustomMirror = async function (MirrorData) {
    const response = await this.DL.getMirrors(Video.Id);
    const isMirror = this.checkIfMirror(response.mirrors, MirrorData.Mirror);
    if (isMirror) {
        return {
            status: "success",
            message: "Mirror already added",
        }
    }
    let Response = await this.DL.addMirror(MirrorData.IdStore, MirrorData.Mirror, MirrorData.Fee);
    if (Response.success === undefined || Response.success === false) {
        return {
            status: "error",
            message: "Error adding mirror",
            DLResponse: Response,
        };
    }
    this.setPendingCustomMirror(MirrorData);
    return {
        status: "success",
        message: "Mirror added",
    };

}
Video.prototype.addMirror = async function (Video) {
    const response = await this.DL.getMirrors(Video.Id);
    const publicIP = await this.Util.getPublicIP();
    if (!publicIP) {
        return {
            status: "error",
            message: "Error getting public IP",
            PublicIP: publicIP
        };
    }
    const isMirror = this.checkIfMirror(response.mirrors, publicIP);
    if (isMirror) {
        return {
            status: "success",
            message: "Mirror already added",
        }
    }

    let Response = await this.DL.addMirror(Video.Id, `http://${publicIP}:8575`, Video.Fee);
    if (Response.success === undefined || Response.success === false) {
        return {
            status: "error",
            message: "Error adding mirror",
            DLResponse: Response,
            PublicIP: publicIP
        };
    }
    return {
        status: "success",
        message: "Mirror added",
        PublicIP: publicIP
    };
}
Video.prototype.confirmMirror = async function (IdVideo,Mirror = null) {
    try {
        const response = await this.DL.getMirrors(IdVideo);
        const publicIP = Mirror == null ? await this.Util.getPublicIP():this.Util.getIPFromURL(Mirror);
        if (!publicIP && Mirror == null) {
            return {
                status: "error",
                message: "Error getting public IP",
                PublicIP: publicIP
            };
        }
        Mirror = Mirror == null ? `http://${publicIP}:8575`:Mirror;
        const isMirror = this.checkIfMirror(response.mirrors, Mirror);
        if (!isMirror) {
            return {
                status: "error",
                message: "Mirror not found",
                PublicIP: publicIP
            };
        }
        return {
            status: "success",
            message: "Mirror found",
            PublicIP: publicIP
        };
    } catch (error) {
        return {
            status: "error",
            message: error.message
        };
    }
}
Video.prototype.getCoinIdMirror = async function (Mirrors) {
    try {
        const publicIP = await this.Util.getPublicIP();
        if (!publicIP) {
            return null;
        }

        const mirrors = Mirrors;
        if (!mirrors) {
            return null;
        }

        for (let i = 0; i < mirrors.length; i++) {
            const urls = mirrors[i].urls;
            if (urls && urls.includes(`http://${publicIP}:8575`)) {
                return mirrors[i].coin_id;
            }
        }

        return null;
    } catch (error) {
        console.error('Error al obtener el Coin ID del espejo:', error);
        return null;
    }
}
Video.prototype.checkIfMirror = function (mirrors, Mirror) {
    if (!mirrors) {
        return false;
    }
    for (let i = 0; i < mirrors.length; i++) {
        const urls = mirrors[i].urls;
        if (urls && urls.includes(`${Mirror}`)) {
            return true;
        }
    }
    return false;
}
Video.prototype.deletePending = function (Id) {
    let Response = {};
    return new Promise((resolve, reject) => {
        this.dbConnect();
        const sql = 'DELETE FROM Pending WHERE Id = ?';
        this.DB.run(sql, Id, (err) => {
            if (err) {
                console.error('Error on deleting Pending:', err);
                Response.status = "error";
                Response.message = err.message;
                reject(Response);
                return;
            }
            Response.status = "success";
            Response.message = "Success";
            resolve(Response);
        });
        this.dbDisconnect();
    });
}
Video.prototype.insertChunk = async function (Video) {
    return new Promise(async (resolve, reject) => {
        try {
            let Response = {};
            const totalChunks = Video.TotalChunks;
            let Output = await this.DL.getRootHistory(Video.Id);
            if (Output.success !== undefined && Output.success === false) {
                Response = {
                    IsCompleted: false,
                    message: Output.error,
                    status: "error"
                }
                resolve(Response);
                return;
            }
            if (Output.root_history.length === undefined || Output.root_history.length === 0) {
                Response = {
                    IsCompleted: false,
                    message: "No History Found",
                    status: "error"
                }
                resolve(Response);
                return;
            }
            let Index2Continue = Output.root_history.length - 1;
            var temTimestampZero = Output.root_history.some(function (element) {
                return element.timestamp === 0;
            });
            if (temTimestampZero) {
                Response = {
                    IsCompleted: false,
                    message: Index2Continue == totalChunks ? "Validating last transaction" : `${Index2Continue} / ${totalChunks} processed`,
                    status: "success"
                }
                resolve(Response);
                return;
            }
            await this.deteleChunkTempFiles(Video);
            if (Index2Continue === totalChunks && temTimestampZero === false) {
                await this.saveDbLocal(Video);
                Response = {
                    IsCompleted: true,
                    message: "Video Completed",
                    status: "success"
                }
                resolve(Response);
                return;
            }
            const filePath = await this.createJsonChunkParam(Video, Index2Continue);

            let OutputCmd = await this.DL.batchUpdate(filePath);
            if (OutputCmd.success === true) {
                console.log(`Chunk ${Index2Continue + 1} de ${totalChunks} processed`);
                Response = {
                    IsCompleted: false,
                    message: Index2Continue + 1 == totalChunks ? "Validating last transaction" : `${Index2Continue + 1} / ${totalChunks} processed`,
                    status: "success"
                }
            } else {
                Response = {
                    IsCompleted: false,
                    message: `${Index2Continue} / ${totalChunks} processed`,
                    status: "success"
                }
            }

            resolve(Response);
            return;

        } catch (error) {
            console.log(`Error al generar el archivo JSON: ${error}`);
            let Response = {
                IsCompleted: false,
                message: error.message,
                status: "error"
            }
            resolve(Response);
        }
    });
}
Video.prototype.createJsonChunkParam = async function (Video, Index2Continue) {
    const directoryPath = path.join(app.getAppPath(), 'temp', "Chunk");
    this.Util.ensureFolderExists(directoryPath);
    const filePath = path.join(directoryPath, `VideoFile${Video.Id}_Part_${Index2Continue + 1}.json`);
    const changelist = [];
    if (Index2Continue === 0) {
        const VideoDetails = await this.prepareDetails(Video);
        const KeyIdStore = this.Util.stringToHex("VideoDetails");
        const objectDetailData = {
            "action": "insert",
            "key": KeyIdStore,
            "value": this.Util.stringToHex(JSON.stringify(VideoDetails))
        };
        changelist.push(objectDetailData);
    }
    const objectDelete = {
        action: 'delete',
        key: this.Util.stringToHex(`VideoChunk`)
    };
    changelist.push(objectDelete);
    const objectInsert = {
        action: 'insert',
        key: this.Util.stringToHex(`VideoChunk`),
        value: this.Util.stringToHex(`Part_${Index2Continue + 1}|`) + this.getChunkData(Video, Index2Continue).toString('hex'),
    };
    changelist.push(objectInsert);
    const jsonData = `{
        "id": "${Video.Id}",
        "fee": "${Video.Fee}",
        "changelist": ${JSON.stringify(changelist, null, 2)}
    }`;
    return this.Util.createTempJsonFile(jsonData, filePath);
}
Video.prototype.processImage = async function (FilePath) {
    const img = nativeImage.createFromPath(FilePath);
    const anchoOriginal = img.getSize().width;
    const altoOriginal = img.getSize().height;
    if (anchoOriginal > 100 && FilePath.toLowerCase().endsWith('.jpg')) {
        const ratio = 100 / anchoOriginal;
        const anchoRedimensionado = 100;
        const altoRedimensionado = Math.round(altoOriginal * ratio);
        const imagenRedimensionada = img.resize({
            width: anchoRedimensionado,
            height: altoRedimensionado
        });
        const imagenBase64 = imagenRedimensionada.toDataURL();
        return imagenBase64;
    } else {
        const imagenBase64 = img.toDataURL();
        return imagenBase64;
    }
};
Video.prototype.getChunkData = function (Video, chunkIndex) {
    const fileDescriptor = fs.openSync(Video.VideoPath, 'r');
    const buffer = Buffer.alloc(Video.ChunkSize);
    const bytesRead = fs.readSync(fileDescriptor, buffer, 0, Video.ChunkSize, chunkIndex * Video.ChunkSize);
    fs.closeSync(fileDescriptor);
    return buffer.slice(0, bytesRead);
}
Video.prototype.prepareDetails = async function (Video) {
    let Image = await this.processImage(Video.Image);
    Image = this.Util.base64ToHex(Image);
    let VideoDetails = Object.assign({}, Video);
    VideoDetails.Image = Image;
    VideoDetails.VideoPath = "----";
    return VideoDetails;
}
Video.prototype.deteleChunkTempFiles = async function (Video) {
    const directoryPath = path.join(app.getAppPath(), 'temp', 'Chunk');
    try {
        const files = fs.readdirSync(directoryPath);
        const matchedFiles = files.filter(file => file.startsWith(`VideoFile${Video.Id}_Part_`) && file.endsWith('.json'));
        matchedFiles.forEach(file => {
            const filePath = path.join(directoryPath, file);
            try {
                fs.unlinkSync(filePath);
                console.log('Archivo eliminado:', filePath);
            } catch (error) {
                console.error('Error al eliminar el archivo:', filePath, error);
            }
        });
    } catch (error) {
        console.error('Error al leer el directorio:', error);
    }
};
Video.prototype.calculateNumberOfChunks = function (fileSizeMB, chunkSizeMB) {
    return Math.ceil(fileSizeMB / chunkSizeMB);
}
Video.prototype.getFileSize = async function (filePath) {
    const stats = fs.statSync(filePath);
    return stats.size;
}
module.exports = Video;