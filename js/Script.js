const { set } = require("video.js/dist/types/tech/middleware");

const ChunkSize = 10;

async function SelectFileToSplit() {
    let FilePath = await window.electronAPI.openFile();
    let FolderOuput = await window.electronAPI.splitFileIntoChunks(FilePath,ChunkSize);
    console.log(FolderOuput);
}
async function SelectFolderToMerge() {
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const FileName = `${uniqueId}.mp4`;
    const FolderPath = await window.electronAPI.openFolder();
    const FilePath = await window.electronAPI.reconstructMP4FromChunks(FolderPath, FileName, 6);
    setTimeout(() => {
        changeVideoSource(FilePath);
    }, 1000);
  }

  function changeVideoSource(newSrc) {
    let player = document.getElementById('my-video');
    player.src = (newSrc);
    
  }