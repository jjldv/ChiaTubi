const ChunkSize = 10;
let ChanelImagePath = null;
let IsLogEnabled = true;
async function SelectFileToSplit() {
    let FilePath = await window.electronAPI.openFile("Mp4 files", "mp4");
    let FolderOuput = await window.electronAPI.splitFileIntoChunks(FilePath, ChunkSize);
    Log(FolderOuput);
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

function PreviewImage() {
    const fileInput = document.getElementById('poster');
    const previewImage = document.getElementById('preview');

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        previewImage.src = event.target.result;
    };

    if (file) {
        reader.readAsDataURL(file);
    }
}
async function SelectChanelImage() {
    let FilePath = await window.electronAPI.openFile("Profile Image", "jpg");
    document.getElementById('preview').src = FilePath ?? "img/imgplaceholder.png";
    ChanelImagePath = FilePath ?? null;

}
async function CreateChanel() {
    let Name = document.getElementById('chanelName').value;
    let Fee = document.getElementById('Fee').value;
    let Image = ChanelImagePath;
    //validar que el nombre no este vacio y la imagen no este vacia
    if (Name == "" || Image == null) {
        alert("Name and Image are required");
        return;
    }
    let Chanel = {
        Name: Name,
        Image: Image,
        Fee: Fee??0
    }

    let Response = await window.electronAPI.createChanel(Chanel);
    Chanel.Id = Response.id;
    InsertCardChanel(Chanel);
    let IsChanelConfirmed = false;
    await sleep(5000);
    while (!IsChanelConfirmed) {
        let RIsConfirmed = await window.electronAPI.IsChanelConfirmed(Chanel.Id);
        if (RIsConfirmed.hash === undefined) {
            await sleep(1000);
        }
        else{
            document.getElementById(`Status_${Response.id}`).innerHTML = "Chanel Created";
            IsChanelConfirmed = true;
        }
    }
    let InsertChanelDetails = await window.electronAPI.InsertChanelDetails(Chanel);
    IsChanelConfirmed = false;
    while (!IsChanelConfirmed) {
        let RIsConfirmed = await window.electronAPI.IsChanelDetailsConfirmed(Chanel.Id);
        if (RIsConfirmed.error !== undefined) {
            await sleep(1000);
        }
        else{
            document.getElementById(`Status_${Response.id}`).innerHTML = "Confirmed";
            IsChanelConfirmed = true;
        }
    }
}

async function LoadChanels() {
    let Chanels = await window.electronAPI.GetChanels();
    //for each chanel create a card
    for(let i = 0; i < Chanels.length; i++){
        InsertCardChanel(Chanels[i],true);
    }
}
function InsertCardChanel(Chanel,IsChanelConfirmed = false) {
    let CardElement = `
            <div class="col-sm-3" title="Store Id:${Chanel.Id}">
                <div class="card CardChanel">
                    <img src="${Chanel.Image}" class="card-img-top" alt="${Chanel.Name}">
                    <div class="card-body">
                        <h5 class="card-title">${Chanel.Name}</h5>
                        <p class="card-text" id="Status_${Chanel.Id}" style="display:${IsChanelConfirmed?"none":"block"};">Pending</p>
                        <button class="btn btn-danger" onlick="Unsubscribe(${Chanel.Id})">Unsubscribe</button>
                    </div>
                </div>
            </div>
   `;
    document.getElementById('OwnedStores').innerHTML += CardElement;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
function Log(_data){

    if(IsLogEnabled){
        console.log(_data);
    }
}