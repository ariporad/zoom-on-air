import { resolve } from 'path';
import { promises as fs, readFileSync, writeFileSync } from 'fs';
import util from 'electron-util';
import { Status } from '../common/ipcTypes';
import { app } from 'electron';

export const RESOURCE_PATH: string = util.is.development
	? resolve(__dirname, '..', '..', 'res')
	: resolve(process.resourcesPath, 'res');

export const sleep = (time: number) => new Promise((done) => setTimeout(done, time));

class AssertionError extends Error {}

export function assertExists<T>(
	thing: T | null | undefined,
	message: string = 'Assertion Failed',
): T {
	if (thing === null || thing === undefined) throw new AssertionError(message);
	return thing;
}

interface Subscriber<T> {
	(newValue: T): void | Promise<void>;
}

export abstract class Manager<T> {
	private _current: T;
	private subscriptions: Subscriber<T>[] = [];

	constructor(initialValue: T) {
		this._current = initialValue;
	}

	get current(): T {
		return deepCopy(this._current);
	}

	protected async set(newValue: Partial<T>): Promise<void> {
		this._current = { ...this._current, ...newValue };
		await Promise.all(this.subscriptions.map((subscriber) => subscriber(this.current)));
	}

	async subscribe(subscriber: Subscriber<T>): Promise<void>;
	async subscribe(subscribers: Subscriber<T>[]): Promise<void>;
	async subscribe(subscribers: Subscriber<T> | Subscriber<T>[]): Promise<void> {
		if (!Array.isArray(subscribers)) subscribers = [subscribers];
		this.subscriptions.push(...subscribers);
		await Promise.all(subscribers.map((subscriber) => subscriber(this.current)));
	}
}

/**
 * A `Manager` backed by memory.
 */
export class MemManager<T> extends Manager<T> {
	public async set(newValue: Partial<T>): Promise<void> {
		return super.set(newValue);
	}
}

export const deepCopy = <T>(obj: T) => JSON.parse(JSON.stringify(obj));

/**
 * A `Manager` backed by a JSON store. Not "thread" safe (ie. don't use more than one instance at once).
 */
export class ConfManager<T> extends Manager<T> {
	public readonly path: string;
	private readonly defaults: T;

	constructor(defaults: T, path: string = resolve(app.getPath('userData'), 'config.json')) {
		let initialValue: T;
		try {
			const text = readFileSync(path, 'utf8');
			initialValue = JSON.parse(text);
		} catch (err) {
			console.log("Config didn't exist, using defaults");
			initialValue = defaults;

			try {
				writeFileSync(path, JSON.stringify(defaults, null, 2));
			} catch (err) {
				console.log('Failed to write config defaults. Ignoring.');
			}
		}

		super(initialValue);

		this.defaults = defaults;
		this.path = path;
	}

	public async read(): Promise<void> {
		try {
			const text = await fs.readFile(this.path, 'utf8');
			this.set(JSON.parse(text));
		} catch (err) {
			console.log("Config didn't exist, using defaults");
			this.set(this.defaults);
			try {
				await this.write();
			} catch (err) {
				console.log('Failed to write config defaults. Ignoring');
			}
		}
	}

	private async write(): Promise<void> {
		await fs.writeFile(this.path, JSON.stringify(this.current, null, 2));
	}

	public async set(newValue: Partial<T>): Promise<void> {
		await super.set(newValue);
		await this.write();
	}
}

export interface ConfigType {
	v: 1;

	openAtLogin: boolean;
	showDockIcon: boolean;

	muteHotkey: string | null;
	hideHotkey: string | null;
}

const defaultConfig: ConfigType = {
	v: 1,

	openAtLogin: true,
	showDockIcon: false,

	muteHotkey: 'F20',
	hideHotkey: 'F19',
};

export const statusManager = new MemManager<Status>({ type: 'loading' });
export const configManager = new ConfManager<ConfigType>(defaultConfig);
