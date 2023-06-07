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
}
Video.prototype.addVideo = async function () {
    console.log("AddVideo");
    let Video = {
        Id: null,
        IdChanel: CurrentChanel?.Id??null,
        VideoPath: this.VideoPath,
        Image: this.ImagePath,
        Name: null,
        Fee: 0
    };
    Video.Name = document.getElementById('videoName').value;
    Video.Fee = document.getElementById('FeeAddVideo').value;

    // Validar que el nombre no esté vacío y la imagen no esté vacía
    if (Video.Name === "" || Video.VideoPath === null || Video.Image === null) {
        util.showAlert("","Name, File Video and Image are required");
        return;
    }

    
    util.showLoading("Registering Video");

    let Response = await window.electronAPI.CreateStore(Video.Fee);
    if (Response.status === "error") {
        util.hideLoading();
        util.showAlert("",Response.message);
        return;
    }
    console.log(Response);
    Video.Id = Response.id;
    let CreateTemp = await window.electronAPI.CreateTempFileStore(Video, "Video", "PendingInsert");
    console.log(CreateTemp);
    this.InsertCardVideo(Video);

    const modal = document.getElementById("AddVideoModal");

    modal.style.display = "none";
    util.hideLoading();
    await util.sleep(5000);
    this.ConfirmVideo(Video);
}
Video.prototype.openModalAdd = function () {
    document.body.appendChild(this.ModalAdd);
    var ModalB = new bootstrap.Modal(this.ModalAdd);
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

    ModalB.show();
};
Video.prototype.showModalSubscribe = function () {
    document.body.appendChild(this.ModalSubscribe);
    var ModalB = new bootstrap.Modal(this.ModalSubscribe);
    ModalB.show();
};

Video.prototype.removeModalAdd = function () {
    let BtnAddVideoModal = this.ModalAdd.querySelector('#BtnAddVideoModal');
    let BtnSelectVideoFile = this.ModalAdd.querySelector('#BtnSelectVideoFile');
    let previewVideoImage = this.ModalAdd.querySelector('#previewVideoImage');

    BtnAddVideoModal.removeEventListener('click', this.addVideo);
    BtnSelectVideoFile.removeEventListener('click', this.selectVideoFile);
    previewVideoImage.removeEventListener('click', this.selectVideoImage);
    this.ImagePath = null;
    this.VideoPath = null;
    document.getElementById('previewVideoImage').src =  "img/imgplaceholder.png";
    ChanelNameAddVideo.innerHTML = "";
    FileNameAddVideo.innerHTML = "";
    videoName.value = "";
    FeeAddVideo.value = "0";

    document.getElementById(this.ModalAdd.id).remove();
    console.log(this.ModalAdd);
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
    let FilePath = await window.electronAPI.openFile("Mp4 files", "mp4");
    this.VideoPath = FilePath;
    FileNameAddVideo.innerHTML = FilePath ? FilePath.split('\\').pop() :"";

}
Video.prototype.selectVideoImage = async function () {
    this.ImagePath = null;
    let FilePath = await window.electronAPI.openFile("Profile Image", "jpg");
    document.getElementById('previewVideoImage').src = FilePath ?? "img/imgplaceholder.png";
    this.ImagePath = FilePath ?? null;

}
Video.prototype.cardVideo = function (Video, IsVideoConfirmed = false) {
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

    return CardElement;
}