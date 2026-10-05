export interface RegisteredPlugin {
	id: string
	name: string
	description: string
	author?: string
	icon?: string
	version: any
	getStatus: () => number
	getErrors: () => readonly unknown[]
}

/**
 * Whether a plugin is installed.
 * Uses live plugin list where available, falling back to storage dir existence.
 */
export function isPluginInstalled(id: string): boolean {
	try {
		const plugins = (revenge as any)?.plugins
		if (typeof plugins?.has === 'function') {
			return plugins.has(id) === true
		}
		if (typeof plugins?.isInstalled === 'function') {
			return plugins.isInstalled(id) === true
		}
	} catch {}

	try {
		const fs = (revenge as any)?.modules?.native?.fs
		if (typeof fs?.existsSync === 'function') {
			const dir = `/data/data/com.discord/files/revenge/plugins/${id}`
			return fs.existsSync(dir) === true
		}
	} catch {}

	return false
}

const registry = new Map<string, RegisteredPlugin>()
const listeners = new Set<() => void>()

function notify() {
	for (const fn of listeners) {
		try {
			fn()
		} catch {}
	}
}

export function registerPlugin(plugin: RegisteredPlugin) {
	registry.set(plugin.id, plugin)
	notify()
}

/**
 * Whether a plugin is running in this process right now.
 */
export function isPluginRunning(id: string): boolean {
	return registry.has(id)
}

export function unregisterPlugin(id: string) {
	if (registry.delete(id)) {
		notify()
	}
}

export function getRegisteredPlugin(id: string): RegisteredPlugin | undefined {
	return registry.get(id)
}

export function getAllRegisteredPlugins(): RegisteredPlugin[] {
	return Array.from(registry.values())
}

export function onRegistryChange(fn: () => void): () => void {
	listeners.add(fn)
	return () => {
		listeners.delete(fn)
	}
}
