let _verbose = false

export function setVerbose(enabled: boolean): void {
	_verbose = enabled
}

export function isVerbose(): boolean {
	return _verbose
}

export function verbose(...args: unknown[]): void {
	if (_verbose) {
		console.error('[verbose]', ...args)
	}
}
