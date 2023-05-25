const fs = require('fs');
const path = require('path');



function splitFileIntoChunks(file_path, chunk_size) {
    chunk_size = chunk_size * 1024 * 1024; // Convertir de MB a bytes
    const fileData = fs.readFileSync(file_path);
    const fileDir = path.join(__dirname, 'video', convertToValidFolderName(path.basename(file_path)));
    const fileName = path.basename(file_path, path.extname(file_path));
  
    // Verificar si el directorio existe y eliminarlo si es necesario
    if (fs.existsSync(fileDir)) {
      fs.rmdirSync(fileDir, { recursive: true });
    }
  
    // Crear el directorio
    fs.mkdirSync(fileDir, { recursive: true });
  
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
  
    console.log(`El archivo MP4 ha sido dividido en ${chunk_number - 1} fragmentos.`);
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
        const dummyData = Buffer.alloc(10 * 1024 * 1024); // Tamaño del chunk dummy (10MB)
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
  
    console.log(`Los fragmentos en '${chunk_directory}' han sido combinados en el archivo '${output_file}'.`);
    return output_file;
  }
  
  
function convertToValidFolderName(fileName) {
    const invalidCharsRegex = /[^a-zA-Z0-9]/g;
    const replacementChar = "-"; // Carácter a utilizar como reemplazo para los caracteres no permitidos
  
    // Reemplazar los caracteres no permitidos con el carácter de reemplazo
    const validName = fileName.replace(invalidCharsRegex, replacementChar);
  
    return validName.trim(); // Eliminar espacios en blanco al principio y al final del nombre
}

module.exports = {
    splitFileIntoChunks,
    reconstructMP4FromChunks
};
  