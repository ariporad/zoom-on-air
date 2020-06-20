import { resolve } from 'path';
import util from 'electron-util';

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
