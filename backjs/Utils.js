const fs = require('fs');
const path = require('path');
const {
    app,
    dialog
} = require('electron');

function Utils() {

}
Utils.prototype.hexToString = function (hex) {
    var string = '';
    for (var i = 0; i < hex.length; i += 2) {
        var byte = parseInt(hex.substr(i, 2), 16);
        string += String.fromCharCode(byte);
    }
    return string;
};
Utils.prototype.uId = function () {
    let uuid = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 6;

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uuid += characters.charAt(randomIndex);
    }

    return uuid;
}
Utils.prototype.createTempJsonFile = async function (Content, FilePath = null, AppPath = app.getAppPath()) {
    const folderPath = path.join(AppPath, 'temp');
    this.ensureFolderExists(folderPath);
    const filePath = FilePath == null ? path.join(folderPath, "Params_" + this.uId() + '.json') : FilePath;
    Content = typeof Content === 'object' ? JSON.stringify(Content, null, 2) : Content;
    fs.writeFileSync(filePath, Content);
    return filePath;
}

Utils.prototype.ensureFolderExists = function (folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, {
            recursive: true
        });
        console.log(`Temp created: ${folderPath}`);
    }
}
Utils.prototype.stringToHex = function (text) {
    var hexString = "";

    for (var i = 0; i < text.length; i++) {
        var hex = text.charCodeAt(i).toString(16);
        hexString += (hex.length === 2 ? hex : "0" + hex);
    }

    return hexString;
};
Utils.prototype.hexToBase64 = function (hexString) {
    try {
        let base64String = Buffer.from(hexString, 'hex').toString('base64')
        if (!base64String.startsWith("data:")) {
            base64String = "data:image/png;base64," + base64String;
        }
        return base64String;
    } catch (error) {
        this.log("Error converting hexadecimal to base64:" + error);
        return null;
    }
};
Utils.prototype.openFile = async function ( title, extensions) {
    const options = {
        filters: [{
            name: title,
            extensions: [extensions]
        }]
    };

    const {
        canceled,
        filePaths
    } = await dialog.showOpenDialog(options);
    if (!canceled && filePaths.length > 0) {
        return filePaths[0];
    }
    return null;
}
module.exports = Utils;