function Home() {
    this.ChunkSize = 10;
    this.ChanelImagePath = null;
    this.IsLogEnabled = true;
}
Home.prototype.Init = async function () {
    this.LoadChanels();
}

Home.prototype.SelectFolderToMerge = async function () {
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const FileName = `${uniqueId}.mp4`;
    const FolderPath = await window.electronAPI.openFolder();
    const FilePath = await window.electronAPI.reconstructMP4FromChunks(FolderPath, FileName, 6);
    setTimeout(() => {
        this.changeVideoSource(FilePath);
    }, 1000);
}

Home.prototype.changeVideoSource = function (newSrc) {
    let player = document.getElementById('my-video');
    player.src = newSrc;
}

Home.prototype.PreviewImage = function () {
    const fileInput = document.getElementById('poster');
    const previewImage = document.getElementById('preview');

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        previewImage.src = event.target.result;
    }

    if (file) {
        reader.readAsDataURL(file);
    }
}

Home.prototype.SelectChanelImage = async function () {
    let FilePath = await window.electronAPI.openFile("Profile Image", "jpg");
    document.getElementById('preview').src = FilePath ?? "img/imgplaceholder.png";
    this.ChanelImagePath = FilePath ?? null;
}

Home.prototype.CreateChanel = async function () {
    let Name = document.getElementById('chanelName').value;
    let Fee = document.getElementById('Fee').value;
    let Image = this.ChanelImagePath;

    // Validar que el nombre no esté vacío y la imagen no esté vacía
    if (Name === "" || Image === null) {
        alert("Name and Image are required");
        return;
    }

    let Chanel = {
        Name: Name,
        Image: Image,
        Fee: Fee ?? 0
    }

    let Response = await window.electronAPI.CreateStore(Fee);
    Chanel.Id = Response.id;
    this.InsertCardChanel(Chanel);

    let IsChanelConfirmed = false;
    await util.sleep(5000);

    while (!IsChanelConfirmed) {
        let RIsConfirmed = await window.electronAPI.IsStoreConfirmed(Chanel.Id);

        if (RIsConfirmed.hash === undefined) {
            await util.sleep(1000);
        } else {
            document.getElementById(`Status_${Response.id}`).innerHTML = "Chanel Created";
            IsChanelConfirmed = true;
        }
    }

    let InsertChanelDetails = await window.electronAPI.InsertChanelDetails(Chanel);
    IsChanelConfirmed = false;

    while (!IsChanelConfirmed) {
        let RIsConfirmed = await window.electronAPI.IsKeyConfirmed(Chanel.Id,"IsChanel");

        if (RIsConfirmed.error !== undefined) {
            await util.sleep(1000);
        } else {
            document.getElementById(`Status_${Response.id}`).innerHTML = "Confirmed";
            IsChanelConfirmed = true;
        }
    }
}

Home.prototype.LoadChanels = async function () {
    util.showLoading("Loading Chanels...");
    let Chanels = await window.electronAPI.GetChanels();

    for (let i = 0; i < Chanels.length; i++) {
        this.InsertCardChanel(Chanels[i], true);
    }
    util.hideLoading();
}

Home.prototype.InsertCardChanel = function (Chanel, IsChanelConfirmed = false) {
    let CardElement = `
      <div class="col-sm-3" title="Store Id:${Chanel.Id}">
        <div class="card CardChanel" onclick="AppView.LoadChanel('${Chanel.Id}')">
          <img src="${Chanel.Image}" class="card-img-top" alt="${Chanel.Name}">
          <div class="card-body">
            <h5 class="card-title">${Chanel.Name}</h5>
            <p class="card-text" id="Status_${Chanel.Id}" style="display:${IsChanelConfirmed ? "none" : "block"}">Pending</p>
            <button class="btn btn-danger" onlick="Unsubscribe(${Chanel.Id})">Unsubscribe</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('OwnedStores').innerHTML += CardElement;
}

Home.prototype.LoadChanel = async function (ChanelId) {
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Chanel.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new Chanel(ChanelId);
        AppView.Init();
    }
}
Home.prototype.GoHome = async function () {
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Home.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new Home();
        AppView.Init();
    }
}


Home.prototype.Log = function (_data) {
    if (this.IsLogEnabled) {
        console.log(_data);
    }
}
