import { resolve } from 'path';
import { Tray, Menu, app, MenuItem } from 'electron';
import { Status, InMeetingStatus, ZoomAction, ErrorStatus } from '../common/ipcTypes';
import { executeZoomAction } from './zoom';
import { RESOURCE_PATH } from './helpers';
import { getBannerEnabled, setBannerEnabled } from './bannerWindow';

let tray: Tray;

export default function configureTrayWithStatus(status: Status) {
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
			checked: !getBannerEnabled(),
			visible: status.type === 'in-meeting',
			click(item) {
				setBannerEnabled(!item.checked);
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
