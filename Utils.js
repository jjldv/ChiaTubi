const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { nativeImage } = require('electron');
const { Console } = require('console');
const ChunkSize = 10;
let IsLogEnabled = true;


function splitFileIntoChunks(file_path, chunk_size) {
    chunk_size = chunk_size * 1024 * 1024; // Convertir de MB a bytes
    const fileData = fs.readFileSync(file_path);
    const fileDir = path.join(__dirname, 'video', convertToValidFolderName(path.basename(file_path)));
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
        const chunk_filename = path.join(fileDir, `${fileName}_${chunk_number}.txt`);
        fs.writeFileSync(chunk_filename, hexData);

        chunk_number++;
        offset += chunk_size;
    }

    Log(`El archivo MP4 ha sido dividido en ${chunk_number - 1} fragmentos.`);
    return fileDir;
}

function reconstructMP4FromChunks(chunk_directory, output_filename, totalChunks) {
    const output_directory = chunk_directory;
    const output_file = path.join(output_directory, output_filename);
    const files = fs.readdirSync(chunk_directory);

    const sortedFiles = files
        .filter(file => file.endsWith('.txt'))
        .sort((a, b) => {
            const aNum = parseInt(path.parse(a).name.split('_')[1]);
            const bNum = parseInt(path.parse(b).name.split('_')[1]);
            return aNum - bNum;
        });

    const outputStream = fs.createWriteStream(output_file);

    let expectedChunkNumber = 1;

    for (const file of sortedFiles) {
        const chunk_filepath = path.join(chunk_directory, file);
        const chunk_data = fs.readFileSync(chunk_filepath, 'utf-8');

        // Verificar si el número de fragmento es el esperado
        const chunkNumber = parseInt(path.parse(file).name.split('_')[1]);
        while (expectedChunkNumber < chunkNumber) {
            // Generar datos dummy para los fragmentos faltantes
            const dummyData = Buffer.alloc(ChunkSize * 1024 * 1024); // Tamaño del chunk dummy (10MB)
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

    Log(`Los fragmentos en '${chunk_directory}' han sido combinados en el archivo '${output_file}'.`);
    return output_file;
}


function convertToValidFolderName(fileName) {
    const invalidCharsRegex = /[^a-zA-Z0-9]/g;
    const replacementChar = "-"; // Carácter a utilizar como reemplazo para los caracteres no permitidos

    // Reemplazar los caracteres no permitidos con el carácter de reemplazo
    const validName = fileName.replace(invalidCharsRegex, replacementChar);

    return validName.trim(); // Eliminar espacios en blanco al principio y al final del nombre
}

async function runCommand(command) {
    Log(command);
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                error = ParseOuput(error);
                reject(error);
                return;
            }
            stdout = ParseOuput(stdout);
            resolve(stdout);
        });
    });
}

async function createChanel(chanel) {
    let OutputCmd = await runCommand("chia data create_data_store -m " + chanel.Fee);

    return OutputCmd;
}
async function IsChanelConfirmed(idChanel) {
    let OutputCmd = await runCommand("chia data get_root --id " + idChanel);
    return OutputCmd;
}
async function IsChanelDetailsConfirmed(idChanel) {
    let KeyIsChanel = StringtoHex("IsChanel");
    let OutputCmd = await runCommand("chia data get_value --id " + idChanel + " --key " + KeyIsChanel);
    return OutputCmd;
}
async function GetChanels() {
    let Chanels = [];
    let KeyIsChanel = StringtoHex("IsChanel");
    let KeyName = StringtoHex("Name");
    let KeyImage = StringtoHex("Image");
    let OutputCmd = await runCommand("chia data get_subscriptions");
    if (OutputCmd.store_ids !== undefined) {
        for (let i = 0; i < OutputCmd.store_ids.length; i++) {
            let OutputIsChanel = await runCommand("chia data get_value --id " + OutputCmd.store_ids[i] + " --key " + KeyIsChanel);
            if (OutputIsChanel.value === undefined)
                continue;

            let OuputName = await runCommand("chia data get_value --id " + OutputCmd.store_ids[i] + " --key " + KeyName);
            let OuputImage = await runCommand("chia data get_value --id " + OutputCmd.store_ids[i] + " --key " + KeyImage);
            if (OuputName.value !== undefined && OuputImage.value !== undefined) {
                let Chan = { Name: hexToString(OuputName.value), Image: hexToBase64(OuputImage.value), Id: OutputCmd.store_ids[i] };
                Chanels.push(Chan);
            }

        }
    }
    return Chanels;
}
async function InsertChanelDetails(chanel) {
    let Image = await processImage(chanel.Image);
    Image = base64ToHex(Image);
    let KeyIsChanel = StringtoHex("IsChanel");
    let KeyImage = StringtoHex("Image");
    let KeyName = StringtoHex("Name");
    let IsChanel = StringtoHex("true");
    let Name = StringtoHex(chanel.Name);

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

    let OutputCmd = await runCommand(`chia rpc data_layer batch_update  -j ${filePath}`);
    fs.unlinkSync(filePath);
    return OutputCmd;
}
function StringtoHex(text) {
    var hexString = "";

    for (var i = 0; i < text.length; i++) {
        var hex = text.charCodeAt(i).toString(16);
        hexString += (hex.length === 2 ? hex : "0" + hex);
    }

    return hexString;
}

function hexToString(hex) {
    var string = '';
    for (var i = 0; i < hex.length; i += 2) {
        var byte = parseInt(hex.substr(i, 2), 16);
        string += String.fromCharCode(byte);
    }
    return string;
}

function base64ToHex(base64String) {
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
}

function hexToBase64(hexString) {
    // Convert the hexadecimal string to Uint8Array
    var bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    // Convert the Uint8Array to Base64 string
    var base64String = btoa(String.fromCharCode.apply(null, bytes));

    // Add the data URL prefix if needed
    if (!base64String.startsWith("data:")) {
        base64String = "data:image/png;base64," + base64String;
    }

    return base64String;
}

function ParseOuput(output) {
    output = output.replace(/'/g, '"');
    output = output.replace(/'/g, '"');
    output = output.replace(/True/gi, "true")
    output = output.replace(/False/gi, "false")
    output = output.replace(/None/gi, '"None"')
    Log(output);
    let regex = /ValueError:/;
    if (regex.test(output)) {
        var errorIndex = output.indexOf("ValueError: ");
        output = output.substring(errorIndex + "ValueError: ".length);
    }
    output = JSON.parse(output);
    return output;
}
function processImage(FilePath) {
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

        //   const rutaCarpeta = 'video'; // Ruta de la carpeta donde se guardaría la imagen redimensionada
        //   const nombreArchivo = 'imagen_redimensionada.jpg'; // Nombre del archivo redimensionado
        //   const rutaDestino = `${rutaCarpeta}/${nombreArchivo}`;

        //   // Guardar la imagen redimensionada en la carpeta especificada (opcional)
        //   fs.writeFileSync(rutaDestino, imagenRedimensionada.toJPEG(100));

        // Devolver la imagen redimensionada en formato Base64
        return imagenBase64;
    } else {
        const imagenBase64 = img.toDataURL();
        return imagenBase64;
    }
}
function Log(_data) {
    if (IsLogEnabled) {
        console.log(_data);
    }
}

module.exports = {
    splitFileIntoChunks,
    reconstructMP4FromChunks,
    runCommand,
    createChanel,
    IsChanelConfirmed,
    InsertChanelDetails,
    IsChanelDetailsConfirmed,
    GetChanels
};