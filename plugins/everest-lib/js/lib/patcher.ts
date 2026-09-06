import { getActivePluginId } from './modules'
import { logUsage } from './log'

export function safeInstead<
	Parent extends Record<Key, any>,
	Key extends keyof Parent,
>(
	parent: Parent,
	key: Key,
	hook: (args: any[], original: Parent[Key]) => any,
): () => void {
	const pluginId = getActivePluginId()
	try {
		const unpatch = revenge.patcher.instead(parent, key, hook as any)
		logUsage(pluginId, 'patcher', 'patch:instead', String(key), true)
		return () => {
			unpatch()
			logUsage(pluginId, 'patcher', 'unpatch:instead', String(key), true)
		}
	} catch (e) {
		logUsage(pluginId, 'patcher', 'patch:instead', String(key), false, String(e))
		return () => {}
	}
}

export function safeBefore<
	Parent extends Record<Key, any>,
	Key extends keyof Parent,
>(
	parent: Parent,
	key: Key,
	hook: (args: any[]) => any,
): () => void {
	const pluginId = getActivePluginId()
	try {
		const unpatch = revenge.patcher.before(parent, key, hook as any)
		logUsage(pluginId, 'patcher', 'patch:before', String(key), true)
		return () => {
			unpatch()
			logUsage(pluginId, 'patcher', 'unpatch:before', String(key), true)
		}
	} catch (e) {
		logUsage(pluginId, 'patcher', 'patch:before', String(key), false, String(e))
		return () => {}
	}
}

export function safeAfter<
	Parent extends Record<Key, any>,
	Key extends keyof Parent,
>(
	parent: Parent,
	key: Key,
	hook: (args: any[], result: any) => any,
): () => void {
	const pluginId = getActivePluginId()
	try {
		const unpatch = revenge.patcher.after(parent, key, hook as any)
		logUsage(pluginId, 'patcher', 'patch:after', String(key), true)
		return () => {
			unpatch()
			logUsage(pluginId, 'patcher', 'unpatch:after', String(key), true)
		}
	} catch (e) {
		logUsage(pluginId, 'patcher', 'patch:after', String(key), false, String(e))
		return () => {}
	}
}

export function safeInsteadJSX(
	component: any,
	hook: (args: any[], jsx: any) => any,
): () => void {
	const pluginId = getActivePluginId()
	const name = component?.displayName || component?.name || 'JSX'
	try {
		const unpatch = revenge.react.jsxRuntime.insteadJSX(component, hook)
		logUsage(pluginId, 'patcher', 'patch:insteadJSX', name, true)
		return () => {
			unpatch()
			logUsage(pluginId, 'patcher', 'unpatch:insteadJSX', name, true)
		}
	} catch (e) {
		logUsage(pluginId, 'patcher', 'patch:insteadJSX', name, false, String(e))
		return () => {}
	}
}

export function safeAfterJSX(
	component: any,
	hook: (element: any) => any,
): () => void {
	const pluginId = getActivePluginId()
	const name = component?.displayName || component?.name || 'JSX'
	try {
		const unpatch = revenge.react.jsxRuntime.afterJSX(component, hook)
		logUsage(pluginId, 'patcher', 'patch:afterJSX', name, true)
		return () => {
			unpatch()
			logUsage(pluginId, 'patcher', 'unpatch:afterJSX', name, true)
		}
	} catch (e) {
		logUsage(pluginId, 'patcher', 'patch:afterJSX', name, false, String(e))
		return () => {}
	}
}
