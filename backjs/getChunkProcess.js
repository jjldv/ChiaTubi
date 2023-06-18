const VideoFile = require('./VideoFile');
const Utils = require('./Utils');
const VFile = new VideoFile();
const utils = new Utils();

process.on('message', async (data) => {
    const {
        Id,
        ChunkIndex,
        TotalChunks,
        AppPath
    } = data;

    try {
        const chunkHex = await VFile.getChunk(Id, ChunkIndex, TotalChunks, AppPath);
        process.send(chunkHex);
    } catch (error) {
        console.log(error);
        process.send(null);
    }
});
