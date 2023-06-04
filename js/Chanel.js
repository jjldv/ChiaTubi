function Chanel(IdChanel, Name) {
    this.Id = IdChanel;
    this.Name = Name;
    this.ImagePath = null;
    this.VideoPath = null;
}
Chanel.prototype.Init = async function () {
    document.getElementById('VideoList').innerHTML = "";
    BtnReturnToChanel.innerHTML = "";
    LblChanelName.innerHTML = this.Name;
    var btnCreateChanelModal = document.getElementById('BtnCreateChanelModal');
    var btnAddVideoModal = document.getElementById('BtnAddVideoModal');
    var btnSubscribeChanelModal = document.getElementById('BtnSubscribeChanelModal');
    btnSubscribeChanelModal.style.display = 'none';
    btnCreateChanelModal.style.display = 'none';
    btnAddVideoModal.style.display = 'block';

    let ModalAddVideo = new bootstrap.Modal(document.getElementById('AddVideoModal'));
    ModalAddVideo._element.addEventListener('hidden.bs.modal', function () {
        // Restablece los valores de los inputs
        document.getElementById('videoName').value = '';
        document.getElementById('Fee').value = '0';
        document.getElementById('preview').src = "img/imgplaceholder.png";
        this.ImagePath = null;
        this.VideoPath = null;
    })
    util.showLoading("Loading Videos...");
    let Videos = await window.electronAPI.GetChanelVideos(this.Id);

    for (let i = 0; i < Videos.length; i++) {
        this.InsertCardVideo(Videos[i], true);
    }
    util.hideLoading();
}
Chanel.prototype.AddVideo = async function () {
    let Video = {Id:null,IdChanel:this.Id,VideoPath:this.VideoPath,Image:this.ImagePath,Name:null,Fee:0};
    Video.Name = document.getElementById('videoName').value;
    Video.Fee = document.getElementById('Fee').value;

    // Validar que el nombre no esté vacío y la imagen no esté vacía
    if (Video.Name === "" || Video.VideoPath === null || Video.Image === null) {
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
        console.log(RIsConfirmed);
        if (RIsConfirmed.hash === undefined) {
            await util.sleep(1000);
        } else {
            document.getElementById(`Status_${Response.id}`).innerHTML = "Store Created";
            IsVideoStoreConfirmed = true;
        }
    }

    await window.electronAPI.InsertVideoDetails(Video);
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
    await window.electronAPI.InsertVideoFile(Video);
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
        <a href="#" onclick="AppView.LoadVideo('${Video.Id}',${Video.TotalChunks},'${Video.Name}',${Video.Size},'${Video.IdChanel}')" title="${Video.Name} - Store Id:${Video.Id}" style="text-decoration:none;text-align:center;">
            <img src="${Video.Image}" alt="${Video.Name}">
            <div class="card-body">
              <h5 class="card-title">${Video.Name}</h5>
              <p class="card-text" id="Status_${Video.Id}" style="display:${IsVideoConfirmed ? "none" : "block"}">Pending</p>
              <button class="btn btn-danger" style="width:100%;" onlick="Unsubscribe(${Video.Id})">Unsubscribe</button>
            </div>
        </a>
    `;

    document.getElementById('VideoList').innerHTML += CardElement;
}
Chanel.prototype.LoadVideo = async function (IdVideo,TotalChunks,VideoName,Size,IdChanel) {
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/VideoChanel.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new VideoChanel(IdVideo,TotalChunks,VideoName,Size,IdChanel,this.Name);
        AppView.Init();
    }
}