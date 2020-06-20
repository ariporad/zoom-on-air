import { Status } from '../common/ipcTypes';
import { assertExists } from './helpers';

interface StatusSubscriber {
	(newStatus: Status): void | Promise<void>;
}

const subscriptions: StatusSubscriber[] = [];

let currentStatus: Status;
export function getStatus(throwIfNone?: true): Status;
export function getStatus(throwIfNone: false): Status | null;
export function getStatus(throwIfNone: boolean = true): Status | null {
	return throwIfNone
		? assertExists(currentStatus, 'getCurrentStatus called before first status was set')
		: currentStatus;
}

export async function setStatus(status: Status): Promise<void> {
	currentStatus = Object.freeze(status);

	await Promise.all(subscriptions.map((subscriber) => subscriber(currentStatus)));
}

export function subscribe(subscriber: StatusSubscriber): void;
export function subscribe(subscribers: StatusSubscriber[]): void;
export function subscribe(...subscribers: StatusSubscriber[]): void;
export function subscribe(...subscribers: StatusSubscriber[] | [StatusSubscriber[]]): void {
	subscriptions.push(...subscribers.flat());
}
