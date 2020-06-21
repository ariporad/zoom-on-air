import runApplescript from 'run-applescript';
import { resolve } from 'path';
import { ZoomAction, Status } from '../common/ipcTypes';
import { app, dialog } from 'electron';
import { promises as fs, unlinkSync } from 'fs';
import { Tail } from 'tail';

async function exists(path: string) {
	try {
		await fs.stat(path);
		return true;
	} catch (err) {
		if (err.code === 'ENOENT') return false;
		throw err;
	}
}

const ZOOM_STATUS_LOG_PATH = resolve(app.getPath('temp'), 'zoomstatus.log');
const ZOOM_STATUS_LOG_CLEANUP_INTERVAL = 4 * 60 * 60 * 1000; // Every 4 hours

console.log('Zoom status log path:', ZOOM_STATUS_LOG_PATH);

const generateZoomStatusApplescript = (logPath: string) => String.raw`
on run
	tell application "System Events"
		repeat while true
			set isMuted to false
			set isHidden to false
			set isInMeeting to false
				try
					tell process "zoom.us"
						set theMenu to menu "Meeting" of menu bar item "Meeting" of menu bar 1
						set isInMeeting to true
						set isMuted to 0 is not (count of (menu items of theMenu where name starts with "Unmute Audio"))
						set isHidden to 0 is not (count of (menu items of theMenu where name starts with "Start Video"))
					end tell
				on error
					-- Nothing
				end try
			
			do shell script "echo " & quoted form of ("{\"inMeeting\": " & isInMeeting & ", \"muted\": " & isMuted & ", \"hidden\": " & isHidden & "}") & ">> ${logPath}"
		end repeat
	end tell
end run
`;

const generateZoomActionApplescript = (action: ZoomAction) => String.raw`
on run
	--tell application "System Events"
		tell process "zoom.us"
			try
				set theMenu to menu "Meeting" of menu bar item "Meeting" of menu bar 1
				set theButton to first item of (menu items of theMenu where name starts with "${action}")
				if theButton is not missing value
					click theButton
				end if 
			on error number -1728 -- -1728 is when the "Meeting" menu doesn't exist (ie. we're not in a meeting)
			end try
		end tell
	--end tell
end run
`;

export interface RawZoomStatus {
	readonly inMeeting: boolean;
	readonly muted: boolean;
	readonly hidden: boolean;
}

const hasProp = <T>(obj: T, key: keyof T): boolean => ({}.hasOwnProperty.call(obj, key));

export async function monitorZoomStatus(): Promise<
	AsyncGenerator<RawZoomStatus, never, undefined>
> {
	// Make sure the file exists
	if (!(await exists(ZOOM_STATUS_LOG_PATH))) await fs.writeFile(ZOOM_STATUS_LOG_PATH, '');

	let nextStatusResolve: (status: RawZoomStatus) => void = () => {};

	const tail = new Tail(ZOOM_STATUS_LOG_PATH);

	tail.on('error', (err) => {
		console.error('Zoom Status Log tailing error!');
		console.error(err);

		dialog.showErrorBox('Error Tailing Zoom Log! ' + err.message, err.stack);
		process.exit(1);
	});

	tail.on('line', (line: string) => {
		const status = JSON.parse(line) as RawZoomStatus;
		if (
			!hasProp(status, 'inMeeting') ||
			!hasProp(status, 'hidden') ||
			!hasProp(status, 'muted')
		) {
			console.error('Invalid status line, ignoring:');
			console.error(status);
		}

		nextStatusResolve(status);
	});

	tail.watch();

	return (async function* (): AsyncGenerator<RawZoomStatus, never, undefined> {
		while (true) {
			const value = await new Promise<RawZoomStatus>((done) => (nextStatusResolve = done));
			// Drop any updates that come in bofere the generator runs again
			nextStatusResolve = () => {};
			yield value;
		}
	})();
}

export async function startZoomMonitor(): Promise<never> {
	fs.writeFile(ZOOM_STATUS_LOG_PATH, ''); // Erase the file

	// Prevent the file from getting too long by clearing it every so often
	// This may be overkill
	setInterval(() => {
		fs.writeFile(ZOOM_STATUS_LOG_PATH, '');
	}, ZOOM_STATUS_LOG_CLEANUP_INTERVAL);

	// Be good citizens and clean up when we're done
	process.on('exit', () => {
		unlinkSync(ZOOM_STATUS_LOG_PATH);
	});

	// We put it in an infinite loop so we restart it if it dies
	while (true) {
		try {
			await runApplescript(generateZoomStatusApplescript(ZOOM_STATUS_LOG_PATH));
		} catch (err) {
			console.error('Zoom monitor Applescript failed, restarting...');
			console.error(err);
		}
	}
}

/**
 * Execute a Zoom action.
 *
 * @returns was the action successful? (Ignores if it was invalid. Doesn't throw an error for convienence)
 */
export async function executeZoomAction(
	action: ZoomAction,
	showDialogOnFail: boolean = true,
): Promise<boolean> {
	console.log('Executing Zoom Action:', action);
	try {
		await runApplescript(generateZoomActionApplescript(action));
		return true;
	} catch (err) {
		console.error('Failed to execute Zoom action:', action);
		console.error(err);
		dialog.showErrorBox(
			`Failed to Execute Zoom Action: ${action}`,
			err.message + (err.stack ? '\n' + err.stack : ''),
		);
		return false;
	}
}

export function deriveStatusFromRawZoomStatus(zoomStatus: RawZoomStatus): Status {
	try {
		if (!zoomStatus.inMeeting) return { type: 'hidden' };

		return {
			type: 'in-meeting',
			hidden: zoomStatus.hidden,
			muted: zoomStatus.muted,
		};
	} catch (err) {
		console.error('Failed to Update Zoom Status!');
		console.error(err);
		return {
			type: 'error',
			title: 'Failed to Check Zoom Status',
			text: "It just didn't work",
		};
	}
}
