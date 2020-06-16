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
