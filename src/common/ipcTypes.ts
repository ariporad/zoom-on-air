export type Status = LoadingStatus | HiddenStatus | ErrorStatus | InMeetingStatus;

export interface LoadingStatus {
	type: 'loading';
}

export interface HiddenStatus {
	type: 'hidden';
}

export interface ErrorStatus {
	type: 'error';
	title: string;
	text?: string;
}

export interface InMeetingStatus {
	type: 'in-meeting';
	hidden: boolean;
	muted: boolean;
}

/**
 * An enumeration of all the actions we can trigger in Zoom.
 *
 * The string value is the name of the corresponding menu item (within the `Meeting` menu).
 */
export enum ZoomAction {
	Mute = 'Mute Audio',
	Unmute = 'Unmute Audio',
	Hide = 'Stop Video',
	Unhide = 'Start Video',
}
