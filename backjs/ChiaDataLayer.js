const fs = require('fs');
const path = require('path');
const Utils = require('./Utils');
const {
    exec
} = require('child_process');
const {
    app
} = require('electron');
const execSync = require('sync-exec');
const sqlite3 = require('sqlite3').verbose();
function ChiaDatalayer() {
    this.logEnabled = true;
    this.Util = new Utils();
}
ChiaDatalayer.prototype.unsubscribe = async function (Id) {
    let OutputCmd = await this.runCommand(`chia rpc data_layer unsubscribe "{\\"id\\":\\"${Id}\\"}"`);
    if (OutputCmd.success !== undefined && OutputCmd.success === true) {
        this.removeStoreFiles(Id);
    }
    return OutputCmd;
}
ChiaDatalayer.prototype.subscribe = async function (Id) {
    let OutputCmd = await this.runCommand(`chia rpc data_layer subscribe  "{\\"id\\":\\"${Id}\\"}"`);
    return OutputCmd;
}
ChiaDatalayer.prototype.removeStoreFiles = function (Id) {
    const chiaDataPath = path.join(process.env.USERPROFILE, '.chia', 'mainnet', 'data_layer', 'db', 'server_files_location_mainnet');

    if (fs.existsSync(chiaDataPath)) {
        try {
            const files = fs.readdirSync(chiaDataPath);

            files.forEach(file => {
                if (file.includes(Id)) {
                    const filePath = path.join(chiaDataPath, file);

                    fs.unlinkSync(filePath);
                    console.log(`Archivo ${filePath} eliminado.`);
                }
            });
        } catch (err) {
            console.error(`Error al leer o eliminar archivos en ${chiaDataPath}: ${err}`);
        }
    } else {
        console.error(`La ruta ${chiaDataPath} no existe.`);
    }
}
ChiaDatalayer.prototype.runCommand = async function (command) {
    const chiaPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'Chia', 'resources', 'app.asar.unpacked', 'daemon');
    this.log(command);
    return new Promise((resolve, reject) => {
        exec(`${chiaPath}\\${command}`, (error, stdout, stderr) => {
            if (error) {
                error.message = this.parseOutput(error.message);
                resolve(error.message);
                return;
            }
            stdout = this.parseOutput(stdout);
            resolve(stdout);
        });
    });
}
ChiaDatalayer.prototype.createStore = async function (fee = 0) {
    let OutputCmd = await this.runCommand(`chia rpc data_layer create_data_store "{\\"fee\\":\\"${fee}\\"}"`);
    return OutputCmd;
}
ChiaDatalayer.prototype.isStoreConfirmed = async function (Id) {
    let OutputCmd = await this.runCommand("chia data get_root --id " + Id);
    return OutputCmd;
}
ChiaDatalayer.prototype.isKeyConfirmed = async function (Id, key) {
    let KeyHex = this.Util.stringToHex(key);
    let OutputCmd = await this.runCommand("chia data get_value --id " + Id + " --key " + KeyHex);
    return OutputCmd;
}
ChiaDatalayer.prototype.batchUpdate = async function (filePath) {
    return new Promise(async (resolve, reject) => {
        try {
            let Output = await this.runCommand(`chia rpc data_layer batch_update  -j ${filePath}`);
            resolve(Output); // Resuelve la promesa con el nombre del archivo generado
        } catch (error) {
            reject(null); // Rechaza la promesa con el error
        }
    });
}
ChiaDatalayer.prototype.getSubscriptions = async function () {
    return new Promise(async (resolve, reject) => {
        try {
            let Output = await this.runCommand(`chia data get_subscriptions`);
            resolve(Output); 
        } catch (error) {
            reject([]); 
        }
    });
}
ChiaDatalayer.prototype.getRootHistory = async function (Id) {
    let Output = await this.runCommand(`chia data get_root_history --id ${Id}`);
    return Output;
}
ChiaDatalayer.prototype.getKeys = async function (Id) {
    let Output = await this.runCommand(`chia data get_keys --id ${Id}`);
    return Output;
}
ChiaDatalayer.prototype.parseOutput = function (output) {
    try {
        console.log(output);
        if (output == "") {
            return {}
        }
        if (output.includes("Cannot connect to host") || output.includes("Check if data layer rpc is running")) {
            return {
                status: "error",
                message: "Cannot connect to DataLayer"
            }
        }
        output = output.replace(/'/g, '"');
        output = output.replace(/'/g, '"');
        output = output.replace(/True/gi, "true")
        output = output.replace(/False/gi, "false")
        output = output.replace(/None/gi, '"None"')
        //this.log(output);
        let regex = /ValueError:/;
        if (regex.test(output)) {
            var errorIndex = output.indexOf("ValueError: ");
            output = output.substring(errorIndex + "ValueError: ".length);
        }
        regex = /Request failed:/;
        if (regex.test(output)) {
            var errorIndex = output.indexOf("Request failed: ");
            output = output.substring(errorIndex + "Request failed: ".length);
        }
        if (!this.isValidJSON(output)) {
            output = {
                status: "error",
                message: output
            }
            return output;
        }
        output = JSON.parse(output);
        return output;
    } catch (error) {
        this.log(error);
        return {
            status: "error",
            message: error.message
        }
    }
}
ChiaDatalayer.prototype.isValidJSON = function (jsonString) {
    try {
        JSON.parse(jsonString);
        return true;
    } catch (error) {
        return false;
    }
}
ChiaDatalayer.prototype.addMirror = async function (IdStore, Url,Fee, Amount = 0) {

    let Data = {
        id: IdStore,
        fee: Fee,
        urls: [Url],
        amount: Amount
    }
    let FileParams = await this.Util.createTempJsonFile(Data);

    let Response = await this.runCommand(`chia rpc data_layer add_mirror -j ${FileParams}`);
    fs.unlinkSync(FileParams);
    return Response;
}
ChiaDatalayer.prototype.deleteMirror = async function (CoinId) {
    let Data = {
        coin_id: CoinId,
        fee: 0,//preventing spend chia
    }
    let FileParams = await this.Util.createTempJsonFile(Data);
    let Response = await this.runCommand(`chia rpc data_layer delete_mirror -j ${FileParams}`);
    fs.unlinkSync(FileParams);
    return Response;
    
}
ChiaDatalayer.prototype.getMirrors = async function (IdStore) {
    let Data = {
        id: IdStore
    }
    let FileParams = await this.Util.createTempJsonFile(Data);
    let Response = await this.runCommand(`chia rpc data_layer get_mirrors -j ${FileParams}`);
    fs.unlinkSync(FileParams);
    return Response;

}
ChiaDatalayer.prototype.getValue = async function (FileParams,AppPath = app.getAppPath()) {
    try{
        const folderPath = path.join(AppPath, 'temp');
        this.Util.ensureFolderExists(folderPath);
        const filePathOut = path.join(folderPath, "get_value"+ this.Util.uId() + '.json');
        await this.runCommand(`chia rpc data_layer get_value -j ${FileParams} > ${filePathOut}`); 
        fs.unlinkSync(FileParams);
        let Content = fs.readFileSync(filePathOut, 'utf8');
        fs.unlinkSync(filePathOut);
        Content = JSON.parse(Content);
        if (Content.value === undefined) {
            return {status: "error", message: "Value not found"}

        }
        return {status: "success", message:"", value: Content.value}
    }
    catch(error){
        return {
            status: "error",
            message: error.message
        }
    }
}
ChiaDatalayer.prototype.checkPrerequisites = async function (port = 8575) {
    let IsChiaInstalled = this.isChiaInstalled();
    if (IsChiaInstalled.status == "error") {
        return IsChiaInstalled;
    }
    let IsDataLayerActive = await this.runCommand("chia rpc data_layer get_connections");
    console.log(IsDataLayerActive);
    if (IsDataLayerActive.status !== undefined && IsDataLayerActive.status == "error") {
        let TryStartDataLayer = await this.runCommand("chia start data");
        if (TryStartDataLayer.message !== undefined && !TryStartDataLayer.message.includes("chia_data_layer: started")) {
            return {
                status: "error",
                message: "Please Enable DataLayer 'chia start data' or Go to Settings ->Data Layer ->Enable DataLayer"
            }
        }
    }
    let IsFileServerActive = await this.runCommand("chia start data_layer_http");
    if (IsFileServerActive.message !== undefined && !IsFileServerActive.message.includes("Already running") && !IsFileServerActive.message.includes("chia_data_layer_http: started")) {
        return {
            status: "error",
            message: "Please Enable File Server 'chia start data_layer_http' or Go to Settings ->Data Layer ->Enable File Server Propagation"
        }
    }
    let IsDB = await this.checkDb();
    if(!IsDB){
        return {
            status: "error",
            message: "Cant create DB"
        }
    }

    return IsChiaInstalled;

}
ChiaDatalayer.prototype.checkDb = async function () {
    console.log("Checking DB");
    const dbPath = path.join(app.getAppPath(),"db", 'database.db');
    this.Util.ensureFolderExists(path.join(app.getAppPath(),"db"));
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dbPath)) {
            resolve(true); 
            return;
        } 
        const db = new sqlite3.Database(dbPath);
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS Pending (
                    Id TEXT NOT NULL PRIMARY KEY,
                    Type TEXT NOT NULL,
                    Data TEXT NOT NULL)`, 
            (err) => {
                if (err) {
                    console.error('BDBTABLE ERROR Pending:', err);
                    resolve(false); 
                }
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS Video (
                    Id TEXT NOT NULL PRIMARY KEY,
                    Name TEXT,
                    IdChanel INTEGER,
                    Image TEXT NOT NULL,
                    ChunkSize INTEGER NOT NULL,
                    Size INTEGER NOT NULL,
                    TotalChunks INTEGER NOT NULL,
                    VideoPath TEXT NOT NULL,
                    Fee REAL NOT NULL)`, 
            (err) => {
                if (err) {
                    console.error('BDBTABLE ERROR VideoPending:', err);
                    resolve(false); 
                }
            });
            db.close();
            resolve(true);
        });
        
    });
}
ChiaDatalayer.prototype.isChiaInstalled = function () {
    try {
        // Verificar si el comando "chia" está activo
        execSync('chia --version');
        console.log('Command "chia" is active');

        return {
            status: 'success',
            message: 'Command "chia" is active.'
        }
    } catch (error) {
        console.error(`Command "chia" not active: ${error.message}`);

        // Verificar si la ruta existe
        const chiaPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'Chia', 'resources', 'app.asar.unpacked', 'daemon');
        try {
            fs.accessSync(chiaPath, fs.constants.F_OK);
            process.env.PATH += path.delimiter + chiaPath;
            console.log(`The path ${chiaPath} has been added to the environment variables.`);

            return {
                status: 'success',
                message: `The "chia" command is not active, but the path ${chiaPath} has been added to the environment variables.`

            }
        } catch (err) {
            console.error(`La ruta ${chiaPath} no existe.`);

            return {
                status: 'error',
                message: `The "chia" command is not active and the path ${chiaPath} does not exist.`
            }
        }
    }
}
ChiaDatalayer.prototype.log = function (_data) {
    if (this.logEnabled) {
        console.log(_data);
    }
}
module.exports = ChiaDatalayer;