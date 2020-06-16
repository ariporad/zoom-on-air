import { app, BrowserWindow, nativeTheme, dialog, ipcMain } from 'electron';
import { getZoomStatus, executeZoomAction } from './zoom';
import { Status, ZoomAction } from '../common/ipcTypes';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-line-next global-require
if (require('electron-squirrel-startup')) {
	app.quit();
}

let mainWindow: BrowserWindow | null = null;

const applyStatus = (status: Status): void => {
	if (status.type === 'hidden') {
		if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
		return;
	}

	if (!mainWindow || mainWindow.isDestroyed()) {
		mainWindow = new BrowserWindow({
			height: 100,
			width: 300,
			x: 0,
			y: 0,
			resizable: true,
			opacity: 0.75,
			focusable: false,
			frame: false,
			alwaysOnTop: true,
			webPreferences: {
				nodeIntegration: true,
			},
			show: false,

			// TODO: Keep in sync with index.css
			backgroundColor: nativeTheme.shouldUseDarkColors ? '#252525' : '#FFFFFF',
		});

		mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

		mainWindow.webContents.openDevTools();
	}

	mainWindow.webContents.send('status', status);
	if (!mainWindow.isVisible()) mainWindow.show();
};

if (process.env.NODE_ENV !== 'development') app.dock.hide();

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

const sleep = (time: number) => new Promise((done) => setTimeout(done, time));

async function calculateStatus(): Promise<Status> {
	try {
		const zoomStatus = await getZoomStatus();

		if (zoomStatus === null || (zoomStatus.muted && zoomStatus.hidden)) {
			return { type: 'hidden' };
		}

		return {
			type: 'in-meeting',
			hidden: zoomStatus.hidden,
			muted: zoomStatus.muted,
		};
	} catch (err) {
		console.error('Failed to Update Zoom Status!');
		console.error(err);
		return {
			type: 'error',
			title: 'Failed to Check Zoom Status',
			text: "It just didn't work",
		};
	}
}

(async function main() {
	await app.whenReady();

	await installExtension(REACT_DEVELOPER_TOOLS, true);

	ipcMain.on('zoom-action', async (e, action: ZoomAction) => {
		console.log('Executing Zoom Action:', action);
		try {
			await executeZoomAction(action);
		} catch (err) {
			console.error('Failed to execute Zoom Action:', action);
			console.error(err);
			dialog.showErrorBox(`Failed to Execute Zoom Action: ${action}!`, err);
		}
		try {
			applyStatus(await calculateStatus());
		} catch (err) {
			console.error('Failed to update after executing Zoom Action:', action);
			console.error(err);
			console.error('Ignoring, waiting for regular update');
		}
	});

	while (true) {
		applyStatus(await calculateStatus());

		await sleep(1000);
	}
})().catch((err) => {
	const message = err ? err.message || err : 'Unknown Error';
	dialog.showErrorBox(message, err.stack || 'No Stack');
});
