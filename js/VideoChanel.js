function VideoChanel(IdVideo, TotalChunks, VideoName, Size, IdChanel, ChanelName) {
    this.Id = IdVideo;
    this.TotalChunks = TotalChunks;
    this.Size = Size;
    this.Name = VideoName;
    this.ChanelName = ChanelName;
    this.IdChanel = IdChanel;
    this.videoElement = document.getElementById("my-video");
    this.HexBuffer = [];
    this.NextIndexHexBuffer = 0;
    this.ByteFile = [];
    this.ActiveRequests = 0;
    this.PercentageLoaded = 0;
    this.currentTime = 0;
}
VideoChanel.prototype.AddChunkToBytes = function (chunkHex) {
    for (var i = 0; i < chunkHex.length; i += 2) {
        var byte = parseInt(chunkHex.substr(i, 2), 16);
        this.ByteFile.push(byte);
    }
}
VideoChanel.prototype.ProcessChunks = function () {
    for (let i = 0; i < this.HexBuffer.length; i++) {
        if (this.NextIndexHexBuffer === i && this.HexBuffer[i] !== undefined) {
            this.AddChunkToBytes(this.HexBuffer[i]);
            this.NextIndexHexBuffer++;
            this.HexBuffer[i] = undefined;
        }
    }
    if (this.NextIndexHexBuffer == 1 || this.NextIndexHexBuffer == this.TotalChunks) {
        console.log("Video ready");
        var blob = new Blob([new Uint8Array(this.ByteFile)], {
            type: 'application/octet-stream'
        });
        this.currentTime = this.videoElement.currentTime;
        let IsPaused = this.videoElement.paused;

        var urlBlob = URL.createObjectURL(blob);
        this.videoElement.src = urlBlob;
        this.videoElement.currentTime = this.currentTime;
        if (!IsPaused) {
            this.videoElement.play();
        }
    }
}
VideoChanel.prototype.GetChunk = function (ChunkIndex) {
    if (this.NextIndexHexBuffer + 1 > ChunkIndex || this.HexBuffer[ChunkIndex - 1] !== undefined)
        return;
    this.ActiveRequests++;
    window.electronAPI.GetChunk(this.Id, ChunkIndex, this.TotalChunks).then((chunkHex) => {
        this.ActiveRequests--;
        if (chunkHex !== null) {
            console.log("Chunk found " + ChunkIndex + " of " + this.TotalChunks);
            this.HexBuffer[ChunkIndex - 1] = chunkHex;
            this.ProcessChunks();
        }

    });
}
VideoChanel.prototype.SetProgressBar = async function () {
    this.videoElement.setAttribute('max', this.PercentageLoaded);
    const progressBar = document.getElementById('progress-bar');

    this.videoElement.addEventListener('timeupdate', () => {
        if (this.videoElement.currentTime === undefined)
            return;
        // Obtener el porcentaje actual cargado
        const currentTime = this.videoElement.currentTime;
        const totalDuration = this.videoElement.duration;
        const currentPercentage = (currentTime / totalDuration) * 100;

        // Verificar si el porcentaje actual excede el porcentaje cargado
        if (this.PercentageLoaded != 100 && currentPercentage > (this.PercentageLoaded - 5)) {
            // Establecer el tiempo actual del video al máximo permitido
            this.videoElement.currentTime = ((this.PercentageLoaded - 5) / 100) * totalDuration;
        }
    });
    this.videoElement.setAttribute('max', this.PercentageLoaded);

    while (this.PercentageLoaded < 100 && AppView.Id !==undefined && AppView.Id == this.Id) {
        progressBar.style.width = this.PercentageLoaded + '%';
        progressBar.setAttribute('aria-valuenow', this.PercentageLoaded);
        progressBar.innerHTML = Math.floor( this.PercentageLoaded) + '%';
        // Esperar 1 segundo antes de volver a obtener el porcentaje
        await util.sleep(1000);
        this.PercentageLoaded = await window.electronAPI.PercentageLoaded();
        this.videoElement.setAttribute('max', this.PercentageLoaded);
        console.log(this.PercentageLoaded);
        if (this.PercentageLoaded == 100) {
            progressBar.style.width = this.PercentageLoaded + '%';
            progressBar.innerHTML = Math.floor(this.PercentageLoaded) + '%';
            progressBar.setAttribute('aria-valuenow', this.PercentageLoaded);
            break;
        }
    }
}
VideoChanel.prototype.Init = async function () {
    LblVideoName.innerHTML = this.Name;
    BtnReturnToChanel.innerHTML = this.ChanelName;
    var clonedElement = BtnReturnToChanel.cloneNode(true);
    BtnReturnToChanel.parentNode.replaceChild(clonedElement, BtnReturnToChanel);
    clonedElement.addEventListener('click', () => {
        util.GoChanel(this.IdChanel, this.ChanelName);
    });
    var btnCreateChanelModal = document.getElementById('BtnCreateChanelModal');
    var btnSubscribeChanelModal = document.getElementById('BtnSubscribeChanelModal');
    var btnAddVideoModal = document.getElementById('BtnAddVideoModal');
    btnSubscribeChanelModal.style.display = 'none';
    btnCreateChanelModal.style.display = 'none';
    btnAddVideoModal.style.display = 'none';
    let IsPrepared = await window.electronAPI.PrepareVideo(this.Id, this.TotalChunks, this.Size);
    this.SetProgressBar();
    while (this.PercentageLoaded < 15 && AppView.Id !==undefined && AppView.Id == this.Id) {
        await util.sleep(1000);
    }
    if(AppView.Id !== this.Id)
    {
        return;
    }
    console.log("Video prepared");
    this.videoElement.src = `http://localhost:8000/CurrentPlayer?timestamp=${Date.now()}`
    this.videoElement.play();
    
};

VideoChanel.prototype.hexToBytes = function (hex) {
    const binaryString = atob(hex);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};
VideoChanel.prototype.SaveAsMP4 = async function () {
    const chunks = [];
    let i = 1;

    while (i <= this.TotalChunks) {
        let chunkHex = await window.electronAPI.GetChunk(this.Id, i, this.TotalChunks);
        if (chunkHex === null) {
            console.log("Chunk not found");
            break; // Salir del bucle while
        }

        console.log("Chunk found " + i + " of " + this.TotalChunks);
        chunks.push(chunkHex);
        i++; // Incrementar el contador
    }

    if (chunks.length === 0) {
        console.log("No chunks available");
        return;
    }

    const concatenatedChunks = chunks.join('');
    const chunkBytes = this.hexToBytes(concatenatedChunks);

    // Crear un Blob a partir de los bytes del video
    const blob = new Blob([chunkBytes], {
        type: 'video/mp4'
    });

    // Crear una URL para el Blob y generar un enlace de descarga
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'video.mp4';
    downloadLink.click();
};
VideoChanel.prototype.SaveConcatenatedChunks = async function () {
    const chunks = [];
    let i = 1;

    while (i <= this.TotalChunks) {
        let chunkHex = await window.electronAPI.GetChunk(this.Id, i, this.TotalChunks);
        if (chunkHex === null) {
            console.log("Chunk not found");
            break; // Salir del bucle while
        }

        console.log("Chunk found " + i + " of " + this.TotalChunks);
        chunks.push(chunkHex);
        i++; // Incrementar el contador
    }

    if (chunks.length === 0) {
        console.log("No chunks available");
        return;
    }

    const concatenatedChunks = chunks.join('');
    const blob = new Blob([concatenatedChunks], {
        type: 'text/plain'
    });

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'concatenatedChunks.txt';
    downloadLink.click();
};

VideoChanel.prototype.LoadChanel = async function () {
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Chanel.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new Chanel(this.IdChanel);
        AppView.Init();
    }
}