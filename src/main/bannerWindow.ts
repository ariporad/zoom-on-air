import { BrowserWindow, nativeTheme } from 'electron';
import { Status } from '../common/ipcTypes';
import { getStatus } from './statusManager';
import util from 'electron-util';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

let bannerEnabled: boolean = true;
let bannerWindow: BrowserWindow | null = null;

export function setBannerEnabled(enabled: boolean): void {
	bannerEnabled = enabled;
	const status = getStatus(false);
	// XXX: If status isn't in-meeting, this will immediately reset bannerEnabled
	if (status) updateWindowWithStatus(status);
}

export function getBannerEnabled(): boolean {
	return bannerEnabled;
}

export function updateWindowWithStatus(status: Status): void {
	// Reset bannerEnabled if not in a meeting
	if (status.type !== 'in-meeting') bannerEnabled = true;

	if (status.type === 'hidden' || !bannerEnabled) {
		if (bannerWindow && !bannerWindow.isDestroyed()) bannerWindow.hide();
		return;
	}

	if (!bannerWindow || bannerWindow.isDestroyed()) {
		bannerWindow = new BrowserWindow({
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

		bannerWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

		if (util.is.development) bannerWindow.webContents.openDevTools();
	}

	bannerWindow.webContents.send('status', status);
	if (!bannerWindow.isVisible()) bannerWindow.show();
}
