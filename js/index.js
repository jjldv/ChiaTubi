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
    util.GoHome();
    return
    util.showLoading("Checking Prerequisites...");
    let IsChiaInstalled = await window.electronAPI.CheckPrerequisites();
    util.hideLoading();
    console.log(IsChiaInstalled);
    if (IsChiaInstalled.status !== undefined && IsChiaInstalled.status === "success") {
        util.GoHome();
        return;
    }
    if (IsChiaInstalled.status !== undefined && IsChiaInstalled.status === "error") {
        alert(IsChiaInstalled.message);
        return;
    }
});