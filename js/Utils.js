function Utils() {}
Utils.prototype.showLoading = function (message = "Loading...") {
    const existingLoading = document.getElementById('loading-backdrop');
    if (existingLoading) {
        const messageElement = existingLoading.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'loading-backdrop';
    backdrop.className = 'loading-backdrop';

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
    const backdrop = document.getElementById('loading-backdrop');
    if (backdrop) {
        document.body.removeChild(backdrop);
    }
    const elements = document.getElementsByClassName("modal-backdrop");
    while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}
Utils.prototype.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
Utils.prototype.loadHTMLFile = async function (filePath, targetElementId = 'AppView') {
    await window.electronAPI.StopPrepareVideo();
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
        AppView = new Home();
        AppView.Init();
    }
}
Utils.prototype.GoChanel = async function (ChanelId, ChanelName) {
    BtnReturnToChanel.innerHTML = "";
    util.showLoading();
    let IsLoaded = await util.loadHTMLFile('view/Chanel.html')
    util.hideLoading();
    if (IsLoaded) {
        AppView = new Chanel(ChanelId, ChanelName);
        AppView.Init();
    }
}