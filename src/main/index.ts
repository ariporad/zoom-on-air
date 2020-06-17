import { app, BrowserWindow, nativeTheme, dialog, ipcMain, Menu, MenuItem, Tray } from 'electron';
import { resolve } from 'path';
import { getZoomStatus, executeZoomAction } from './zoom';
import { Status, ZoomAction, InMeetingStatus, ErrorStatus } from '../common/ipcTypes';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import util from 'electron-util';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-line-next global-require
if (require('electron-squirrel-startup')) {
	app.quit();
}

if (!app.requestSingleInstanceLock()) {
	console.log('App Already Running... Exiting');
	app.quit();
}

const RESOURCE_PATH: string = util.is.development
	? resolve(__dirname, '..', '..', 'res')
	: resolve(process.resourcesPath, 'res');

let mainWindow: BrowserWindow | null = null;

let bannerEnabled: boolean = true;
let lastStatus: Status;

const setBannerEnabled = (newValue: boolean): void => {
	bannerEnabled = newValue;
	applyStatus(lastStatus);
};

const applyStatus = (status: Status): void => {
	// Reset bannerEnabled if not in a meeting
	// Bypass setBannerEnabled to avoid an infinite loop
	if (status.type !== 'in-meeting') bannerEnabled = true;

	lastStatus = status;
	setupTray(status);

	if (status.type === 'hidden' || !bannerEnabled) {
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

		if (zoomStatus === null) {
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

	util.enforceMacOSAppLocation();

	if (util.is.development) await installExtension(REACT_DEVELOPER_TOOLS);

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

let tray: Tray;

function setupTray(status: Status) {
	let image: string = 'TrayIconDisabled.png';
	let tooltip: string;

	switch (status.type) {
		case 'in-meeting':
			if (status.hidden && !status.muted) {
				image = 'TrayIconMicOnly.png';
				tooltip = 'On Air: Camera Off, Mic On';
			}
			if (!status.hidden && status.muted) {
				image = 'TrayIconMicMuted.png';
				tooltip = 'On Air: Camera On, Mic Off';
			}
			if (!status.hidden && !status.muted) {
				image = 'TrayIconFull.png';
				tooltip = 'On Air: Both Mic and Camera On';
			}
			if (status.hidden && status.muted) {
				tooltip = 'Off Air: Both Mic and Camera Off';
			}
			break;
		case 'error':
			tooltip = `Error: ${status.title}` + (status.text ? `(${status.text})` : '');
			break;
		case 'loading':
			tooltip = 'Loading...';
			break;
		case 'hidden':
			tooltip = 'Not in a Zoom Meeting';
			break;
	}

	image = resolve(RESOURCE_PATH, image);

	if (!tray || tray.isDestroyed()) {
		tray = new Tray(image);
	}

	const contextMenu = Menu.buildFromTemplate([
		// In Meeting
		{
			type: 'checkbox',
			label: 'Muted',
			visible: status.type === 'in-meeting',
			checked: (status as InMeetingStatus).muted || false,
			click(item) {
				executeZoomAction(item.checked ? ZoomAction.Mute : ZoomAction.Unmute);
			},
		},
		{
			type: 'checkbox',
			label: 'Hidden',
			visible: status.type === 'in-meeting',
			checked: (status as InMeetingStatus).hidden || false,
			click(item) {
				executeZoomAction(item.checked ? ZoomAction.Hide : ZoomAction.Unhide);
			},
		},

		{ type: 'separator' },
		{
			type: 'checkbox',
			label: 'Disable Banner for This Meeting',
			checked: !bannerEnabled,
			visible: status.type === 'in-meeting',
			click(item) {
				setBannerEnabled(item.checked);
			},
		},

		// Error
		{ label: 'Error!', visible: status.type === 'error', enabled: false },
		{
			label: (status as ErrorStatus).title || 'Unknown Error',
			visible: status.type === 'error',
			enabled: false,
		},
		{
			label: (status as ErrorStatus).text || '',
			visible: status.type === 'error' && !!status.text,
			enabled: false,
		},

		// Loading
		{ label: 'Loading...', visible: status.type === 'loading', enabled: false },

		// Hidden
		{ label: 'Not in a Zoom Meeting', visible: status.type === 'hidden', enabled: false },

		{ type: 'separator' },
		{
			label: 'Launch at Login',
			type: 'checkbox',
			checked: app.getLoginItemSettings().openAtLogin,
			click(item: MenuItem) {
				console.log('Setting open at login:', item.checked);
				app.setLoginItemSettings({ openAtLogin: item.checked });
			},
		},
		{
			label: 'Preferences…',
			accelerator: 'Cmd+,',
			click() {
				console.log('Preferences not yet implemented');
			},
		},

		{ type: 'separator' },
		{
			label: 'Quit',
			click() {
				app.quit();
			},
		},
	]);
	tray.setContextMenu(contextMenu);

	tray.setImage(image);
	tray.setToolTip(tooltip);
}
