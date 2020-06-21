import { app, dialog, ipcMain, systemPreferences } from 'electron';
import {
	executeZoomAction,
	monitorZoomStatus,
	deriveStatusFromRawZoomStatus,
	startZoomMonitor,
} from './zoom';
import { ZoomAction } from '../common/ipcTypes';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import util, { is } from 'electron-util';
import { subscribe, setStatus } from './statusManager';
import { setupHotkeys } from './hotkeys';
import { updateWindowWithStatus } from './bannerWindow';
import configureTrayWithStatus from './tray';
import { sleep } from './helpers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-line-next global-require
if (require('electron-squirrel-startup')) {
	app.quit();
}

if (!app.requestSingleInstanceLock()) {
	console.log('App Already Running... Exiting');
	app.quit();
}

async function promptForAccessibilityAccess(): Promise<void> {
	if (process.platform !== 'darwin') return;
	if (systemPreferences.isTrustedAccessibilityClient(false)) return;

	console.log('Prompting for Accessibilty Access');

	const { response } = await dialog.showMessageBox({
		message: 'Zoom on Air Needs Accessibility Access!',
		detail:
			'Zoom on Air uses this to check the status of Zoom and to mute/unmute it on your behalf. It does not abuse this power and no data is ever sent over the Internet.',
		buttons: ['OK', 'Quit Zoom on Air'],
		cancelId: 1,
	});

	if (response === 1) {
		console.log('User declined accessibility access, exiting...');
		process.exit(1);
	}

	// Wait for next tick. Seems to avoid a race condition in Electron
	await sleep(1);

	// Prompt the user for access (async)
	systemPreferences.isTrustedAccessibilityClient(true);

	console.log('Waiting for accessibility access to be granted...');
	let timeout = Date.now() + 5 * 60 * 1000; // 5 minutes
	while (!systemPreferences.isTrustedAccessibilityClient(false) && Date.now() < timeout) {
		await sleep(500);
	}

	// If we timed out and they still haven't given us access
	if (!systemPreferences.isTrustedAccessibilityClient(false)) {
		console.log('Accessibility access timed out! Trying again...');
		return promptForAccessibilityAccess();
	}

	console.log('Accessibility access granted!');
}

(async function main() {
	await app.whenReady();

	util.enforceMacOSAppLocation();

	// if (!util.is.development) app.dock.hide();

	if (util.is.development) await installExtension(REACT_DEVELOPER_TOOLS);

	await promptForAccessibilityAccess();

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
