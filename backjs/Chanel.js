const path = require('path');
const fs = require('fs');
const {
    nativeImage,
    app
} = require('electron');
const ChiaDataLayer = require('./ChiaDataLayer');
const Video = require('./Video');
const sqlite3 = require('sqlite3').verbose();
function Chanel(){
    this.Video = new Video();
    this.DL = new ChiaDataLayer();
}

Chanel.prototype.insertVideoDetails = async function (Video) {
    const VideoDetails = await this.Video.getVideoDetails(Video);
    const KeyIdStore = this.stringToHex("Video" + Video.Id);

    const changelist = [{
        action: "insert",
        key: KeyIdStore,
        value: this.stringToHex(JSON.stringify(VideoDetails))
    }];

    const Jsonobject = {
        id: Video.IdChanel,
        fee: "0",
        changelist: changelist
    };

    const folderPath = path.join(app.getAppPath(), 'temp', "Insert");
    const filePath = path.join(folderPath, `insert_${Video.Id}_${this.uId()}.json`);
    this.ensureFolderExists(folderPath);

    const jsonData = JSON.stringify(Jsonobject, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');

    const OutputCmd = await this.DL.batchUpdate(filePath);
    return OutputCmd;
};
module.exports = Chanel;
