function HomeView() {
    this.ChunkSize = 10;
    this.ChanelImagePath = null;
    this.IsLogEnabled = true;
}
HomeView.prototype.init = async function () {
    // let ModalCreateChanel = new bootstrap.Modal(document.getElementById('CreateChanelModal'));
    // ModalCreateChanel._element.addEventListener('hidden.bs.modal', function () {
    //     // Restablece los valores de los inputs
    //     document.getElementById('chanelName').value = '';
    //     document.getElementById('Fee').value = '0';
    //     document.getElementById('preview').src = "img/imgplaceholder.png";
    //     this.ChanelImagePath = null;
    // })
    // let ModalSubscribeChanel = new bootstrap.Modal(document.getElementById('SubscribeChanelModal'));
    // ModalSubscribeChanel._element.addEventListener('hidden.bs.modal', function () {
    //     document.getElementById('IdChanelSubscribe').value = '';
    // })
    // this.LoadChanels();
}
HomeView.prototype.SelectChanelImage = async function () {
    let FilePath = await BackendApi.openFile("Profile Image", "jpg");
    document.getElementById('preview').src = FilePath ?? "img/imgplaceholder.png";
    this.ChanelImagePath = FilePath ?? null;
}

HomeView.prototype.CreateChanel = async function () {
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

    let Response = await BackendApi.CreateStore(Fee);
    if (Response.status === "error") {
        util.hideLoading();
        alert(Response.message);
        return;
    }
    console.log(Response);
    Chanel.Id = Response.id;
    let CreateTemp = await BackendApi.CreateTempFileStore(Chanel, "Chanel", "PendingInsert");
    console.log(CreateTemp);
    this.InsertCardChanel(Chanel);
    const modal = document.getElementById("CreateChanelModal");

    modal.style.display = "none";
    util.hideLoading();
    await util.sleep(5000);

    this.ConfirmChanel(Chanel);

}
HomeView.prototype.ConfirmChanelSubscription = async function (Chanel) {
    const element = document.getElementById(`Status_${Chanel.Id}`);

    let IsChanelConfirmed = false;

    while (!IsChanelConfirmed && AppView instanceof HomeView) {
        let RIsConfirmed = await BackendApi.IsKeyConfirmed(Chanel.Id, "IsChanel");

        if (RIsConfirmed.error !== undefined) {
            await util.sleep(1000);
        } else {
            let DeleteTemp = await BackendApi.DeleteTempFileStore(Chanel, "Chanel", "PendingSubscribe");
            console.log(DeleteTemp);
            IsChanelConfirmed = true;
            util.GoHome();
        }
    }

}
HomeView.prototype.ConfirmChanel = async function (Chanel) {
    const element = document.getElementById(`Status_${Chanel.Id}`);
    let IsChanelConfirmed = false;
    while (!IsChanelConfirmed && AppView instanceof HomeView) {
        let RIsConfirmed = await BackendApi.IsStoreConfirmed(Chanel.Id);

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

    let InsertChanelDetails = await BackendApi.InsertChanelDetails(Chanel);
    if (InsertChanelDetails.status == "error") {
        alert(InsertChanelDetails.message);
        return;
    }
    IsChanelConfirmed = false;

    while (!IsChanelConfirmed && AppView instanceof HomeView) {
        let RIsConfirmed = await BackendApi.IsKeyConfirmed(Chanel.Id, "IsChanel");

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
    let DeleteTemp = await BackendApi.DeleteTempFileStore(Chanel, "Chanel", "PendingInsert");
    console.log(DeleteTemp);
}

HomeView.prototype.LoadChanels = async function () {
    util.showLoading("Loading Chanels...");
    let ChanelsPending = await BackendApi.GetChanelsPending();

    for (let i = 0; i < ChanelsPending.length; i++) {
        this.InsertCardChanel(ChanelsPending[i], false);
        this.ConfirmChanel(ChanelsPending[i]);
    }
    let ChanelsSubscriptionPending = await BackendApi.GetChanelsSubscriptionPending();

    for (let i = 0; i < ChanelsSubscriptionPending.length; i++) {
        this.InsertCardChanel(ChanelsSubscriptionPending[i], false, "PendingSubscribe");
        this.ConfirmChanelSubscription(ChanelsSubscriptionPending[i]);
    }
    let Chanels = await BackendApi.GetChanels();

    for (let i = 0; i < Chanels.length; i++) {
        this.InsertCardChanel(Chanels[i], true);
    }
    util.hideLoading();
}

HomeView.prototype.RemovePending = async function (Id, PendingType) {
    util.showLoading("Removing Pending Chanel");
    
    let DeleteTemp = await BackendApi.DeleteTempFileStore({
        Id: Id
    }, "Chanel", PendingType);
    if (DeleteTemp.status !== undefined && DeleteTemp.status === "success") {
        var ContElement = document.getElementById("Cont" + Id);
        if (ContElement) {
            ContElement.remove();
        }
    }
    if (PendingType === "PendingInsert") {
        let Response = await BackendApi.UnsubscribeChanel(Id);
        console.log(Response);
    }
    util.hideLoading();
}
HomeView.prototype.InsertCardChanel = function (Chanel, IsChanelConfirmed = false, PendingType = "PendingInsert") {
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
HomeView.prototype.Unsubscribe = async function (ChanelId) {
    util.showLoading("Unsubscribing...");
    let Response = await BackendApi.UnsubscribeChanel(ChanelId);
    if (Response.success !== undefined && Response.success === true) {
        util.GoHome();
    }

}
HomeView.prototype.SubscribeChanel = async function () {
    let IdChanel = document.getElementById('IdChanelSubscribe').value;

    if (IdChanel === "" || IdChanel === null) {
        alert("Id is required");
        return;
    }

    const modal = document.getElementById("SubscribeChanelModal");

    modal.style.display = "none";
    util.showLoading("Subscribing...");
    let Response = await BackendApi.SubscribeChanel(IdChanel);
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
HomeView.prototype.LoadChanel = async function (ChanelId, ChanelName) {
    util.GoChanel(ChanelId, ChanelName);
}
HomeView.prototype.Log = function (_data) {
    if (this.IsLogEnabled) {
        console.log(_data);
    }
}