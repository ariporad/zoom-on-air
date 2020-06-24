import { resolve } from 'path';
import util from 'electron-util';
import { app, dialog, ipcMain, systemPreferences } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import {
	executeZoomAction,
	monitorZoomStatus,
	deriveStatusFromRawZoomStatus,
	startZoomMonitor,
} from './zoom';
import updateTray from './tray';
import { setupHotkeys } from './hotkeys';
import { ZoomAction } from '../common/ipcTypes';
import { updateWindowWithStatus } from './bannerWindow';
import { sleep, statusManager, configManager, ConfigType } from './helpers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-line-next global-require
if (require('electron-squirrel-startup')) {
	app.quit();
}

if (!app.requestSingleInstanceLock()) {
	console.log('App Already Running... Exiting');
	app.quit();
}

function applyAppSettings(config: ConfigType): void {
	app.setLoginItemSettings({ openAtLogin: config.openAtLogin });
	config.showDockIcon ? app.dock.show() : app.dock.hide();
}

(async function main() {
	if (util.is.development) app.setPath('userData', resolve(process.cwd(), '.config'));
	await app.whenReady();

	util.enforceMacOSAppLocation();

	if (util.is.development) await installExtension(REACT_DEVELOPER_TOOLS);

	await statusManager.subscribe([updateWindowWithStatus, updateTray]);
	await configManager.subscribe([setupHotkeys, applyAppSettings, updateTray]);

	while (!systemPreferences.isTrustedAccessibilityClient(false)) {
		if (statusManager.current.type !== 'needs-perms') {
			console.log('No Accessibilty Perms');
			statusManager.set({ type: 'needs-perms', perms: 'accessibility' });
		}

		console.log('Waiting for Accessibility Perms');
		await sleep(500);
	}

	console.log('Has Accessibility Perms');

	ipcMain.on('zoom-action', (e, action: ZoomAction) => executeZoomAction(action, false));

	startZoomMonitor(); // Intentionally ignoring promise, because it never resolves

	for await (const status of await monitorZoomStatus()) {
		statusManager.set(deriveStatusFromRawZoomStatus(status));
	}
})().catch((err) => {
	const message = err ? err.message || err : 'Unknown Error';
	dialog.showErrorBox(message, err.stack || 'No Stack');
});
