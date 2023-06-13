function PlayerView(IdVideo, TotalChunks, VideoName, Size, IdChanel) {
    this.Id = IdVideo;
    this.TotalChunks = TotalChunks;
    this.Size = Size;
    this.Name = VideoName;
    this.IdChanel = IdChanel;
    this.videoElement = document.getElementById("CurrentPlayer");
    this.PercentageLoaded = 0;
    this.currentTime = 0;
}


PlayerView.prototype.setProgressBar = async function () {
    this.videoElement.setAttribute('max', this.PercentageLoaded);
    const progressBar = document.getElementById('progress-bar');

    this.videoElement.addEventListener('timeupdate', () => {
        if (this.videoElement.currentTime === undefined)
            return;
        const currentTime = this.videoElement.currentTime;
        const totalDuration = this.videoElement.duration;
        const currentPercentage = (currentTime / totalDuration) * 100;

        if (this.PercentageLoaded != 100 && currentPercentage > (this.PercentageLoaded - 5)) {
            this.videoElement.currentTime = ((this.PercentageLoaded - 10) / 100) * totalDuration;
        }
    });
    this.videoElement.setAttribute('max', this.PercentageLoaded);
    //first loadup to calm the user 
    progressBar.style.width = '3%';
    progressBar.setAttribute('aria-valuenow', 3);
    progressBar.innerHTML = '3%';

    while (this.PercentageLoaded < 100 && AppView.Id !==undefined && AppView.Id == this.Id) {
        progressBar.style.width = (this.PercentageLoaded < 3 ?3:this.PercentageLoaded) + '%';
        progressBar.setAttribute('aria-valuenow', (this.PercentageLoaded < 3 ?3:this.PercentageLoaded));
        progressBar.innerHTML = Math.floor( (this.PercentageLoaded < 3 ?3:this.PercentageLoaded)) + '%';
        await util.sleep(1000);
        this.PercentageLoaded = await BackendApi.videoPercentageLoaded();
        this.videoElement.setAttribute('max', this.PercentageLoaded);
        if (this.PercentageLoaded == 100) {
            progressBar.style.width = this.PercentageLoaded + '%';
            progressBar.innerHTML = Math.floor(this.PercentageLoaded) + '%';
            progressBar.setAttribute('aria-valuenow', this.PercentageLoaded);
            break;
        }
    }
}
PlayerView.prototype.init = async function () {
    LblVideoName.innerHTML = `${this.Name}`;
    LblIdStore.innerHTML = `Id Store: ${this.Id}    <button onclick="util.CopyText('${this.Id}','IconCopyStorePlayer')" data-text="${this.Id}" class="btn btn-primary btn-sm"><i id="IconCopyStorePlayer" title="Copy Store Id" class="bi bi-clipboard bi-sm"></i></button>`;
    
    await BackendApi.prepareVideo2Play(this.Id, this.TotalChunks, this.Size);
    this.setProgressBar();
    while (this.PercentageLoaded < 10 && AppView.Id !==undefined && AppView.Id == this.Id) {
        await util.sleep(1000);
    }
    if(AppView.Id !== this.Id)
    {
        return;
    }
    const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && !document.contains(mutation.target) && !this.videoElement.paused) {
                this.videoElement.pause();
                observer.disconnect();
                return;
            }
        }
    });
    observer.observe(this.videoElement.parentNode, { childList: true });
    this.videoElement.src = `http://localhost:8000/CurrentPlayer?timestamp=${Date.now()}`
    
};