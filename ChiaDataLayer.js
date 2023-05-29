const fs = require('fs');
const path = require('path');
const {
    exec
} = require('child_process');
const {
    nativeImage
} = require('electron');

function ChiaDatalayer() {
    this.chunkSizeMB = 10; //in MB
    this.chunkSize = this.chunkSizeMB * 1024 * 1024; //in MB
    this.logEnabled = true;
}

ChiaDatalayer.prototype.splitFileIntoChunks = function (file_path, chunk_size) {
    chunk_size = chunk_size * 1024 * 1024; // Convertir de MB a bytes
    const fileData = fs.readFileSync(file_path);
    const fileDir = path.join(__dirname, 'video', this.convertToValidFolderName(path.basename(file_path)));
    const fileName = path.basename(file_path, path.extname(file_path));

    // Verificar si el directorio existe y eliminarlo si es necesario
    if (fs.existsSync(fileDir)) {
        fs.rmdirSync(fileDir, {
            recursive: true
        });
    }

    // Crear el directorio
    fs.mkdirSync(fileDir, {
        recursive: true
    });

    const totalChunks = Math.ceil(fileData.length / chunk_size);

    let chunk_number = 1;
    let offset = 0;

    while (offset < fileData.length) {
        const chunkData = fileData.slice(offset, offset + chunk_size);

        // Convierte los datos del fragmento en una representación hexadecimal
        const hexData = chunkData.toString('hex');

        // Guarda el fragmento en un archivo separado
        const chunk_filename = path.join(fileDir, `Part_${chunk_number}.txt`);
        fs.writeFileSync(chunk_filename, hexData);

        chunk_number++;
        offset += chunk_size;
    }

    this.log(`El archivo MP4 ha sido dividido en ${chunk_number - 1} fragmentos.`);
    return fileDir;
};

ChiaDatalayer.prototype.reconstructMP4FromChunks = function (chunk_directory, output_filename, totalChunks) {
    const output_directory = chunk_directory;
    const output_file = path.join(output_directory, output_filename);
    const files = fs.readdirSync(chunk_directory);

    const sortedFiles = files
        .filter(file => file.endsWith('.txt'))
        .sort((a, b) => {
            const aNum = parseInt(a.match(/Part_(\d+)/)[1]);
            const bNum = parseInt(b.match(/Part_(\d+)/)[1]);
            return aNum - bNum;
        });

    const outputStream = fs.createWriteStream(output_file);

    let expectedChunkNumber = 1;

    for (const file of sortedFiles) {
        const chunk_filepath = path.join(chunk_directory, file);
        const chunk_data = fs.readFileSync(chunk_filepath, 'utf-8');

        // Verificar si el número de fragmento es el esperado
        const regex = /Part_(\d+)/;

        // Buscar el número de parte en el nombre del archivo
        const resultado = chunk_filepath.match(regex);
        const chunkNumber = resultado[1];



        while (expectedChunkNumber < chunkNumber) {
            // Generar datos dummy para los fragmentos faltantes
            const dummyData = Buffer.alloc(this.chunkSize); // Tamaño del chunk dummy (10MB)
            outputStream.write(dummyData);

            expectedChunkNumber++;
        }

        // Convertir datos hexadecimales a binarios
        const binary_data = Buffer.from(chunk_data, 'hex');
        outputStream.write(binary_data);

        expectedChunkNumber++;
    }

    // Generar datos dummy para los fragmentos restantes (si hay)
    while (expectedChunkNumber <= totalChunks) {
        const dummyData = Buffer.alloc(10 * 1024 * 1024); // Tamaño del chunk dummy (10MB)
        outputStream.write(dummyData);

        expectedChunkNumber++;
    }

    outputStream.end();

    this.log(`Los fragmentos en '${chunk_directory}' han sido combinados en el archivo '${output_file}'.`);
    return output_file;
};

ChiaDatalayer.prototype.convertToValidFolderName = function (fileName) {
    const invalidCharsRegex = /[^a-zA-Z0-9]/g;
    const replacementChar = "-"; // Carácter a utilizar como reemplazo para los caracteres no permitidos

    // Reemplazar los caracteres no permitidos con el carácter de reemplazo
    const validName = fileName.replace(invalidCharsRegex, replacementChar);

    return validName.trim(); // Eliminar espacios en blanco al principio y al final del nombre
};

ChiaDatalayer.prototype.runCommand = async function (command) {
    this.log(command);
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                error.message = this.parseOutput(error.message);
                resolve(error.message);
                return;
            }
            stdout = this.parseOutput(stdout);
            resolve(stdout);
        });
    });
};

ChiaDatalayer.prototype.createStore = async function (fee) {
    let OutputCmd = await this.runCommand("chia data create_data_store -m " + fee);

    return OutputCmd;
};

ChiaDatalayer.prototype.isStoreConfirmed = async function (idChanel) {
    let OutputCmd = await this.runCommand("chia data get_root --id " + idChanel);
    return OutputCmd;
};

ChiaDatalayer.prototype.isKeyConfirmed = async function (idStore, key) {
    let KeyHex = this.stringToHex(key);
    let OutputCmd = await this.runCommand("chia data get_value --id " + idStore + " --key " + KeyHex);
    return OutputCmd;
};

ChiaDatalayer.prototype.getChanels = async function () {
    let Chanels = [];
    let KeyIsChanel = this.stringToHex("IsChanel");
    let KeyName = this.stringToHex("Name");
    let KeyImage = this.stringToHex("Image");
    let OutputCmd = await this.runCommand("chia data get_subscriptions");
    if (OutputCmd.store_ids !== undefined) {
        for (let i = 0; i < OutputCmd.store_ids.length; i++) {
            let OutputIsChanel = await this.runCommand("chia data get_value --id " + OutputCmd.store_ids[i] + " --key " + KeyIsChanel);
            if (OutputIsChanel.value === undefined)
                continue;

            let OuputName = await this.runCommand("chia data get_value --id " + OutputCmd.store_ids[i] + " --key " + KeyName);
            let OuputImage = await this.runCommand("chia data get_value --id " + OutputCmd.store_ids[i] + " --key " + KeyImage);
            if (OuputName.value !== undefined && OuputImage.value !== undefined) {
                let Chan = {
                    Name: this.hexToString(OuputName.value),
                    Image: this.hexToBase64(OuputImage.value),
                    Id: OutputCmd.store_ids[i]
                };
                Chanels.push(Chan);
            }

        }
    }
    return Chanels;
};
ChiaDatalayer.prototype.sendVideoChunks = async function (Video) {
    return new Promise(async (resolve, reject) => {
        try {
            // Obtiene el tamaño del archivo en bytes
            const fileSizeInBytes = fs.statSync(Video.VideoPath).size;

            // Calcula el número total de chunks requeridos
            const chunkSizeInBytes = this.chunkSize;
            const totalChunks = Math.ceil(fileSizeInBytes / chunkSizeInBytes);

            // Crea un flujo de escritura para el archivo

            // Genera los objetos del array
            let IsFirst = true;
            for (let i = 0; i < totalChunks; i++) {
                const filePath = path.join(__dirname, 'temp', `VideoFile${Video.Id}_Part_${i + 1}.json`);
                const writeStream = fs.createWriteStream(filePath);

                // Escribe el inicio del archivo JSON
                writeStream.write('{\n');
                writeStream.write(`  "id": "${Video.Id}",\n`);
                writeStream.write(`  "fee": "${Video.Fee}",\n`);
                writeStream.write('  "changelist": [\n');
                const chunkData = this.generateChunkData(Video.VideoPath, i);
                const chunkHex = chunkData.toString('hex');

                const objectDelete = {
                    action: 'delete',
                    key: this.stringToHex(`VideoChunk`)
                };
                const jsonDelete = JSON.stringify(objectDelete, null, 2); // Usa null y 2 para dar formato legible al JSON
                writeStream.write(jsonDelete);
                writeStream.write(',');

                const object = {
                    action: 'insert',
                    key: this.stringToHex(`VideoChunk`),
                    value: this.stringToHex(`Part_${i + 1}|`) + chunkHex,
                };

                // Convierte el objeto a JSON y lo escribe en el archivo
                const json = JSON.stringify(object, null, 2); // Usa null y 2 para dar formato legible al JSON
                writeStream.write(json);

                writeStream.write('\n');
                // Escribe el cierre del archivo JSON
                writeStream.write('  ]\n');
                writeStream.write('}\n');

                // Cierra el flujo de escritura
                writeStream.end();
                let IsProcesed = false;
                if (!IsFirst) {
                    await this.sleep(10000);
                }
                do {
                    IsFirst = false;
                    let OutputCmd = await this.runCommand(`chia rpc data_layer batch_update  -j ${filePath}`);
                    if (OutputCmd.success === true || OutputCmd.error.startsWith("Key already present")) {
                        IsProcesed = true;
                        this.log(`Chunk ${i + 1} de ${totalChunks} procesado`);
                        //await fs.unlinkSync(filePath);
                    } else {
                        await this.sleep(10000);
                    }
                } while (!IsProcesed);


            }
            resolve(true); // Resuelve la promesa con el nombre del archivo generado

        } catch (error) {
            this.log(`Error al generar el archivo JSON: ${error}`);
            reject(null); // Rechaza la promesa con el error
        }
    });
};


// Función para generar datos de chunk de prueba (reemplazar con tu lógica para leer y dividir el archivo MP4)
ChiaDatalayer.prototype.generateChunkData = function (filename, chunkIndex) {
    // Lee el chunk del archivo
    const fileDescriptor = fs.openSync(filename, 'r');
    const buffer = Buffer.alloc(this.chunkSize);
    const bytesRead = fs.readSync(fileDescriptor, buffer, 0, this.chunkSize, chunkIndex * this.chunkSize);
    fs.closeSync(fileDescriptor);

    // Retorna el chunk leído
    return buffer.slice(0, bytesRead);
}

ChiaDatalayer.prototype.insertChanelDetails = async function (chanel) {
    let Image = await this.processImage(chanel.Image);
    Image = this.base64ToHex(Image);
    let KeyIsChanel = this.stringToHex("IsChanel");
    let KeyImage = this.stringToHex("Image");
    let KeyName = this.stringToHex("Name");
    let IsChanel = this.stringToHex("true");
    let Name = this.stringToHex(chanel.Name);

    const Jsonobject = {
        "id": chanel.Id,
        "fee": "0",
        "changelist": [{
                "action": "insert",
                "key": KeyIsChanel,
                "value": IsChanel
            },
            {
                "action": "insert",
                "key": KeyName,
                "value": Name
            },
            {
                "action": "insert",
                "key": KeyImage,
                "value": Image
            }
        ]
    };

    const filePath = path.join(__dirname, 'temp', `insert_${chanel.Id}.json`);
    const jsonData = JSON.stringify(Jsonobject, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');

    let OutputCmd = await this.runCommand(`chia rpc data_layer batch_update  -j ${filePath}`);
    fs.unlinkSync(filePath);
    return OutputCmd;
};
ChiaDatalayer.prototype.insertVideoDetails = async function (Video) {
    let Image = await this.processImage(Video.Image);
    Image = this.base64ToHex(Image);
    let KeyIdStore = this.stringToHex("Video" + Video.Id);
    let Size = await this.getFileSize(Video.VideoPath);
    let TotalChunks = this.calculateNumberOfChunks(Size, this.chunkSizeMB);
    let VideoDetails = {
        Name: Video.Name,
        IdChanel: Video.IdChanel,
        Id: Video.Id,
        Image: Image,
        ChunkSize: this.chunkSizeMB,
        Size: Size,
        TotalChunks: TotalChunks
    };
    const Jsonobject = {
        "id": Video.IdChanel,
        "fee": "0",
        "changelist": [{
            "action": "insert",
            "key": KeyIdStore,
            "value": this.stringToHex(JSON.stringify(VideoDetails))
        }]
    };

    const filePath = path.join(__dirname, 'temp', `insert_${Video.Id}.json`);
    const jsonData = JSON.stringify(Jsonobject, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');

    let OutputCmd = await this.runCommand(`chia rpc data_layer batch_update  -j ${filePath}`);
    fs.unlinkSync(filePath);
    return OutputCmd;
};
ChiaDatalayer.prototype.insertVideoFile = async function (Video) {
    let JsonFile = await this.sendVideoChunks(Video);

    return "OK";
};
ChiaDatalayer.prototype.getVideoFile = async function (IdVideo) {
    let Output = await this.runCommand(`chia data get_root_history --id ${IdVideo}`);
    if (Output.root_history !== undefined && Output.root_history.length > 1) {
        for (let i = 0; i < Output.root_history.length; i++) {
            if (Output.root_history[i].root_hash == "0x0000000000000000000000000000000000000000000000000000000000000000")
                continue;
            let Parameters = {
                "id": IdVideo,
                "key": this.stringToHex(`VideoChunk`),
                "root_hash": Output.root_history[i].root_hash
            };
            const folderPath = path.join(__dirname, 'temp');
            const filePath = path.join(folderPath, Output.root_history[i].root_hash + '_p.json');
            const filePathOut = path.join(folderPath, Output.root_history[i].root_hash + '_out.json');
            const json = JSON.stringify(Parameters, null, 2);
            fs.writeFileSync(filePath, json);
            let OutputCmd = await this.runCommand(`chia rpc data_layer get_value -j ${filePath} > ${filePathOut}`);
            fs.unlinkSync(filePath);
            let Content = fs.readFileSync(filePathOut, 'utf8');
            Content = JSON.parse(Content);
            if (Content.value !== undefined) {
                Content.value = this.hexToString(Content.value);
                const indexPipe = Content.value.indexOf("|");
                const chunkName = Content.value.substring(0, indexPipe).trim();
                Content.value = Content.value.substring(indexPipe + 1).trim();
                const chunkPath = path.join(folderPath, IdVideo + '_' + chunkName + '.txt');
                console.log(chunkName);
                fs.unlinkSync(filePathOut);
                fs.writeFileSync(chunkPath, this.stringToHex(Content.value));

            }

        }
    }

    return "OK";
};
ChiaDatalayer.prototype.getChanelVideos = async function (idChanel) {

    let Videos = [];
    let OutputCmd = await this.runCommand(`chia data get_keys --id ${idChanel}`);
    if (OutputCmd.keys !== undefined) {
        for (let i = 0; i < OutputCmd.keys.length; i++) {
            let KeyString = this.hexToString(OutputCmd.keys[i].replace("0x", ""));
            KeyString = KeyString.trim();
            if (KeyString.startsWith("Video")) {

                let VideoOuput = await this.runCommand("chia data get_value --id " + idChanel + " --key " + OutputCmd.keys[i]);

                if (VideoOuput.value !== undefined) {
                    let Video = JSON.parse(this.hexToString(VideoOuput.value));
                    Video.Image = this.hexToBase64(Video.Image);
                    Videos.push(Video);
                }
            }

        }
    }
    return Videos;
}
ChiaDatalayer.prototype.stringToHex = function (text) {
    var hexString = "";

    for (var i = 0; i < text.length; i++) {
        var hex = text.charCodeAt(i).toString(16);
        hexString += (hex.length === 2 ? hex : "0" + hex);
    }

    return hexString;
};

ChiaDatalayer.prototype.hexToString = function (hex) {
    var string = '';
    for (var i = 0; i < hex.length; i += 2) {
        var byte = parseInt(hex.substr(i, 2), 16);
        string += String.fromCharCode(byte);
    }
    return string;
};

ChiaDatalayer.prototype.base64ToHex = function (base64String) {
    // Remove the data URL prefix
    var base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");

    // Convert the Base64 string to Uint8Array
    var bytes = Uint8Array.from(atob(base64Data), function (c) {
        return c.charCodeAt(0);
    });

    // Convert the Uint8Array to hexadecimal
    var hexString = Array.from(bytes).map(function (byte) {
        return ('0' + byte.toString(16)).slice(-2);
    }).join('');

    return hexString;
};

ChiaDatalayer.prototype.hexToBase64 = function (hexString) {
    try {
        let base64String = Buffer.from(hexString, 'hex').toString('base64')

        // Add the data URL prefix if needed
        if (!base64String.startsWith("data:")) {
            base64String = "data:image/png;base64," + base64String;
        }

        return base64String;
    } catch (error) {
        this.log("Error converting hexadecimal to base64:" + error);
        return null;
    }
};



ChiaDatalayer.prototype.parseOutput = function (output) {
    if (output == "") {
        return {};
    }
    output = output.replace(/'/g, '"');
    output = output.replace(/'/g, '"');
    output = output.replace(/True/gi, "true")
    output = output.replace(/False/gi, "false")
    output = output.replace(/None/gi, '"None"')
    this.log(output);
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
    output = JSON.parse(output);
    return output;
};

ChiaDatalayer.prototype.processImage = async function (FilePath) {
    const img = nativeImage.createFromPath(FilePath);

    const anchoOriginal = img.getSize().width;
    const altoOriginal = img.getSize().height;

    if (anchoOriginal > 300 && FilePath.toLowerCase().endsWith('.jpg')) {
        const ratio = 300 / anchoOriginal;
        const anchoRedimensionado = 300;
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
ChiaDatalayer.prototype.getFileSize = async function (filePath) {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    return fileSizeInMB;
}
ChiaDatalayer.prototype.calculateNumberOfChunks = function (fileSizeMB, chunkSizeMB) {
    return Math.ceil(fileSizeMB / chunkSizeMB);
}
ChiaDatalayer.prototype.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

ChiaDatalayer.prototype.log = function (_data) {
    if (this.logEnabled) {
        console.log(_data);
    }
};

module.exports = ChiaDatalayer;