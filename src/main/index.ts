import { app, dialog, ipcMain } from 'electron';
import {
	executeZoomAction,
	monitorZoomStatus,
	deriveStatusFromRawZoomStatus,
	startZoomMonitor,
} from './zoom';
import { ZoomAction } from '../common/ipcTypes';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import util from 'electron-util';
import { subscribe, setStatus } from './statusManager';
import { setupHotkeys } from './hotkeys';
import { updateWindowWithStatus } from './bannerWindow';
import configureTrayWithStatus from './tray';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-line-next global-require
if (require('electron-squirrel-startup')) {
	app.quit();
}

if (!app.requestSingleInstanceLock()) {
	console.log('App Already Running... Exiting');
	app.quit();
}

if (process.env.NODE_ENV !== 'development') app.dock.hide();

(async function main() {
	await app.whenReady();

	util.enforceMacOSAppLocation();

	if (util.is.development) await installExtension(REACT_DEVELOPER_TOOLS);

	setupHotkeys();
	subscribe([updateWindowWithStatus, configureTrayWithStatus]);

	ipcMain.on('zoom-action', (e, action: ZoomAction) => executeZoomAction(action, false));

	startZoomMonitor(); // Intentionally ignoring promise, because it never resolves

	for await (const status of await monitorZoomStatus()) {
		setStatus(deriveStatusFromRawZoomStatus(status));
	}
})().catch((err) => {
	const message = err ? err.message || err : 'Unknown Error';
	dialog.showErrorBox(message, err.stack || 'No Stack');
});
