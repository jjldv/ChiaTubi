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
    let VideosPending = await BackendApi.GetChanelVideosPending(this.Id);
    console.log(VideosPending);
    for (let i = 0; i < VideosPending.length; i++) {
        this.InsertCardVideo(VideosPending[i]);
        this.ConfirmVideo(VideosPending[i]);

    }
    let Videos = await BackendApi.GetChanelVideos(this.Id);

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
    util.showLoading("Registering Video");

    let Response = await BackendApi.CreateStore(Video.Fee);
    if (Response.status === "error") {
        util.hideLoading();
        alert(Response.message);
        return;
    }
    console.log(Response);
    Video.Id = Response.id;
    let CreateTemp = await BackendApi.CreateTempFileStore(Video,"Video","PendingInsert");
    console.log(CreateTemp);
    this.InsertCardVideo(Video);
    
    const modal = document.getElementById("AddVideoModal");

    modal.style.display = "none";
    util.hideLoading();
    await util.sleep(5000);
    this.ConfirmVideo(Video);
}
Chanel.prototype.ConfirmVideo = async function (Video) {
    console.log(Video.Id);
    let IsVideoStoreConfirmed = false;
    const element = document.getElementById(`Status_${Video.Id}`);
    while (!IsVideoStoreConfirmed) {
        let RIsConfirmed = await BackendApi.IsStoreConfirmed(Video.Id);
        console.log(RIsConfirmed);
        if (RIsConfirmed.hash === undefined) {
            await util.sleep(1000);
        } else {
            if(document.getElementById(`Status_${Video.Id}`))
                document.getElementById(`Status_${Video.Id}`).innerHTML = "Storing Video"
            IsVideoStoreConfirmed = true;
        }
    }
    let IsInserted = false;
    while (!IsInserted &&  AppView instanceof Chanel) {
        let RIsInserted = await BackendApi.InsertVideoFile(Video);
        console.log(RIsInserted);
        if(document.getElementById(`Status_${Video.Id}`))
            document.getElementById(`Status_${Video.Id}`).innerHTML = RIsInserted.message??"Storing Video";
        if (RIsInserted.IsCompleted !== undefined && RIsInserted.IsCompleted) {
            IsInserted = true;
        }
        else{
            await util.sleep(10000);
        }
    }
    if(Video.IdChanel === null && AppView instanceof Chanel && IsInserted){
        let DeleteTemp = await BackendApi.DeleteTempFileStore(Video, "Video", "PendingInsert");
        console.log(DeleteTemp);
        return
    }

    if(Video.IdChanel === null || !AppView instanceof Chanel){
        return;
    }

    if(document.getElementById(`Status_${Video.Id}`))
        document.getElementById(`Status_${Video.Id}`).innerHTML = "Adding to Chanel"
    await BackendApi.InsertVideoDetails(Video);
    let IsVideoDetailsConfirmed = false;

    while (!IsVideoDetailsConfirmed &&  AppView instanceof Chanel) {
        let RIsConfirmed = await BackendApi.IsKeyConfirmed(Video.IdChanel,"Video"+Video.Id);

        if (RIsConfirmed.error !== undefined) {
            await util.sleep(2000);
        } else {
            if(document.getElementById(`Status_${Video.Id}`))
                document.getElementById(`Status_${Video.Id}`).innerHTML = "Added to Chanel";
            IsVideoDetailsConfirmed = true;
        }
    }
    if(AppView instanceof Chanel && IsVideoDetailsConfirmed){
        let DeleteTemp = await BackendApi.DeleteTempFileStore(Video, "Video", "PendingInsert");
        console.log(DeleteTemp);

    }
}
Chanel.prototype.SelectVideoImage = async function () {
    this.ImagePath = null;
    let FilePath = await BackendApi.openFile("Profile Image", "jpg");
    document.getElementById('preview').src = FilePath ?? "img/imgplaceholder.png";
    this.ImagePath = FilePath ?? null;
}
Chanel.prototype.SelectVideoFile = async function () {
    this.VideoPath = null;
    let FilePath = await BackendApi.openFile("Mp4 files", "mp4");
    this.VideoPath = FilePath;
    //let FolderOuput = await BackendApi.splitFileIntoChunks(FilePath, this.ChunkSize);
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
    let BtnRemove = IsVideoConfirmed ? `<button class="btn btn-danger" style="width:100%;" onlick="Unsubscribe(${Video.Id})">Unsubscribe</button>` : "";
    let CardElement = `
        <a href="#" id="Cont${Video.Id}" onclick="AppView.LoadVideo('${Video.Id}',${Video.TotalChunks},'${Video.Name}',${Video.Size},'${Video.IdChanel}')" title="${Video.Name} - Store Id:${Video.Id}" style="text-decoration:none;text-align:center;">
            <img src="${Video.Image}" alt="${Video.Name}">
            <div class="card-body">
              <h5 class="card-title">${Video.Name}</h5>
              <p class="card-text" id="Status_${Video.Id}" style="display:${IsVideoConfirmed ? "none" : "block"}">Pending</p>
              ${BtnRemove}
              
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
