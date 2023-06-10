let CurrentChanel = null;
let AppView = {};
let util = new Utils();
let video = new Video();

let BtnCreateChanelModal = document.getElementById("BtnCreateChanelModal");
let BtnSubscribeChanelModal = document.getElementById("BtnSubscribeChanelModal");
let BtnOpenAddVideoModal = document.getElementById("BtnOpenAddVideoModal");
let BtnSubscribeVideoModal = document.getElementById("BtnSubscribeVideoModal");



BtnOpenAddVideoModal.addEventListener('click', () => {
    video.openModalAdd();
});
BtnSubscribeVideoModal.addEventListener('click', () => {
    video.showModalSubscribe();
})
window.addEventListener('load', async () => {
    util.showLoading("Checking Prerequisites...");
    let IsChiaInstalled = await BackendApi.CheckPrerequisites();
    util.hideLoading();
    if (IsChiaInstalled.status !== undefined && IsChiaInstalled.status === "success") {
        util.GoHome();
        video.loadPending();
        return;
    }
    if (IsChiaInstalled.status !== undefined && IsChiaInstalled.status === "error") {
        util.showAlert("",IsChiaInstalled.message);
        return;
    }
});