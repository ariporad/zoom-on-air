import { resolve } from 'path';
import { Tray, Menu, app, MenuItem, systemPreferences, dialog, shell } from 'electron';
import { Status, InMeetingStatus, ZoomAction, ErrorStatus } from '../common/ipcTypes';
import { executeZoomAction } from './zoom';
import { RESOURCE_PATH, configManager, statusManager } from './helpers';
import { getBannerEnabled, setBannerEnabled } from './bannerWindow';

let tray: Tray;

export default function updateTray() {
	const status = statusManager.current;
	const config = configManager.current;

	let image: string = 'TrayIconDisabledTemplate.png';
	let tooltip: string;

	switch (status.type) {
		case 'in-meeting':
			if (status.hidden && !status.muted) {
				image = 'TrayIconMicOnlyTemplate.png';
				tooltip = 'On Air: Camera Off, Mic On';
			}
			if (!status.hidden && status.muted) {
				image = 'TrayIconMicMutedTemplate.png';
				tooltip = 'On Air: Camera On, Mic Off';
			}
			if (!status.hidden && !status.muted) {
				image = 'TrayIconFullTemplate.png';
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
		case 'needs-perms':
			tooltip = 'Zoom on Air Needs Accessibility Access!';
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

		// Needs Perms
		{
			label: 'Zoom on Air Needs Accessibility Permissions',
			visible: status.type === 'needs-perms' && status.perms === 'accessibility',
			submenu: [
				{
					label: 'Grant Access',
					click() {
						systemPreferences.isTrustedAccessibilityClient(true);
					},
				},
			],
		},

		{ type: 'separator' },
		{
			label: 'Preferences…',
			submenu: [
				{
					label: 'Launch at Login',
					type: 'checkbox',
					checked: config.openAtLogin,
					async click(item: MenuItem) {
						console.log('Setting open at login:', item.checked);
						await configManager.set({ openAtLogin: item.checked });
					},
				},
				{
					label: 'Show Dock Icon',
					type: 'checkbox',
					checked: config.showDockIcon,
					async click(item: MenuItem) {
						console.log('Setting showDockIcon:', item.checked);
						await configManager.set({ showDockIcon: item.checked });
					},
				},
				{
					label: 'Hotkeys',
					submenu: [
						{
							label: `Mute/Unmute: ${config.muteHotkey || 'Disabled'}`,
							enabled: false,
						},
						{
							label: `Hide/Unhide: ${config.hideHotkey || 'Disabled'}`,
							enabled: false,
						},
						{ type: 'separator' },
						{
							label: 'Change Hotkeys',
							async click() {
								const { response } = await dialog.showMessageBox({
									type: 'info',
									buttons: ['Show in Finder', 'OK'],
									message: 'Hotkey Change Instructions',
									detail: `Zoom on Air doesn't yet have a UI for specifying hotkeys. To change them manually, edit the configuration file at ${configManager.path}. Please specify the hotkeys as Electron Accelerators: https://www.electronjs.org/docs/api/accelerator`,
									cancelId: 1,
									defaultId: 0,
								});

								if (response === 0) shell.showItemInFolder(configManager.path);
							},
						},
					],
				},
			],
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
