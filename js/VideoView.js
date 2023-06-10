function VideoView(){
    this.Video = new Video();
}
VideoView.prototype.init = async function(){
    util.showLoading("Loading Videos...");
    let Response = await BackendApi.getVideos();
    util.hideLoading();
    if(Response.status !== undefined && Response.status === "error"){
        util.showAlert("",Response.message);
        return;
    }
    this.setVideos(Response.Videos??[]);
}
VideoView.prototype.setVideos = async function(Videos){
    for(let i = 0; i < Videos.length; i++){
        let Card = this.Video.cardVideo(Videos[i],true);
        VideoSubscriptions.insertAdjacentHTML('beforeend', Card);
    }
}
