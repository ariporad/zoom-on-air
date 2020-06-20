import { globalShortcut } from 'electron';
import { executeZoomAction } from './zoom';
import { ZoomAction, Status } from '../common/ipcTypes';
import { getStatus } from './statusManager';

const MUTE_SHORTCUT = 'F20';

export function setupHotkeys() {
	if (globalShortcut.isRegistered(MUTE_SHORTCUT)) globalShortcut.unregister(MUTE_SHORTCUT);
	// F20 doesn't exist on most keyboards, but I have my Insert key mapped to it
	globalShortcut.register(MUTE_SHORTCUT, () => {
		const status = getStatus(false);
		if (!status) return;
		if (status.type !== 'in-meeting') return;
		executeZoomAction(status.muted ? ZoomAction.Unmute : ZoomAction.Mute);
	});
}
