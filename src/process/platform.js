const {app} = require('electron')

module.exports = {
    CSS: function () {
        if (process.platform === 'darwin') {
            setTimeout(() => {
                mainWindow.webContents.executeJavaScript(`document.querySelector("body").style.backgroundColor = 'transparent'`)
                mainWindow.webContents.executeJavaScript(`document.querySelector("tab-group").shadowRoot.querySelector("nav").style.left = '80px'`)
            }, 1500);
        }
        if (process.platform === 'linux') {
            setTimeout(() => {
                mainWindow.webContents.executeJavaScript(`document.querySelector(".linux-titlebar").style.display = 'block'`)
            }, 1500);
        }
    }
}