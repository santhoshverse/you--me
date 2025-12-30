const { app, BrowserWindow } = require('electron');
const path = require('path');

// Fix for "Hardware MFT failed to start streaming" error (0xC00D3704)
// This forces software rendering/encoding, bypassing potentially locked or buggy GPU drivers.
app.disableHardwareAcceleration();

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For easier local file access as requested
        },
    });

    // Load the local Vite dev server url
    win.loadURL('http://localhost:5173');

    // Open the DevTools.
    win.webContents.openDevTools();

    // Handle Screen Share Requests (Electron requires this manually)
    win.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
        const { desktopCapturer, Menu } = require('electron');

        desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
            const menu = Menu.buildFromTemplate(
                sources.map((source) => ({
                    label: source.name,
                    click: () => {
                        callback({ video: source, audio: 'loopback' });
                    },
                }))
            );
            menu.popup();
        }).catch(err => {
            console.error("Error fetching sources:", err);
            callback(null);
        });
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
