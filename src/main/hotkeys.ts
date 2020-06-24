import { globalShortcut } from 'electron';
import { executeZoomAction } from './zoom';
import { ZoomAction } from '../common/ipcTypes';
import { statusManager, ConfigType } from './helpers';

function bindHotkey(accelerator: string, handler: () => void): void {
	if (globalShortcut.isRegistered(accelerator)) globalShortcut.unregister(accelerator);

	globalShortcut.register(accelerator, handler);
}

export function setupHotkeys(config: ConfigType) {
	if (config.muteHotkey) {
		bindHotkey(config.muteHotkey, () => {
			const status = statusManager.current;
			if (status.type !== 'in-meeting') return;
			executeZoomAction(status.muted ? ZoomAction.Unmute : ZoomAction.Mute);
		});
	}

	if (config.hideHotkey) {
		bindHotkey(config.hideHotkey, () => {
			const status = statusManager.current;
			if (status.type !== 'in-meeting') return;
			executeZoomAction(status.hidden ? ZoomAction.Unhide : ZoomAction.Hide);
		});
	}
}
