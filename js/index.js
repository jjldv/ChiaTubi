BackendApi.stopPrepareVideo2Play();
let AppView = {};
let util = new Utils();
let video = new Video();
let PublicIP = null;

let BtnOpenAddVideoModal = document.getElementById("BtnOpenAddVideoModal");
let BtnSubscribeVideoModal = document.getElementById("BtnSubscribeVideoModal");



BtnOpenAddVideoModal.addEventListener('click', () => {
    video.openModalAdd();
});
BtnSubscribeVideoModal.addEventListener('click', () => {
    video.openModalSubscribe();
})
window.addEventListener('load', async () => {

    util.showLoading("Checking Prerequisites...");
    let IsChiaInstalled = await BackendApi.checkPrerequisites();
    util.hideLoading();
    PublicIP = await util.getPublicIP();
    console.log("PublicIP: " + PublicIP);
    if (PublicIP !== null) {
       BackendApi.setPublicIP(PublicIP);
       MyIP.innerHTML = `My IP: ${PublicIP}`;
    }
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