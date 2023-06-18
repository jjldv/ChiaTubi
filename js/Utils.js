function Utils() {

}
Utils.prototype.uId = function () {
    let uuid = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 6;

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uuid += characters.charAt(randomIndex);
    }

    return uuid;
}

Utils.prototype.getIPFromURL = function (url) {
    const matches = url.match(/^https?:\/\/([^:/?#]+)(?:[/:?#]|$)/i);
    if (matches && matches.length > 1) {
        return matches[1];
    }
    return '';
}

Utils.prototype.showLoading = function (message = "Loading...") {
    const existingLoading = document.getElementById('loading-backdropcss');
    if (existingLoading) {
        const messageElement = existingLoading.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'loading-backdropcss';
    backdrop.className = 'loading-backdropcss';

    const container = document.createElement('div');
    container.className = 'loading-container';

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    container.appendChild(spinner);

    const messageElement = document.createElement('p');
    messageElement.className = 'loading-message';
    messageElement.textContent = message;
    container.appendChild(messageElement);

    backdrop.appendChild(container);

    document.body.appendChild(backdrop);
}

Utils.prototype.hideLoading = function () {
    const backdrop = document.getElementById('loading-backdropcss');
    if (backdrop) {
        document.body.removeChild(backdrop);
    }

}
Utils.prototype.showAlert = function (title, message, type = 'error') {
    Swal.fire({
        title: title,
        text: message,
        icon: type,
        confirmButtonText: 'Ok',

    });
}
Utils.prototype.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
Utils.prototype.loadHTMLFile = async function (filePath, targetElementId = 'AppView') {
    await BackendApi.stopPrepareVideo2Play();
    return new Promise((resolve, reject) => {
        fetch(filePath)
            .then(response => response.text())
            .then(html => {
                const targetElement = document.getElementById(targetElementId);
                if (targetElement) {
                    targetElement.innerHTML = html;
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .catch(error => {
                console.error('Error loading HTML file:', error);
                resolve(false);
            });
    });
}
Utils.prototype.GoHome = async function () {
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Home.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new HomeView();
        AppView.init();
    }
}
Utils.prototype.GoVideos = async function () {
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Video.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new VideoView();
        AppView.init();
    }
}
Utils.prototype.CopyText = function (text, IdElementIconCopy) {
    navigator.clipboard.writeText(text)
        .then(() => {
            const iconoCopiado = document.getElementById(IdElementIconCopy);
            iconoCopiado.classList.remove('bi-clipboard');
            iconoCopiado.classList.add('bi-check2');
        })
        .catch((error) => {
            console.error('Error al copiar el texto: ', error);
        });
}
Utils.prototype.GoPlayer = async function (IdVideo, TotalChunks, VideoName, Size, IdChanel) {
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Player.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new PlayerView(IdVideo, TotalChunks, VideoName, Size, IdChanel);
        AppView.init();
    }
}
Utils.prototype.GoChanel = async function (ChanelId, ChanelName) {
    BtnReturnToChanel.innerHTML = "";
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Chanel.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new Chanel(ChanelId, ChanelName);
        AppView.init();
    }
}
Utils.prototype.getPublicIP = async function () {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const publicIP = data.ip;
        return publicIP;
    } catch (error) {
        return null;
    }
}
Utils.prototype.isUrlAccessible = async function (url) {
    try {
        const response = await fetch(url);
        if (response.ok || response.status === 500) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
};