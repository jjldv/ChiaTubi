const ChiaDataLayer = require('./ChiaDataLayer');
const chiaDataLayer = new ChiaDataLayer();

process.on('message', async (data) => {
  const { Id, ChunkIndex, TotalChunks,AppPath } = data;
  
  try {
    const chunkHex = await chiaDataLayer.getChunk(Id, ChunkIndex, TotalChunks,AppPath);
    process.send(chunkHex);
  } catch (error) {
    console.error("Error fetching chunk:", error);
    process.send(null);
  }
});
