function Chanel(idChanel = null) {
    this.Id = idChanel;
    this.ImagePath = null;
    this.VideoPath = null;
}
Chanel.prototype.Init = async function () {
    let Response = await window.electronAPI.GetChanelVideos(this.Id);

    return Response;
}
Chanel.prototype.AddVideo = async function () {
    let Video = {Id:null,IdChanel:this.Id,VideoPath:this.VideoPath,ImagePath:this.ImagePath,Name:null,Fee:0};
    Video.Name = document.getElementById('videoName').value;
    Video.Fee = document.getElementById('Fee').value;

    // Validar que el nombre no esté vacío y la imagen no esté vacía
    if (Video.Name === "" || Video.VideoPath === null || Video.ImagePath === null) {
        alert("Name,Video and Image are required");
        return;
    }

    if ( Video.IdChanel === null) {
        alert("Chanel Id is required");
        return;
    }

    let Response = await window.electronAPI.CreateStore(Video.Fee);
    Video.Id = Response.id;
    this.InsertCardVideo(Video);

    let IsVideoStoreConfirmed = false;
    await util.sleep(5000);

    while (!IsVideoStoreConfirmed) {
        let RIsConfirmed = await window.electronAPI.IsStoreConfirmed(Video.Id);

        if (RIsConfirmed.hash === undefined) {
            await util.sleep(1000);
        } else {
            document.getElementById(`Status_${Response.id}`).innerHTML = "Store Created";
            IsVideoStoreConfirmed = true;
        }
    }

    let InsertVideoDetails = await window.electronAPI.InsertVideoDetails(Video);
    let IsVideoDetailsConfirmed = false;

    while (!IsVideoDetailsConfirmed) {
        let RIsConfirmed = await window.electronAPI.IsKeyConfirmed(Video.IdChanel,"Video"+Video.Id);

        if (RIsConfirmed.error !== undefined) {
            await util.sleep(1000);
        } else {
            document.getElementById(`Status_${Response.id}`).innerHTML = "Procesing video";
            IsVideoDetailsConfirmed = true;
        }
    }
}
Chanel.prototype.SelectVideoImage = async function () {
    this.ImagePath = null;
    let FilePath = await window.electronAPI.openFile("Profile Image", "jpg");
    document.getElementById('preview').src = FilePath ?? "img/imgplaceholder.png";
    this.ImagePath = FilePath ?? null;
}
Chanel.prototype.SelectVideoFile = async function () {
    this.VideoPath = null;
    let FilePath = await window.electronAPI.openFile("Mp4 files", "mp4");
    this.VideoPath = FilePath;
    //let FolderOuput = await window.electronAPI.splitFileIntoChunks(FilePath, this.ChunkSize);
    //this.Log(FolderOuput);
}
Chanel.prototype.GoHome = async function () {
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Home.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new Home();
        AppView.Init();
    }
}
Chanel.prototype.InsertCardVideo = function (Video, IsVideoConfirmed = false) {
    let CardElement = `
      <div class="col-sm-3" title="Store Id:${Video.Id}">
        <div class="card CardVideo" onclick="AppView.LoadVideo('${Video.Id}')">
          <img src="${Video.ImagePath}" class="card-img-top" alt="${Video.Name}">
          <div class="card-body">
            <h5 class="card-title">${Video.Name}</h5>
            <p class="card-text" id="Status_${Video.Id}" style="display:${IsVideoConfirmed ? "none" : "block"}">Pending</p>
            <button class="btn btn-danger" onlick="Unsubscribe(${Video.Id})">Unsubscribe</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('VideoList').innerHTML += CardElement;
}