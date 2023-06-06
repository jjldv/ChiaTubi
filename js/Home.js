function Home() {
    this.ChunkSize = 10;
    this.ChanelImagePath = null;
    this.IsLogEnabled = true;
}
Home.prototype.Init = async function () {
    let ModalCreateChanel = new bootstrap.Modal(document.getElementById('CreateChanelModal'));
    ModalCreateChanel._element.addEventListener('hidden.bs.modal', function () {
        // Restablece los valores de los inputs
        document.getElementById('chanelName').value = '';
        document.getElementById('Fee').value = '0';
        document.getElementById('preview').src = "img/imgplaceholder.png";
        this.ChanelImagePath = null;
    })
    let ModalSubscribeChanel = new bootstrap.Modal(document.getElementById('SubscribeChanelModal'));
    ModalSubscribeChanel._element.addEventListener('hidden.bs.modal', function () {
        document.getElementById('IdChanelSubscribe').value = '';
    })
    var btnCreateChanelModal = document.getElementById('BtnCreateChanelModal');
    var btnSubscribeChanelModal = document.getElementById('BtnSubscribeChanelModal');
    var btnAddVideoModal = document.getElementById('BtnAddVideoModal');
    btnCreateChanelModal.style.display = 'block';
    btnSubscribeChanelModal.style.display = 'block';
    btnAddVideoModal.style.display = 'none';
    this.LoadChanels();
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

    if (Name === "" || Image === null) {
        alert("Name and Image are required");
        return;
    }

    util.showLoading("Registering Chanel");
    let Chanel = {
        Name: Name,
        Image: Image,
        Fee: Fee ?? 0
    }

    let Response = await window.electronAPI.CreateStore(Fee);
    if (Response.status === "error") {
        util.hideLoading();
        alert(Response.message);
        return;
    }
    console.log(Response);
    Chanel.Id = Response.id;
    let CreateTemp = await window.electronAPI.CreateTempFileStore(Chanel, "Chanel", "PendingInsert");
    console.log(CreateTemp);
    this.InsertCardChanel(Chanel);
    const modal = document.getElementById("CreateChanelModal");

    modal.style.display = "none";
    util.hideLoading();
    await util.sleep(5000);

    this.ConfirmChanel(Chanel);

}
Home.prototype.ConfirmChanelSubscription = async function (Chanel) {
    const element = document.getElementById(`Status_${Chanel.Id}`);

    let IsChanelConfirmed = false;

    while (!IsChanelConfirmed && AppView instanceof Home) {
        let RIsConfirmed = await window.electronAPI.IsKeyConfirmed(Chanel.Id, "IsChanel");

        if (RIsConfirmed.error !== undefined) {
            await util.sleep(1000);
        } else {
            let DeleteTemp = await window.electronAPI.DeleteTempFileStore(Chanel, "Chanel", "PendingSubscribe");
            console.log(DeleteTemp);
            IsChanelConfirmed = true;
            util.GoHome();
        }
    }

}
Home.prototype.ConfirmChanel = async function (Chanel) {
    const element = document.getElementById(`Status_${Chanel.Id}`);
    let IsChanelConfirmed = false;
    while (!IsChanelConfirmed && AppView instanceof Home) {
        let RIsConfirmed = await window.electronAPI.IsStoreConfirmed(Chanel.Id);

        if (RIsConfirmed.hash === undefined) {
            await util.sleep(1000);
        } else {
            if (element)
                element.innerHTML = "Inserting Details";
            IsChanelConfirmed = true;
        }
    }
    if (!IsChanelConfirmed) {
        return;
    }

    let InsertChanelDetails = await window.electronAPI.InsertChanelDetails(Chanel);
    if (InsertChanelDetails.status == "error") {
        alert(InsertChanelDetails.message);
        return;
    }
    IsChanelConfirmed = false;

    while (!IsChanelConfirmed && AppView instanceof Home) {
        let RIsConfirmed = await window.electronAPI.IsKeyConfirmed(Chanel.Id, "IsChanel");

        if (RIsConfirmed.error !== undefined) {
            await util.sleep(1000);
        } else {
            if (element) {
                element.innerHTML = "Confirmed";
                var IdCard = document.getElementById(Chanel.Id);

                IdCard.onclick = function () {
                    AppView.LoadChanel(`${Chanel.Id}`, `${Chanel.Name}`)
                };
            }
            IsChanelConfirmed = true;
        }
    }
    let DeleteTemp = await window.electronAPI.DeleteTempFileStore(Chanel, "Chanel", "PendingInsert");
    console.log(DeleteTemp);
}

Home.prototype.LoadChanels = async function () {
    util.showLoading("Loading Chanels...");
    let ChanelsPending = await window.electronAPI.GetChanelsPending();

    for (let i = 0; i < ChanelsPending.length; i++) {
        this.InsertCardChanel(ChanelsPending[i], false);
        this.ConfirmChanel(ChanelsPending[i]);
    }
    let ChanelsSubscriptionPending = await window.electronAPI.GetChanelsSubscriptionPending();

    for (let i = 0; i < ChanelsSubscriptionPending.length; i++) {
        this.InsertCardChanel(ChanelsSubscriptionPending[i], false, "PendingSubscribe");
        this.ConfirmChanelSubscription(ChanelsSubscriptionPending[i]);
    }
    let Chanels = await window.electronAPI.GetChanels();

    for (let i = 0; i < Chanels.length; i++) {
        this.InsertCardChanel(Chanels[i], true);
    }
    util.hideLoading();
}

Home.prototype.RemovePending = async function (Id, PendingType) {
    util.showLoading("Removing Pending Chanel");
    
    let DeleteTemp = await window.electronAPI.DeleteTempFileStore({
        Id: Id
    }, "Chanel", PendingType);
    if (DeleteTemp.status !== undefined && DeleteTemp.status === "success") {
        var ContElement = document.getElementById("Cont" + Id);
        if (ContElement) {
            ContElement.remove();
        }
    }
    if (PendingType === "PendingInsert") {
        let Response = await window.electronAPI.UnsubscribeChanel(Id);
        console.log(Response);
    }
    util.hideLoading();
}
Home.prototype.InsertCardChanel = function (Chanel, IsChanelConfirmed = false, PendingType = "PendingInsert") {
    let onclick = IsChanelConfirmed ? `onclick="AppView.LoadChanel('${Chanel.Id}', '${Chanel.Name}')"` : "";
    let BtnRemove = IsChanelConfirmed ? `<button type="button" class="btn btn-danger" onclick="AppView.Unsubscribe('${Chanel.Id}')">Unsubscribe</button>` : ``;
    let CardElement = `
        <a  href="#" id="Cont${Chanel.Id}"  title="${Chanel.Name} - Store Id:${Chanel.Id}" style="text-decoration:none;text-align:center;">
            <img  id="${Chanel.Id}" src="${Chanel.Image}" ${onclick} alt="${Chanel.Name}">
            <div class="card-body">
              <h5 class="card-title">${Chanel.Name}</h5>
              <p class="card-text" id="Status_${Chanel.Id}" style="display:${IsChanelConfirmed ? "none" : "block"}">Pending</p>
              ${BtnRemove}
            </div>
        </a>
    `;

    document.getElementById('Subscriptions').innerHTML += CardElement;
}
Home.prototype.Unsubscribe = async function (ChanelId) {
    util.showLoading("Unsubscribing...");
    let Response = await window.electronAPI.UnsubscribeChanel(ChanelId);
    if (Response.success !== undefined && Response.success === true) {
        util.GoHome();
    }

}
Home.prototype.SubscribeChanel = async function () {
    let IdChanel = document.getElementById('IdChanelSubscribe').value;

    if (IdChanel === "" || IdChanel === null) {
        alert("Id is required");
        return;
    }

    const modal = document.getElementById("SubscribeChanelModal");

    modal.style.display = "none";
    util.showLoading("Subscribing...");
    let Response = await window.electronAPI.SubscribeChanel(IdChanel);
    console.log(Response);
    util.hideLoading();
    if (Response != null && Response.Id !== undefined) {
        this.InsertCardChanel(Response);
        this.ConfirmChanelSubscription(Response);
    }

    if (Response.error !== undefined) {
        alert(Response.error);
    }
}
Home.prototype.LoadChanel = async function (ChanelId, ChanelName) {
    util.GoChanel(ChanelId, ChanelName);
}
Home.prototype.Log = function (_data) {
    if (this.IsLogEnabled) {
        console.log(_data);
    }
}