import runApplescript from 'run-applescript';
import { ZoomAction } from '../common/ipcTypes';

const ZOOM_STATUS_APPLESCRIPT = String.raw`
on run
	tell application "System Events"
		set isMuted to false
		set isHidden to false
		set isInMeeting to false
		tell process "zoom.us"			
			try
				set theMenu to menu "Meeting" of menu bar item "Meeting" of menu bar 1
				set isInMeeting to true
				set isMuted to 0 is not (count of (menu items of theMenu where name starts with "Unmute Audio"))
				set isHidden to 0 is not (count of (menu items of theMenu where name starts with "Start Video"))
			on error number -1728 -- -1728 is when the "Meeting" menu doesn't exist (ie. we're not in a meeting)
			end try
		end tell
		return "{\"inMeeting\": " & isInMeeting & ", \"muted\": " & isMuted & ", \"hidden\": " & isHidden & "}"
	end tell
end run
`;

const generateZoomActionApplescript = (action: ZoomAction) => String.raw`
on run
	tell application "System Events"
		tell process "zoom.us"
			try
				set theMenu to menu "Meeting" of menu bar item "Meeting" of menu bar 1
				set theButton to first item of (menu items of theMenu where name starts with "${action}")
				click theButton
			on error number -1728 -- -1728 is when the "Meeting" menu doesn't exist (ie. we're not in a meeting)
			end try
		end tell
	end tell
end run
`;

export interface ZoomStatus {
	readonly muted: boolean;
	readonly hidden: boolean;
}

interface CheckZoomStatusResult {
	readonly inMeeting: boolean;
	readonly muted: boolean;
	readonly hidden: boolean;
}

export async function getZoomStatus(): Promise<ZoomStatus | null> {
	const status = JSON.parse(
		await runApplescript(ZOOM_STATUS_APPLESCRIPT),
	) as CheckZoomStatusResult;

	if (!status.inMeeting) return null;

	return { hidden: status.hidden, muted: status.muted };
}

/**
 * Execute a Zoom action.
 *
 * You should call `getZoomStatus` immediately after to make sure it worked.
 */
export async function executeZoomAction(action: ZoomAction): Promise<void> {
	await runApplescript(generateZoomActionApplescript(action));
}
