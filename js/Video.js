function Video() {
    //Add Video
    this.ModalAdd = null;
    this.addVideo = this.addVideo.bind(this);
    this.removeModalAdd = this.removeModalAdd.bind(this);
    this.selectVideoImage = this.selectVideoImage.bind(this);
    this.selectVideoFile = this.selectVideoFile.bind(this);
    this.ImagePath = null;
    this.VideoPath = null;
    this.ModalAddBootstrap = null;
    
    //Subscribe Video
    this.ModalSubscribe = null;
    this.subscribe = this.subscribe.bind(this);
    this.removeModalSubscribe = this.removeModalSubscribe.bind(this);
    this.ModalSubscribeBootstrap = null;

    //Add Custom Mirror
    this.ModalAddCustomMirror = null;
    this.addCustomMirror = this.addCustomMirror.bind(this);
    this.removeModalAddCustomMirror = this.removeModalAddCustomMirror.bind(this);
    this.ModalAddCustomMirrorBootstrap = null;

    
    fetch('./view/include/AddVideoModal.html')
        .then(response => response.text())
        .then(html => {
            this.ModalAdd = this.createDOMElementFromHTML(html);
            this.ModalAdd.addEventListener('hidden.bs.modal', this.removeModalAdd.bind(this));
        });
    fetch('./view/include/SubscribeVideoModal.html')
        .then(response => response.text())
        .then(html => {
            this.ModalSubscribe = this.createDOMElementFromHTML(html);
            this.ModalSubscribe.addEventListener('hidden.bs.modal', this.removeModalSubscribe.bind(this));
        });
    fetch('./view/include/AddCustomMirrorModal.html')
        .then(response => response.text())
        .then(html => {
            this.ModalAddCustomMirror = this.createDOMElementFromHTML(html);
            this.ModalAddCustomMirror.addEventListener('hidden.bs.modal', this.removeModalAddCustomMirror.bind(this));
        });

    this.Pending = [];
    this.IsProcessingQueue = false;
    this.StopProcessingQueue = false;
}
Video.prototype.addVideo = async function () {
    console.log("AddVideo");
    let VidData = {
        Id: null,
        IdChanel: null,
        VideoPath: this.VideoPath,
        Image: this.ImagePath,
        Name: null,
        Fee: 0
    };
    VidData.Name = document.getElementById('videoName').value;
    VidData.Fee = document.getElementById('FeeAddVideo').value;

    if (VidData.Name === "" || VidData.VideoPath === null || VidData.Image === null) {
        util.showAlert("", "Name, File Video and Image are required");
        return;
    }


    util.showLoading("Registering Video");

    let Response = await BackendApi.createVideoStore(VidData);
    if (Response.status === "error") {
        util.hideLoading();
        util.showAlert("", Response.message);
        return;
    }
    VidData = Response.Video;
    console.log(VidData);
    let Card = this.cardVideo(VidData);
    PendingContainer.insertAdjacentHTML('beforeend', Card);
    this.setPendingNumber();
    this.Pending.push(VidData);
    this.hideModalAdd();
    util.hideLoading();
    await util.sleep(3000);
    this.processQueue();
}
Video.prototype.subscribe = async function () {
    console.log("subscribe");
 
    let IdStore = document.getElementById('IdVideoSubscribe').value;

    if (IdStore === "" ) {
        util.showAlert("", "Id Store required");
        return;
    }

    let VidData = {
        Id: IdStore,
        IdChanel: null,
        VideoPath: null,
        Image: "img/imgplaceholder.png",
        Name: "----",
        Fee: 0
    };

    util.showLoading("Subscribing");

    let Response = await BackendApi.subscribeVideo(VidData);
    if (Response.status === "error") {
        util.hideLoading();
        util.showAlert("", Response.message);
        return;
    }
    let Card = this.cardVideo(VidData);
    PendingContainer.insertAdjacentHTML('beforeend', Card);
    this.setPendingNumber();
    this.Pending.push(VidData);
    this.ModalSubscribeBootstrap.hide();
    util.hideLoading();
    await util.sleep(3000);
    this.processQueue();
}
Video.prototype.unsubscribe = async function (IdVideo) {
    util.showLoading("Unsubscribing Video");
    let Response = await BackendApi.unsubscribeVideo(IdVideo);
    util.hideLoading();
    if (Response.status === "success" && document.getElementById(`Cont${IdVideo}`) ) {
        let Card = document.getElementById(`Cont${IdVideo}`);
        Card.remove();
        return;
    }
}
Video.prototype.openModalAdd = function () {
    document.body.appendChild(this.ModalAdd);
    this.ModalAddBootstrap = new bootstrap.Modal(this.ModalAdd);

    let BtnAddVideoModal = this.ModalAdd.querySelector('#BtnAddVideoModal');
    let BtnSelectVideoFile = this.ModalAdd.querySelector('#BtnSelectVideoFile');
    let previewVideoImage = this.ModalAdd.querySelector('#previewVideoImage');

    BtnAddVideoModal.addEventListener('click', this.addVideo);
    BtnSelectVideoFile.addEventListener('click', this.selectVideoFile);
    previewVideoImage.addEventListener('click', this.selectVideoImage);

    this.ModalAddBootstrap.show();
};
Video.prototype.openModalSubscribe = function () {
    document.body.appendChild(this.ModalSubscribe);
    this.ModalSubscribeBootstrap = new bootstrap.Modal(this.ModalSubscribe);
    let BtnSubscribeVideo = this.ModalSubscribe.querySelector('#BtnSubscribeVideo');
    
    BtnSubscribeVideo.addEventListener('click', this.subscribe);

    this.ModalSubscribeBootstrap.show();
    
};
Video.prototype.openModalAddCustomMirror = function (IdStore) {
    document.body.appendChild(this.ModalAddCustomMirror);
    this.ModalAddCustomMirrorBootstrap = new bootstrap.Modal(this.ModalAddCustomMirror);
    let BtnAddCustomMirror = this.ModalAddCustomMirror.querySelector('#BtnAddCustomMirror');
    
    BtnAddCustomMirror.addEventListener('click', this.addCustomMirror);

    CustomMirror.value = `http://${PublicIP}:8575`;

    this.ModalAddCustomMirrorBootstrap.show();
    IdStoreCustomMirror.value = IdStore;
    
}
Video.prototype.hideModalAdd = async function () {
    this.ModalAddBootstrap.hide();
}
Video.prototype.removeModalAdd = function () {
    let BtnAddVideoModal = this.ModalAdd.querySelector('#BtnAddVideoModal');
    let BtnSelectVideoFile = this.ModalAdd.querySelector('#BtnSelectVideoFile');
    let previewVideoImage = this.ModalAdd.querySelector('#previewVideoImage');

    BtnAddVideoModal.removeEventListener('click', this.addVideo);
    BtnSelectVideoFile.removeEventListener('click', this.selectVideoFile);
    previewVideoImage.removeEventListener('click', this.selectVideoImage);
    this.ImagePath = null;
    this.VideoPath = null;
    document.getElementById('previewVideoImage').src = "img/imgplaceholder.png";
    FileNameAddVideo.innerHTML = "";
    videoName.value = "";
    FeeAddVideo.value = "0";
    this.ModalAddBootstrap.hide();
    this.ModalAddBootstrap.dispose();
    document.getElementById(this.ModalAdd.id).remove();
    this.ModalAdd.removeEventListener('hidden.bs.modal', this.removeModalAdd);
};
Video.prototype.removeModalSubscribe = function () {
    let BtnSubscribeVideo = this.ModalSubscribe.querySelector('#BtnSubscribeVideo');

    BtnSubscribeVideo.removeEventListener('click', this.subscribe);
    IdVideoSubscribe.value = "";
    this.ModalSubscribeBootstrap.hide();
    this.ModalSubscribeBootstrap.dispose();
    document.getElementById(this.ModalSubscribe.id).remove();
    this.ModalAdd.removeEventListener('hidden.bs.modal', this.removeModalSubscribe);
}
Video.prototype.removeModalAddCustomMirror = function () {
    let BtnAddCustomMirror = this.ModalAddCustomMirror.querySelector('#BtnAddCustomMirror');
    BtnAddCustomMirror.removeEventListener('click', this.addCustomMirror);
    CustomMirrorFee.value = "0";
    CustomMirror.value = "";
    IdStoreCustomMirror.value = "";
    this.ModalAddCustomMirrorBootstrap.hide();
    this.ModalAddCustomMirrorBootstrap.dispose();
    document.getElementById(this.ModalAddCustomMirror.id).remove();
    this.ModalAdd.removeEventListener('hidden.bs.modal', this.removeModalAddCustomMirror);
    
    
}
Video.prototype.createDOMElementFromHTML = function (htmlString) {
    var range = document.createRange();
    var fragment = range.createContextualFragment(htmlString);
    return fragment.firstChild;
};
Video.prototype.selectVideoFile = async function () {
    let FileNameAddVideo = this.ModalAdd.querySelector('#FileNameAddVideo');
    this.VideoPath = null;
    FileNameAddVideo.innerHTML = "";
    let FilePath = await BackendApi.openFile("Mp4 files", "mp4");
    this.VideoPath = FilePath;
    FileNameAddVideo.innerHTML = FilePath ? FilePath.split('\\').pop() : "";

}
Video.prototype.selectVideoImage = async function () {
    this.ImagePath = null;
    let FilePath = await BackendApi.openFile("Profile Image", "jpg");
    document.getElementById('previewVideoImage').src = FilePath ?? "img/imgplaceholder.png";
    this.ImagePath = FilePath ?? null;

}
Video.prototype.cardVideo = function (Video, IsVideoConfirmed = false) {
    let FontColor = IsVideoConfirmed ? "white" : "black";
    let BtnRemove = IsVideoConfirmed ? `<button class="btn btn-danger" style="width:100%;" onclick="video.unsubscribe('${Video.Id}')">Unsubscribe</button>` : `<button class="btn btn-danger" style="width:100%;" onclick="video.cancelPending('${Video.Id}')">Cancel</button>`;
    let OnclickLoad = IsVideoConfirmed ? `onclick="util.GoPlayer('${Video.Id}',${Video.TotalChunks},'${Video.Name}',${Video.Size},'${Video.IdChanel}')"` : "";
    let CardElement = `
        <a href="#" id="Cont${Video.Id}" class="Cont${Video.Id}"   title="${Video.Name} - Store Id:${Video.Id}" style="text-decoration:none;text-align:center;">
            <img src="${Video.Image??'img/imgplaceholder.png'}" ${OnclickLoad} alt="${Video.Name}">
            <div class="card-body">
              <h5 class="card-title-${!IsVideoConfirmed?"pending":""}" style="color:${FontColor}">${Video.Name}</h5>
              <p class="card-text-${!IsVideoConfirmed?"pending":""}"  id="Status_${Video.Id}" style="display:${IsVideoConfirmed ? "none" : "block"};color:${FontColor}">----</p>
              ${BtnRemove}
            </div>
        </a>
    `;

    return CardElement;
}

Video.prototype.loadPending = async function () {
    let Response = await BackendApi.getPendingVideos();
    console.log(Response);
    if (Response.Videos !== undefined && Response.Videos.length > 0) {
        this.mergeWithPending(Response.Videos);
        PendingNumber.innerHTML = `(${Response.Videos.length})`;
        Response.Videos.forEach(Video => {
            let Card = this.cardVideo(Video) + "<br>";
            PendingContainer.insertAdjacentHTML('beforeend', Card);
        });
    }
    this.processQueue();
}
Video.prototype.mergeWithPending = async function (Videos) {
    if (!this.Pending) {
        this.Pending = [];
    }
    const uniqueMap = new Map();

    this.Pending.forEach(obj => {
        uniqueMap.set(obj.Id, obj);
    });
    Videos.forEach(obj => {
        uniqueMap.set(obj.Id, obj);
    });
    this.Pending = Array.from(uniqueMap.values());
};
Video.prototype.deletePending = async function (Id) {
    let Response = await BackendApi.deletePending(Id);
    if (Response.status === "error") {
        util.showAlert("", Response.message);
        return;
    }
    let Card = document.getElementById(`Cont${Id}`);
    if (Card !== null)
        Card.remove();
    
    let elements = document.querySelectorAll(`.Cont${Id}`);
    elements.forEach(element => {
        element.remove();
    })
    this.Pending = this.Pending.filter(video => video.Id !== Id);
    this.setPendingNumber();

}
Video.prototype.cancelPending = async function (IdVideo) {
    let Response = await BackendApi.deletePending(IdVideo);
    if (Response.status === "error") {
        util.showAlert("", Response.message);
        return;
    }
    let Card = document.getElementById(`Cont${IdVideo}`);
    Card.remove();
    if (this.Pending.length >= 1 && this.Pending[0].Id == IdVideo) {
        this.StopProcessingQueue = true;
    }
    this.Pending = this.Pending.filter(video => video.Id !== IdVideo);
    this.setPendingNumber();

}
Video.prototype.setPendingNumber = function (Number) {
    const pendingContainer = document.getElementById('PendingContainer');
    const links = pendingContainer.querySelectorAll('a');
    const count = links.length;
    PendingNumber.innerHTML = `(${count})`
}
Video.prototype.processQueue = async function () {
    if (this.IsProcessingQueue) {
        console.log("skiped already one processQueue");
        return;
    }
    console.log("procesing...");
    this.setIsProcessingQueue(true);
    while (this.Pending.length > 0 && this.StopProcessingQueue === false) {
        switch (this.Pending[0].Type) {
            case "VideoInsert":
                await this.processVideo(this.Pending[0]);
                break;
            case "VideoSubscription":
                await this.processSubscription(this.Pending[0]);
                break;
            case "DeleteMirror":
                await this.processDeleteMirror(this.Pending[0]);
                break;
            case "AddCustomMirror":
                await this.processAddCustomMirror(this.Pending[0]);
                break;
            default:
                this.StopProcessingQueue = true;
                break;
        }
    }
    this.setIsProcessingQueue(false);
    console.log("end processQueue");
}
Video.prototype.processAddCustomMirror = async function (Mirror) {
    if (this.StopProcessingQueue) {
        return;
    }
    let IsMirrorConfirmed = false;
    while (!IsMirrorConfirmed && !this.StopProcessingQueue) {
        let RIsConfirmed = await BackendApi.confirmMirror(Mirror.IdStore,Mirror.Mirror);
        if (RIsConfirmed.status === "error") {
            await util.sleep(2000);
        } else
            IsMirrorConfirmed = true;
    }
    if (this.StopProcessingQueue)
        return;
    if(document.getElementById(`MirrorList`)){

    }

    await this.deletePending(Mirror.Id);
    this.loadMirrors(Mirror.IdStore);
}
Video.prototype.loadMirrors = async function (IdStore) {
    let MirrorList = document.getElementById("MirrorList");
    if (MirrorList === null) {
        return;
    }
    MirrorList.innerHTML = "Loading Mirrors...";
    let RMirrors = await BackendApi.getMirrors(IdStore);
    MirrorList.innerHTML = RMirrors.mirrors === undefined || RMirrors.mirrors.length == 0 ? "No Mirrors Found<br>"  : "";
    if (RMirrors.mirrors !== undefined && RMirrors.mirrors.length > 0) {
        this.setMirrorList(RMirrors.mirrors, IdStore);
    }
}
Video.prototype.setMirrorList = async function (Mirrors , IdStore) {
    let MirrorList = document.getElementById("MirrorList");
    MirrorList.innerHTML = "";
    for (let i = 0; i < Mirrors.length; i++) {
        let Mirror = Mirrors[i];
        let LiMirror = await this.liMirror(Mirror,IdStore) + "<br>";
        MirrorList.insertAdjacentHTML('beforeend', LiMirror);
    }
}
Video.prototype.liMirror = async function (Mirror,IdStore) {
    let urlsHTML = '';
    if (Mirror.urls && Mirror.urls.length > 0) {
        urlsHTML = Mirror.urls
            .map((url) => `<li>${url}</li>`)
            .join('');
    }
    let showRemoveButton = Mirror.ours;
    let removeButtonHTML = '';
    if (showRemoveButton) {
        removeButtonHTML = `<button class="btn btn-danger remove-btn" title="Remove Mirror" id="DeleteMirror${Mirror.coin_id}" onclick="video.deleteMirror('${Mirror.coin_id}','${IdStore}')"><i class="fas fa-trash"></i></button>`;
    }
    let IsOnline = await util.isUrlAccessible(Mirror.urls[0]+"/download");
    let StatusIcon = IsOnline ? "online-icon" : "offline-icon";
    let LiElement = `
      <li data-urls="${Mirror.urls}" class="Cont${Mirror.coin_id}" id="Cont${Mirror.coin_id}">
        <i class="${Mirror.ours ? 'fas fa-desktop' : 'fas fa-globe'}"></i> ${Mirror.ours ? 'Local' : 'Remote'} Mirror
        <i class="fas fa-check-circle ${StatusIcon}" id="StatusIcon${Mirror.coin_id}"></i>
        ${removeButtonHTML}
        <ul>${urlsHTML}</ul>
      </li>
    `;
    return LiElement;
};
Video.prototype.processDeleteMirror = async function (Coin) {
    if (this.StopProcessingQueue) {
        return;
    }
    let IsDeleteConfirmed = false;
    while (!IsDeleteConfirmed && !this.StopProcessingQueue) {
        let RIsConfirmed = await BackendApi.confirmDeleteMirror(Coin.Id,Coin.IdStore);
        if (RIsConfirmed.status === "error") {
            await util.sleep(2000);
        } else
            IsDeleteConfirmed = true;
    }
    if (this.StopProcessingQueue)
        return;
    await this.deletePending(Coin.Id);
}
Video.prototype.processSubscription = async function (Video) {
    if (this.StopProcessingQueue) {
        return;
    }
    if (document.getElementById(`Status_${Video.Id}`))
        document.getElementById(`Status_${Video.Id}`).innerHTML = "Checking Store"
    let IsVideoStoreConfirmed = false;
    while (!IsVideoStoreConfirmed && !this.StopProcessingQueue) {
        let RIsConfirmed = await BackendApi.confirmSubscription(Video.Id);
        if (RIsConfirmed.status === "error") {
            await util.sleep(2000);
        } else {
            if (document.getElementById(`Status_${Video.Id}`))
                document.getElementById(`Status_${Video.Id}`).innerHTML = "Confirmed"
            IsVideoStoreConfirmed = true;
            Video = RIsConfirmed.Video;
        }
    }
    if (this.StopProcessingQueue)
        return;
    await this.deletePending(Video.Id);
    if (document.getElementById('VideoSubscriptions')) {
        let Card = this.cardVideo(Video, true);
        VideoSubscriptions.insertAdjacentHTML('beforeend', Card);
    }
}
Video.prototype.processVideo = async function (Video) {
    if (this.StopProcessingQueue) {
        return;
    }
    await this.confirmStore(Video.Id);
    await this.insertChunk(Video);
    await this.addMirror(Video);
    
    if (this.StopProcessingQueue)
        return;
    await this.deletePending(Video.Id);
    if (document.getElementById('VideoSubscriptions')) {
        let Card = this.cardVideo(Video, true);
        VideoSubscriptions.insertAdjacentHTML('beforeend', Card);
    }
}
Video.prototype.addCustomMirror = async function () {
    console.log("subscribe");
 
    let IdStore = document.getElementById('IdStoreCustomMirror').value;
    let CustomMirror = document.getElementById('CustomMirror').value;
    let CustomMirrorFee = document.getElementById('CustomMirrorFee').value;

    if (IdStore === ""  || CustomMirror === "" || CustomMirrorFee === "") {
        util.showAlert("", "Id Store and mirror is required");
        return;
    }
    let Uid = util.uId();
    let MirrorC = {
        Id: Uid,
        IdStore: IdStore,
        Image: "img/imgplaceholder.png",
        Name: "Inserting Mirror "+CustomMirror,
        Mirror : CustomMirror,
        Type: "AddCustomMirror",
        Fee: CustomMirrorFee
    };

    util.showLoading("Adding mirror...");

    let Response = await BackendApi.addCustomMirror(MirrorC);
    if (Response.status === "error") {
        util.hideLoading();
        util.showAlert("", Response.message);
        return;
    }
    let Card = this.cardVideo(MirrorC);
    PendingContainer.insertAdjacentHTML('beforeend', Card);
    this.setPendingNumber();
    this.Pending.push(MirrorC);
    this.ModalAddCustomMirrorBootstrap.hide();
    util.hideLoading();
    await util.sleep(3000);
    this.processQueue();
    
}
Video.prototype.deleteMirror = async function (CoinId,IdStore) {
    let result = await Swal.fire({
        title: 'Remove Mirror',
        text: 'Are you sure you want to remove this Mirror?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Remove',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    })
    if (!result.isConfirmed) {
        return;
    }
    util.showLoading("Removing Mirror...");
    let RRemove = await BackendApi.deleteMirror(CoinId, IdStore);
    util.hideLoading();
    if (RRemove.status !== undefined && RRemove.status === "error") {
        util.showAlert("Error", RRemove.message);
        return;
    }
    let PendingData = {
        Id: CoinId,
        IdStore:IdStore,
        Name: "Removing Mirror",
        Type: "DeleteMirror"
    };
    if(document.getElementById(`DeleteMirror${CoinId}`))
        document.getElementById(`DeleteMirror${CoinId}`).remove();
    let Card = this.cardVideo(PendingData);
    PendingContainer.insertAdjacentHTML('beforeend', Card);
    this.setPendingNumber();
    this.Pending.push(PendingData);
    this.processQueue();

}
Video.prototype.addMirror = async function (Video) {
    if (this.StopProcessingQueue) {
        return;
    }
    if (document.getElementById(`Status_${Video.Id}`))
        document.getElementById(`Status_${Video.Id}`).innerHTML = "Adding Mirror"
    let IsMirroAdded = false;
    while (!IsMirroAdded && !this.StopProcessingQueue) {
        let ResponseAdd = await BackendApi.addMirror(Video);
        if (ResponseAdd.PublicIP === null) {
            return;
        }
        if(ResponseAdd.status === "error"){
            await util.sleep(2000);
        }
        if(ResponseAdd.status === "success"){
            IsMirroAdded = true;
        }
    }

    if (document.getElementById(`Status_${Video.Id}`) && !this.StopProcessingQueue)
        document.getElementById(`Status_${Video.Id}`).innerHTML = "Confirming Mirror"
    let IsMirrorConfirmed = false;
    while (!IsMirrorConfirmed && !this.StopProcessingQueue) {
        let RIsMirrorAdded = await BackendApi.confirmMirror(Video.Id,null);
        if (RIsMirrorAdded.status === "error") {
            await util.sleep(2000);
        } else {
            if (document.getElementById(`Status_${Video.Id}`) && !this.StopProcessingQueue)
                document.getElementById(`Status_${Video.Id}`).innerHTML = "Mirror Confirmed"
            IsMirrorConfirmed = true;
        }
    }
}
Video.prototype.confirmStore = async function (IdVideo) {
    if (this.StopProcessingQueue) {
        return;
    }
    if (document.getElementById(`Status_${IdVideo}`))
        document.getElementById(`Status_${IdVideo}`).innerHTML = "Checking Store"
    let IsVideoStoreConfirmed = false;
    while (!IsVideoStoreConfirmed && !this.StopProcessingQueue) {
        let RIsConfirmed = await BackendApi.isStoreConfirmed(IdVideo);
        if (RIsConfirmed.hash === undefined) {
            await util.sleep(2000);
        } else {
            if (document.getElementById(`Status_${IdVideo}`))
                document.getElementById(`Status_${IdVideo}`).innerHTML = "Storing Video"
            IsVideoStoreConfirmed = true;
        }
    }
}
Video.prototype.insertChunk = async function (Video) {
    if (this.StopProcessingQueue) {
        return;
    }
    let IsCompleted = false;
    while (!IsCompleted && !this.StopProcessingQueue) {
        let RInsert = await BackendApi.insertChunk(Video);
        console.log(RInsert);
        if (document.getElementById(`Status_${Video.Id}`))
            document.getElementById(`Status_${Video.Id}`).innerHTML = RInsert.message ?? "Storing Video";
        if (RInsert.IsCompleted !== undefined && RInsert.IsCompleted) {
            IsCompleted = true;
        } else {
            await util.sleep(10000);
        }
    }
}
Video.prototype.setIsProcessingQueue = function (value) {
    this.IsProcessingQueue = value;
    this.handleProcessingQueueChange();
};
Video.prototype.handleProcessingQueueChange = async function () {
    if (this.StopProcessingQueue === true) {
        await util.sleep(1000);
        this.StopProcessingQueue = false;
        this.processQueue();
    }
};