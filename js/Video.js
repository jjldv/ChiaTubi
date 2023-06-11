function Video() {
    this.ModalAdd = null;
    this.ModalSubscribe = null;
    this.removeModalAdd = this.removeModalAdd.bind(this);
    this.addVideo = this.addVideo.bind(this);
    this.selectVideoImage = this.selectVideoImage.bind(this);
    this.selectVideoFile = this.selectVideoFile.bind(this);
    this.removeModalSubscribe = this.removeModalSubscribe.bind(this);
    this.ImagePath = null;
    this.VideoPath = null;
    this.ModalAddBootstrap = null;
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
            this.ModalSubscribe.addEventListener('hidden.bs.modal', this.removeModalSubscribe);
        });
    this.Pending = [];
    this.IsProcessingQueue = false;
    this.StopProcessingQueue = false;
}
Video.prototype.addVideo = async function () {
    console.log("AddVideo");
    let VidData = {
        Id: null,
        IdChanel: CurrentChanel?.Id ?? null,
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
    await util.sleep(5000);
    this.processQueue(Video);
}
Video.prototype.openModalAdd = function () {
    document.body.appendChild(this.ModalAdd);
    this.ModalAddBootstrap = new bootstrap.Modal(this.ModalAdd);
    if (CurrentChanel !== null) {
        ContChanelNameAddVideo.style.display = "block";
        ChanelNameAddVideo.innerHTML = CurrentChanel.Name;
        StoreId.innerHTML = CurrentChanel.Id;
    }
    let BtnAddVideoModal = this.ModalAdd.querySelector('#BtnAddVideoModal');
    let BtnSelectVideoFile = this.ModalAdd.querySelector('#BtnSelectVideoFile');
    let previewVideoImage = this.ModalAdd.querySelector('#previewVideoImage');

    BtnAddVideoModal.addEventListener('click', this.addVideo);
    BtnSelectVideoFile.addEventListener('click', this.selectVideoFile);
    previewVideoImage.addEventListener('click', this.selectVideoImage);

    this.ModalAddBootstrap.show();
};
Video.prototype.showModalSubscribe = function () {
    document.body.appendChild(this.ModalSubscribe);
    var ModalB = new bootstrap.Modal(this.ModalSubscribe);
    ModalB.show();
};
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
    ChanelNameAddVideo.innerHTML = "";
    FileNameAddVideo.innerHTML = "";
    videoName.value = "";
    FeeAddVideo.value = "0";
    this.ModalAddBootstrap.hide();
    this.ModalAddBootstrap.dispose();
    document.getElementById(this.ModalAdd.id).remove();
    this.ModalAdd.removeEventListener('hidden.bs.modal', this.removeModalAdd);
};
Video.prototype.removeModalSubscribe = function () {
    document.body.removeChild(this.ModalSubscribe);
    this.ModalSubscribe.removeEventListener('hidden.bs.modal', this.removeModalSubscribe);
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
    let BtnRemove = IsVideoConfirmed ? `<button class="btn btn-danger" style="width:100%;" onclick="video.unsubscribe(${Video.Id})">Unsubscribe</button>` : `<button class="btn btn-danger" style="width:100%;" onclick="video.cancelPending('${Video.Id}')">Cancel</button>`;
    let OnclickLoad = IsVideoConfirmed ? `onclick="util.GoPlayer('${Video.Id}',${Video.TotalChunks},'${Video.Name}',${Video.Size},'${Video.IdChanel}')"` : "";
    let CardElement = `
        <a href="#" id="Cont${Video.Id}" ${OnclickLoad}  title="${Video.Name} - Store Id:${Video.Id}" style="text-decoration:none;text-align:center;">
            <img src="${Video.Image}" alt="${Video.Name}">
            <div class="card-body">
              <h5 class="card-title-${!IsVideoConfirmed?"pending":""}">${Video.Name}</h5>
              <p class="card-text-${!IsVideoConfirmed?"pending":""}" id="Status_${Video.Id}" style="display:${IsVideoConfirmed ? "none" : "block"}">----</p>
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
Video.prototype.deletePending = async function (IdVideo) {
    let Response = await BackendApi.deletePendingVideo(IdVideo);
    if (Response.status === "error") {
        util.showAlert("", Response.message);
        return;
    }
    let Card = document.getElementById(`Cont${IdVideo}`);
    Card.remove();
    this.Pending = this.Pending.filter(video => video.Id !== IdVideo);
    this.setPendingNumber();

}
Video.prototype.cancelPending = async function (IdVideo) {
    let Response = await BackendApi.deletePendingVideo(IdVideo);
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
Video.prototype.processQueue = async function (Video) {
    if (this.IsProcessingQueue) {
        console.log("skiped already one processQueue");
        return;
    }
    console.log("procesing...");
    this.setIsProcessingQueue(true);
    while (this.Pending.length > 0 && this.StopProcessingQueue === false) {
        await this.processVideo(this.Pending[0]);
    }
    this.setIsProcessingQueue(false);
    console.log("end processQueue");
}
Video.prototype.processVideo = async function (Video) {
    if (this.StopProcessingQueue) {
        return;
    }
    await this.confirmStore(Video.Id);
    await this.insertChunk(Video);
    if (Video.IdChanel != null) {
        await this.insertDetailsInChanel(Video);
    }
    if(this.StopProcessingQueue)
        return;
    await this.deletePending(Video.Id);
    if(document.getElementById('VideoSubscriptions')){
        let Card = this.cardVideo(Video,true);
        VideoSubscriptions.insertAdjacentHTML('beforeend', Card);
    }
}
Video.prototype.confirmStore = async function (IdVideo) {
    if(this.StopProcessingQueue){
        return;
    }
    if (document.getElementById(`Status_${IdVideo}`))
        document.getElementById(`Status_${IdVideo}`).innerHTML = "Checking Store"
    let IsVideoStoreConfirmed = false;
    while (!IsVideoStoreConfirmed) {
        let RIsConfirmed = await BackendApi.IsStoreConfirmed(IdVideo);
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
    if(this.StopProcessingQueue){
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
Video.prototype.insertDetailsInChanel = async function (Video) {
    if(this.StopProcessingQueue){
        return;
    }
    if (document.getElementById(`Status_${Video.Id}`))
        document.getElementById(`Status_${Video.Id}`).innerHTML = "Adding to Chanel"
    
    let IsDetailInserted = false;
    while (!IsDetailInserted && !this.StopProcessingQueue) {
        let RInsert = await BackendApi.insertVideoDetailsInChanel(Video);
        if (RInsert.success !== undefined && RInsert.success === true) {
            IsDetailInserted = true;
        }
    }
    let IsVideoDetailsConfirmed = false;

    while (!IsVideoDetailsConfirmed ) {
        let RIsConfirmed = await BackendApi.IsKeyConfirmed(Video.IdChanel, "Video" + Video.Id);

        if (RIsConfirmed.error !== undefined) {
            await util.sleep(2000);
        } else {
            if (document.getElementById(`Status_${Video.Id}`))
                document.getElementById(`Status_${Video.Id}`).innerHTML = "Added to Chanel";
            IsVideoDetailsConfirmed = true;
        }
    }
}
Video.prototype.setIsProcessingQueue = function (value) {
    this.IsProcessingQueue = value;
    this.handleProcessingQueueChange();
};
Video.prototype.handleProcessingQueueChange = async function() {
    if(this.StopProcessingQueue === true){
        await util.sleep(1000);
        this.StopProcessingQueue = false;
        this.processQueue();
    }
  };