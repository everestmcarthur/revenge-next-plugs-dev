export function getDiscordFinders(): any {
	return (
		(revenge.discord?.utils as any)?.modules?.finders ??
		(revenge.discord?.utils as any)?.finders ??
		(revenge as any)?.everest
	)
}

/**
 * Resolves a module by its recorded source path in Discord's bundle.
 * Returns the module exports (unwrapping the [exports, id] tuple).
 */
export function findByImportedPath<T = any>(path: string): T | null {
	const finders = getDiscordFinders()
	if (typeof finders?.lookupModuleWithImportedPath === 'function') {
		try {
			const res = finders.lookupModuleWithImportedPath(path)
			if (res && res.length > 0) {
				return (res[0]?.default ?? res[0]) as T
			}
		} catch {}
	}
	return null
}

/**
 * Resolves a module and its numeric ID by its recorded source path.
 * Returns [exports, id] or null if not resolved yet.
 */
export function findTupleByImportedPath<T = any>(path: string): [T, number] | null {
	const finders = getDiscordFinders()
	if (typeof finders?.lookupModuleWithImportedPath === 'function') {
		try {
			const res = finders.lookupModuleWithImportedPath(path)
			if (res && res.length > 0) {
				return [res[0] as T, res[1] as number]
			}
		} catch {}
	}
	return null
}

/**
 * Subscribes to Discord's module loading to resolve a module as soon as it imports.
 * Unsubscribes itself upon resolution, or returns a cancellation callback.
 */
export function waitForImportedPath<T = any>(
	path: string,
	callback: (exports: T, id: number) => void,
): (() => void) | void {
	const finders = getDiscordFinders()
	if (typeof finders?.getModuleWithImportedPath === 'function') {
		try {
			return finders.getModuleWithImportedPath(path, (exports: any, id: number) => {
				const exp = Array.isArray(exports) ? exports[0] : exports
				callback(exp as T, id)
			})
		} catch {}
	}
}

/**
 * Convenience helper that gets a module either immediately if already loaded,
 * or via callback when loaded.
 */
export function getImportedModule<T = any>(
	path: string,
	onModule: (exports: T, id?: number) => void,
): (() => void) | void {
	const tuple = findTupleByImportedPath<T>(path)
	if (tuple) {
		onModule(tuple[0], tuple[1])
		return
	}
	return waitForImportedPath<T>(path, (exp, id) => onModule(exp, id))
}
