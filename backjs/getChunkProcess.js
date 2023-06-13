const VideoFile = require('./VideoFile');
const VFile = new VideoFile();

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
        console.error("Error fetching chunk:", error);
        process.send(null);
    }
});