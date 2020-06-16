import runApplescript from 'run-applescript';

const ZOOM_STATUS_APPLESCRIPT = String.raw`
----------------------------------------------------------------------
--
-- Detect Zoom's Camera/Mic Status
-- © 2020 Ari Porad
--
-- Licensed under the MIT License: https://ariporad.mit-license.org
--
-- Attempts to detect if Zoom is actively using the Camera and/or
-- microphone, via detecting the unmute/start video items in its menu.
--
-- Returns output as a JSON string, with "muted" and "hidden" boolean
-- properties.
--
----------------------------------------------------------------------

on run
	tell application "System Events" to tell process "zoom.us"
		set isMuted to false
		set isHidden to false
		set isInMeeting to false

		try
			set theMenu to menu "Meeting" of menu bar item "Meeting" of menu bar 1
			set isInMeeting to true
			set isMuted to 0 is not (count of (menu items of theMenu where name starts with "Unmute Audio"))
			set isHidden to 0 is not (count of (menu items of theMenu where name starts with "Start Video"))
		on error number -1728 -- -1728 is when the "Meeting" menu doesn't exist (ie. we're not in a meeting)
		end try
		
		return "{\"inMeeting\": " & isInMeeting & ", \"muted\": " & isMuted & ", \"hidden\": " & isHidden & "}"
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
