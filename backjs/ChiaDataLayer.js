const fs = require('fs');
const path = require('path');
const {
    exec
} = require('child_process');
const {
    nativeImage,
    app
} = require('electron');

function ChiaDatalayer() {
    this.chunkSizeMB = 2; //in MB
    this.chunkSize = this.chunkSizeMB * 1024 * 1024; //in MB
    this.logEnabled = true;
}

ChiaDatalayer.prototype.splitFileIntoChunks = function (file_path, chunk_size) {
    chunk_size = chunk_size * 1024 * 1024; // Convertir de MB a bytes
    const fileData = fs.readFileSync(file_path);
    const fileDir = path.join(app.getAppPath(), 'video', this.convertToValidFolderName(path.basename(file_path)));
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

ChiaDatalayer.prototype.unsubscribeChanel = async function (IdChanel) {
    let OutputCmd = await this.runCommand(`chia rpc data_layer unsubscribe "{\\"id\\":\\"${IdChanel}\\"}"`);
    if (OutputCmd.success !== undefined && OutputCmd.success === true) {
        this.removeStoreFiles(IdChanel);
        this.removeChanelFromLocalFile(IdChanel);
    }
    return OutputCmd;
}
ChiaDatalayer.prototype.subscribeChanel = async function (IdChanel) {
    let OutputCmd = await this.runCommand(`chia rpc data_layer subscribe  "{\\"id\\":\\"${IdChanel}\\"}"`);
    if (OutputCmd.success !== undefined && OutputCmd.success === true) {
        const filePath = path.join(app.getAppPath(), 'img', 'imgplaceholder.png');
        let Chan = {
            Name: "----",
            Image: filePath,
            Id: IdChanel
        };
        this.createTempFileStore(Chan, "Chanel", "PendingSubscribe");
        return Chan;
    }
    return OutputCmd;
}
ChiaDatalayer.prototype.removeChanelFromLocalFile = function (idStore) {
    const filePath = path.join(app.getAppPath(), 'temp', "Chanel", 'Chanels.json');

    try {
        const data = fs.readFileSync(filePath, 'utf8');

        const jsonData = JSON.parse(data);

        const filteredData = jsonData.filter(obj => obj.Id !== idStore);

        // Convertir el objeto JavaScript filtrado de nuevo a JSON
        const updatedData = JSON.stringify(filteredData, null, 2);

        // Guardar el archivo actualizado de forma síncrona
        fs.writeFileSync(filePath, updatedData, 'utf8');

        console.log(`Archivo ${filePath} actualizado.`);
    } catch (err) {
        console.error(`Error al procesar el archivo ${filePath}: ${err}`);
    }
};
ChiaDatalayer.prototype.removeStoreFiles = function (idStore) {
    const chiaDataPath = path.join(process.env.USERPROFILE, '.chia', 'mainnet', 'data_layer', 'db', 'server_files_location_mainnet');

    if (fs.existsSync(chiaDataPath)) {
        try {
            const files = fs.readdirSync(chiaDataPath);

            files.forEach(file => {
                if (file.includes(idStore)) {
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
};
ChiaDatalayer.prototype.convertToValidFolderName = function (fileName) {
    const invalidCharsRegex = /[^a-zA-Z0-9]/g;
    const replacementChar = "-"; // Carácter a utilizar como reemplazo para los caracteres no permitidos

    // Reemplazar los caracteres no permitidos con el carácter de reemplazo
    const validName = fileName.replace(invalidCharsRegex, replacementChar);

    return validName.trim(); // Eliminar espacios en blanco al principio y al final del nombre
};

const {
    spawn
} = require('child_process');

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
    let OutputCmd = await this.runCommand(`chia rpc data_layer create_data_store "{\\"fee\\":\\"${fee}\\"}"`);

    return OutputCmd;
};

ChiaDatalayer.prototype.isStoreConfirmed = async function (idStore) {
    let OutputCmd = await this.runCommand("chia data get_root --id " + idStore);
    return OutputCmd;
};

ChiaDatalayer.prototype.isKeyConfirmed = async function (idStore, key) {
    let KeyHex = this.stringToHex(key);
    let OutputCmd = await this.runCommand("chia data get_value --id " + idStore + " --key " + KeyHex);
    return OutputCmd;
};
ChiaDatalayer.prototype.getChanelsFromChain = async function () {
    let Chanels = [];

    let OutputCmd = await this.runCommand("chia data get_subscriptions");
    if (OutputCmd.store_ids !== undefined) {
        for (let i = 0; i < OutputCmd.store_ids.length; i++) {
            let idStore = OutputCmd.store_ids[i];
            let chanel = await this.getChanelFromChain(idStore);
            if (chanel !== null) {
                Chanels.push(chanel);
            }

        }
    }
    if (Chanels.length > 0) {
        const filePath = path.join(app.getAppPath(), 'temp', "Chanel", `Chanels.json`);
        const writeStream = fs.createWriteStream(filePath);
        writeStream.write(JSON.stringify(Chanels, null, 2));
    }
    return Chanels;
}
ChiaDatalayer.prototype.getChanelFromChain = async function (idStore) {
    let KeyIsChanel = this.stringToHex("IsChanel");
    let KeyName = this.stringToHex("Name");
    let KeyImage = this.stringToHex("Image");
    let OutputIsChanel = await this.runCommand("chia data get_value --id " + idStore + " --key " + KeyIsChanel);
    if (OutputIsChanel.value === undefined)
        return null;

    let OuputName = await this.runCommand("chia data get_value --id " + idStore + " --key " + KeyName);
    let OuputImage = await this.runCommand("chia data get_value --id " + idStore + " --key " + KeyImage);
    if (OuputName.value !== undefined && OuputImage.value !== undefined) {
        let Chan = {
            Name: this.hexToString(OuputName.value),
            Image: this.hexToBase64(OuputImage.value),
            Id: idStore
        };
        return Chan;
    }
    return null;
}
ChiaDatalayer.prototype.getChanels = async function (_fromChain = false) {
    const filePath = path.join(app.getAppPath(), 'temp', "Chanel", 'Chanels.json');

    if (_fromChain || !fs.existsSync(filePath)) {
        return this.getChanelsFromChain();
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const Chanels = JSON.parse(data);
    return Chanels;

};
ChiaDatalayer.prototype.getChanelsPending = async function () {
    const folderPath = path.join(app.getAppPath(), 'temp', 'PendingInsert', "Chanel");

    const fileNames = fs.readdirSync(folderPath);
    const jsonFiles = [];

    fileNames.forEach((fileName) => {
        const filePath = path.join(folderPath, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        try {
            const jsonData = JSON.parse(fileContent);
            jsonFiles.push(jsonData);
        } catch (error) {
            console.error(`Error parsing JSON file: ${filePath}`);
            console.error(error);
        }
    });

    return jsonFiles;

};
ChiaDatalayer.prototype.getChanelsSubscriptionPending = async function () {
    const folderPath = path.join(app.getAppPath(), 'temp', 'PendingSubscribe', "Chanel");

    const fileNames = fs.readdirSync(folderPath);
    const jsonFiles = [];

    fileNames.forEach((fileName) => {
        const filePath = path.join(folderPath, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        try {
            const jsonData = JSON.parse(fileContent);
            jsonFiles.push(jsonData);
        } catch (error) {
            console.error(`Error parsing JSON file: ${filePath}`);
            console.error(error);
        }
    });

    return jsonFiles;

};
ChiaDatalayer.prototype.deteleChunkTempFiles = async function (Video) {

    const directoryPath = path.join(app.getAppPath(), 'temp', 'Chunk');
    const pattern = `VideoFile${Video.Id}_Part_*.json`;

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

ChiaDatalayer.prototype.insertNextVideoChunk = async function (Video) {
    return new Promise(async (resolve, reject) => {
        try {
            let Response = {};
            const directoryPath = path.join(app.getAppPath(), 'temp', "Chunk");
            const pattern = `VideoFile${Video.Id}_Part_*.json`; //to delete
            // Obtiene el tamaño del archivo en bytes
            const fileSizeInBytes = fs.statSync(Video.VideoPath).size;

            // Calcula el número total de chunks requeridos
            const chunkSizeInBytes = this.chunkSize;
            const totalChunks = Math.ceil(fileSizeInBytes / chunkSizeInBytes);


            let Output = await this.runCommand(`chia data get_root_history --id ${Video.Id}`);
            if (Output.success !== undefined && Output.success === false) {
                Response = {
                    IsCompleted: false,
                    message: Output.error,
                    status: "error"
                }
                resolve(Response); // Resuelve la promesa con el nombre del archivo generado
                return;

            }
            if (Output.root_history.length === undefined || Output.root_history.length === 0) {
                Response = {
                    IsCompleted: false,
                    message: "No History Found",
                    status: "error"
                }
                resolve(Response); // Resuelve la promesa con el nombre del archivo generado
                return;

            }
            let Index2Continue = Output.root_history.length - 1;

            var temTimestampZero = Output.root_history.some(function (elemento) {
                return elemento.timestamp === 0;
            });
            if (temTimestampZero) {
                Response = {
                    IsCompleted: false,
                    message: `${Index2Continue} / ${totalChunks} processed`,
                    status: "success"
                }
                resolve(Response); // Resuelve la promesa con el nombre del archivo generado
                return;
            }
            await this.deteleChunkTempFiles(Video);
            if (Index2Continue === totalChunks && temTimestampZero === false) {
                Response = {
                    IsCompleted: true,
                    message: "Video Completed",
                    status: "success"
                }
                resolve(Response); // Resuelve la promesa con el nombre del archivo generado
                return;

            }

            // Crea un flujo de escritura para el archivo

            // Genera los objetos del array
            let IsFirst = true;
            const filePath = path.join(directoryPath, `VideoFile${Video.Id}_Part_${Index2Continue + 1}.json`);
            const writeStream = fs.createWriteStream(filePath);

            // Escribe el inicio del archivo JSON
            writeStream.write('{\n');
            writeStream.write(`  "id": "${Video.Id}",\n`);
            writeStream.write(`  "fee": "${Video.Fee}",\n`);
            writeStream.write('  "changelist": [\n');
            const chunkData = this.generateChunkData(Video.VideoPath, Index2Continue);
            const chunkHex = chunkData.toString('hex');

            if (Index2Continue == 0) {
                let VideoDetails = await this.getVideoDetails(Video);
                let KeyIdStore = this.stringToHex("VideoDetails");
                const objectDetailData = {
                    "action": "insert",
                    "key": KeyIdStore,
                    "value": this.stringToHex(JSON.stringify(VideoDetails))
                }
                const jsonDetailData = JSON.stringify(objectDetailData, null, 2); // Usa null y 2 para dar formato legible al JSON
                writeStream.write(jsonDetailData);
                writeStream.write(',');
            }


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
                value: this.stringToHex(`Part_${Index2Continue + 1}|`) + chunkHex,
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
            let OutputCmd = await this.runCommand(`chia rpc data_layer batch_update  -j ${filePath}`);
            if (OutputCmd.success === true || OutputCmd.error.startsWith("Key already present")) {
                this.log(`Chunk ${Index2Continue + 1} de ${totalChunks} processed`);
                Response = {
                    IsCompleted: false,
                    message: Index2Continue + 1 == totalChunks ? "Validating last transaction" :`${Index2Continue + 1} / ${totalChunks} processed`,
                    status: "success"
                }
            } else {
                Response = {
                    IsCompleted: false,
                    message: `${Index2Continue} / ${totalChunks} processed`,
                    status: "success"
                }
            }

            resolve(Response); // Resuelve la promesa con el nombre del archivo generado
            return;

        } catch (error) {
            this.log(`Error al generar el archivo JSON: ${error}`);
            let Response = {
                IsCompleted: false,
                message: `--`,
                status: "error"
            }
            reject(Response); // Rechaza la promesa con el error
        }
    });
};
ChiaDatalayer.prototype.sendVideoChunks = async function (Video) {
    return new Promise(async (resolve, reject) => {
        try {
            const directoryPath = path.join(app.getAppPath(), 'temp', "Chunk");
            const pattern = `VideoFile${Video.Id}_Part_*.json`; //to delete
            // Obtiene el tamaño del archivo en bytes
            const fileSizeInBytes = fs.statSync(Video.VideoPath).size;

            // Calcula el número total de chunks requeridos
            const chunkSizeInBytes = this.chunkSize;
            const totalChunks = Math.ceil(fileSizeInBytes / chunkSizeInBytes);


            let Output = await this.runCommand(`chia data get_root_history --id ${Video.Id}`);
            let Index2Continue = Output.root_history.length - 1;

            // Crea un flujo de escritura para el archivo

            // Genera los objetos del array
            let IsFirst = true;
            for (let i = Index2Continue; i < totalChunks; i++) {
                const filePath = path.join(directoryPath, `VideoFile${Video.Id}_Part_${i + 1}.json`);
                const writeStream = fs.createWriteStream(filePath);

                // Escribe el inicio del archivo JSON
                writeStream.write('{\n');
                writeStream.write(`  "id": "${Video.Id}",\n`);
                writeStream.write(`  "fee": "${Video.Fee}",\n`);
                writeStream.write('  "changelist": [\n');
                const chunkData = this.generateChunkData(Video.VideoPath, i);
                const chunkHex = chunkData.toString('hex');

                if (i == 0) {
                    let VideoDetails = await this.getVideoDetails(Video);
                    let KeyIdStore = this.stringToHex("VideoDetails");
                    const objectDetailData = {
                        "action": "insert",
                        "key": KeyIdStore,
                        "value": this.stringToHex(JSON.stringify(VideoDetails))
                    }
                    const jsonDetailData = JSON.stringify(objectDetailData, null, 2); // Usa null y 2 para dar formato legible al JSON
                    writeStream.write(jsonDetailData);
                    writeStream.write(',');
                }


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
                        this.log(`Chunk ${i + 1} de ${totalChunks} processed`);
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

    const filePath = path.join(app.getAppPath(), 'temp', "Insert", `insert_${chanel.Id}.json`);
    const jsonData = JSON.stringify(Jsonobject, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');

    let OutputCmd = await this.runCommand(`chia rpc data_layer batch_update  -j ${filePath}`);
    fs.unlinkSync(filePath);
    return OutputCmd;
};
ChiaDatalayer.prototype.getChunk = async function (IdVideo, Part, TotalChunks) {
    let Output = await this.runCommand(`chia data get_root_history --id ${IdVideo}`);
    if (Output.root_history !== undefined && Output.root_history.length - 1 >= Part) {
        let Parameters = {
            "id": IdVideo,
            "key": this.stringToHex(`VideoChunk`),
            "root_hash": Output.root_history[Part].root_hash
        };
        const folderPath = path.join(app.getAppPath(), 'temp', "CurrentPlayer");
        const filePath = path.join(folderPath, Output.root_history[Part].root_hash + '_Part' + Part + '_p.json');
        const filePathOut = path.join(folderPath, Output.root_history[Part].root_hash + '_Part' + Part + '_out.json');
        const json = JSON.stringify(Parameters, null, 2);
        fs.writeFileSync(filePath, json);
        let OutputCmd = await this.runCommand(`chia rpc data_layer get_value -j ${filePath} > ${filePathOut}`);
        fs.unlinkSync(filePath);
        let Content = fs.readFileSync(filePathOut, 'utf8');
        Content = JSON.parse(Content);
        fs.unlinkSync(filePathOut);
        if (Content.value !== undefined) {
            Content.value = this.hexToString(Content.value);
            const indexPipe = Content.value.indexOf("|");
            const chunkName = Content.value.substring(0, indexPipe).trim();
            Content.value = Content.value.substring(indexPipe + 1).trim();
            console.log(`Chunk ${Part} ${chunkName} de ${TotalChunks} obtenido`);
            return this.stringToHex(Content.value);

        }
    }
    return null;
}
ChiaDatalayer.prototype.getVideoDetails = async function (Video) {
    let Image = await this.processImage(Video.Image);
    Image = this.base64ToHex(Image);
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
    return VideoDetails;
}
ChiaDatalayer.prototype.insertVideoDetails = async function (Video) {
    let VideoDetails = await this.getVideoDetails(Video);
    let KeyIdStore = this.stringToHex("Video" + Video.Id);

    const Jsonobject = {
        "id": Video.IdChanel,
        "fee": "0",
        "changelist": [{
            "action": "insert",
            "key": KeyIdStore,
            "value": this.stringToHex(JSON.stringify(VideoDetails))
        }]
    };

    const filePath = path.join(app.getAppPath(), 'temp', "Insert", `insert_${Video.Id}.json`);
    const jsonData = JSON.stringify(Jsonobject, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');

    let OutputCmd = await this.runCommand(`chia rpc data_layer batch_update  -j ${filePath}`);
    fs.unlinkSync(filePath);
    return OutputCmd;
};
ChiaDatalayer.prototype.insertVideoFile = async function (Video) {
    let JsonFile = await this.insertNextVideoChunk(Video);

    return JsonFile;
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
            const folderPath = path.join(app.getAppPath(), 'temp');
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
ChiaDatalayer.prototype.getVideoInfo = async function (IdVideo) {
    let KeyIdStore = this.stringToHex("VideoDetails");
    let Parameters = {
        "id": IdVideo,
        "key": KeyIdStore
    };
    const folderPath = path.join(app.getAppPath(), 'temp', "Video");
    const filePath = path.join(folderPath, KeyString + '.json');
    const filePathOut = path.join(folderPath, KeyString + '_out.json');
    const json = JSON.stringify(Parameters, null, 2);
    fs.writeFileSync(filePath, json);
    let OutputCmddata = await this.runCommand(`chia rpc data_layer get_value -j ${filePath} > ${filePathOut}`);
    fs.unlinkSync(filePath);
    let Content = fs.readFileSync(filePathOut, 'utf8');
    Content = JSON.parse(Content);
    fs.unlinkSync(filePathOut);
    if (Content.value !== undefined) {
        let Video = JSON.parse(this.hexToString(Content.value));
        Video.Image = this.hexToBase64(Video.Image);
        return Video;
    }
    return null;
}
ChiaDatalayer.prototype.getChanelVideosFromChain = async function (idChanel) {
    let Videos = [];
    let OutputCmd = await this.runCommand(`chia data get_keys --id ${idChanel}`);
    if (OutputCmd.keys !== undefined) {
        for (let i = 0; i < OutputCmd.keys.length; i++) {
            let KeyString = this.hexToString(OutputCmd.keys[i].replace("0x", ""));
            KeyString = KeyString.trim();
            if (KeyString.startsWith("Video")) {

                //todo
                let Parameters = {
                    "id": idChanel,
                    "key": OutputCmd.keys[i]
                };
                const folderPath = path.join(app.getAppPath(), 'temp', "Chanel");
                const filePath = path.join(folderPath, KeyString + '.json');
                const filePathOut = path.join(folderPath, KeyString + '_out.json');
                const json = JSON.stringify(Parameters, null, 2);
                fs.writeFileSync(filePath, json);
                let OutputCmddata = await this.runCommand(`chia rpc data_layer get_value -j ${filePath} > ${filePathOut}`);
                fs.unlinkSync(filePath);
                let Content = fs.readFileSync(filePathOut, 'utf8');
                Content = JSON.parse(Content);
                fs.unlinkSync(filePathOut);
                if (Content.value !== undefined) {
                    let Video = JSON.parse(this.hexToString(Content.value));
                    Video.Image = this.hexToBase64(Video.Image);
                    Videos.push(Video);
                }

            }

        }
    }
    if (Videos.length > 0) {

        const filePath = path.join(app.getAppPath(), 'temp', "Chanel", `Chanel_${idChanel}.json`);
        const writeStream = fs.createWriteStream(filePath);
        writeStream.write(JSON.stringify(Videos, null, 2));
    }
    return Videos;
}

ChiaDatalayer.prototype.getChanelVideos = async function (idChanel, _fromChain = false) {
    const filePath = path.join(app.getAppPath(), 'temp', "Chanel", 'Chanel_' + idChanel + '.json');

    if (_fromChain || !fs.existsSync(filePath)) {
        return this.getChanelVideosFromChain(idChanel);
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const Videos = JSON.parse(data);
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
    try {

        if (output == "") {
            return {};
        }
        if (output.includes("Cannot connect to host") || output.includes("Check if data layer rpc is running")) {
            return {
                status: "error",
                message: "Cannot connect to DataLayer"
            };
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
        output = JSON.parse(output);
        return output;
    } catch (error) {
        this.log(error);
        return {
            status: "error",
            message: error.message
        };
    }
};

ChiaDatalayer.prototype.processImage = async function (FilePath) {
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
ChiaDatalayer.prototype.createTempFileStore = async function (DataObject, Type, PendingType = "PendingInsert") {

    try {
        const directoryPath = path.join(app.getAppPath(), 'temp', PendingType, Type);
        const filePath = path.join(directoryPath, DataObject.Id + '.json');
        const data = JSON.stringify(DataObject);

        await fs.promises.writeFile(filePath, data);
        return {
            status: "success",
            message: "File created"
        };
    } catch (error) {
        return {
            status: "error",
            message: error.message
        };
    }

};
ChiaDatalayer.prototype.insertToLocalChanelsFile = async function (Chanel) {
    const filePath = path.join(app.getAppPath(), 'temp', 'Chanel', 'Chanels.json');

    let data = [];
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(fileContent);
    }

    data.push(Chanel);

    const jsonActualizado = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonActualizado, 'utf-8');
};

ChiaDatalayer.prototype.insertToLocalChanelsVideoFile = async function (Video) {
    const filePath = path.join(app.getAppPath(), 'temp', 'Chanel', `Chanel_${Video.IdChanel}.json`);

    let data = [];
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(fileContent);
    }

    data.push(Video);

    const jsonActualizado = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonActualizado, 'utf-8');
};

ChiaDatalayer.prototype.deleteTempFileStore = async function (DataObject, Type, PendingType = "PendingInsert") {
    const filePath = path.join(app.getAppPath(), 'temp', PendingType, Type, DataObject.Id + '.json');
    try {
        await fs.promises.unlink(filePath);
        if (Type == "Chanel") {
            let ChainChanel = await this.getChanelFromChain(DataObject.Id);
            if (ChainChanel != null) {
                this.insertToLocalChanelsFile(ChainChanel);
            }
        }
        if (Type == "Video") {
            let Video = await this.getVideoInfo(DataObject.Id);
            if (Video != null && Video.IdChanel != undefined && Video.IdChanel != null)
                this.insertToLocalChanelsVideoFile(Video);

        }
        return {
            status: "success",
            message: "File deleted"
        };
    } catch (error) {
        return {
            status: "error",
            message: error.message
        };
    }
}

ChiaDatalayer.prototype.getFileSize = async function (filePath) {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    return fileSizeInMB;
}
ChiaDatalayer.prototype.isChiaInstalled = function () {
    try {
        // Check if the "chia" command is active
        execSync('chia --version');
        console.log('The "chia" command is active.');

        return {
            status: 'success',
            message: 'The "chia" command is active.'
        };
    } catch (error) {
        console.error(`The "chia" command is not active: ${error.message}`);

        // Check if the path exists
        const chiaPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'Chia', 'resources', 'app.asar.unpacked', 'daemon');
        try {
            fs.accessSync(chiaPath, fs.constants.F_OK);
            process.env.PATH += path.delimiter + chiaPath;
            console.log(`The path ${chiaPath} has been added to the environment variables.`);

            return {
                status: 'success',
                message: `The "chia" command is not active, but the path ${chiaPath} has been added to the environment variables.`
            };
        } catch (err) {
            console.error(`The path ${chiaPath} does not exist.`);

            return {
                status: 'error',
                message: `The "chia" command is not active and the path ${chiaPath} does not exist.`
            };
        }
    }
};

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