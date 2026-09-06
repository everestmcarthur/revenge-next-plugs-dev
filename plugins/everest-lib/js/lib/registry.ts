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

const registry = new Map<string, RegisteredPlugin>()
const listeners = new Set<() => void>()

function notify() {
	for (const fn of listeners) fn()
}

export function registerPlugin(plugin: RegisteredPlugin) {
	registry.set(plugin.id, plugin)
	notify()
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
