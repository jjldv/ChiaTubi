const fs = require('fs');
const path = require('path');
const {
    app,
    dialog
} = require('electron');
const Base64 = require('js-base64').Base64;

function Utils() {

}
Utils.prototype.deleteTempFiles = function (AppPath = app.getAppPath()) {
    const folderPath = path.join(AppPath, 'temp');
    if (fs.existsSync(folderPath)) {
        fs.readdir(folderPath, (err, files) => {
            if (err) throw err;
            for (const file of files) {
                if (file.startsWith('Params') || file.startsWith('get_value')) {
                    fs.unlink(path.join(folderPath, file), err => {
                        if (err) throw err;
                    });
                }
            }
        });
    }
}
Utils.prototype.base64ToHex = function (base64String) {
    var base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    var bytes = Uint8Array.from(Base64.atob(base64Data), function (c) {
        return c.charCodeAt(0);
    });
    var hexString = Array.from(bytes).map(function (byte) {
        return ('0' + byte.toString(16)).slice(-2);
    }).join('');
    return hexString;
};
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
Utils.prototype.openFile = async function (title, extensions) {
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
Utils.prototype.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
Utils.prototype.getPublicIP = async function () {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const publicIP = data.ip;
        return publicIP;
    } catch (error) {
        return null;
    }
}
module.exports = Utils;