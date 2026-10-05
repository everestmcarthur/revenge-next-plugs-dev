import { logUsage } from './log'
import { getActivePluginId } from './modules'

export function onModule(
	filter: any,
	cb: (namespace: any, id: number) => void,
): () => void {
	const pluginId = getActivePluginId()
	try {
		return revenge.modules.finders.getModules(
			filter,
			(namespace: any, id: number) => {
				logUsage(pluginId, 'finders', 'finder:module', String(id), !!namespace)
				cb(namespace, id)
			},
			{ returnNamespace: true, max: 1 },
		)
	} catch (e) {
		logUsage(pluginId, 'finders', 'finder:module', 'error', false, String(e))
		return () => {}
	}
}

export function onImportedPath<T = any>(
	path: string,
	cb: (namespace: T, id: number) => void,
): () => void {
	const pluginId = getActivePluginId()
	try {
		logUsage(pluginId, 'finders', 'finder:importedPath', path, true)
		return revenge.discord.utils.modules.finders.getModuleWithImportedPath<T>(
			path,
			(namespace, id) => {
				logUsage(pluginId, 'finders', 'finder:importedPath', path, !!namespace)
				cb(namespace, id as number)
			},
		)
	} catch (e) {
		logUsage(pluginId, 'finders', 'finder:importedPath', path, false, String(e))
		return () => {}
	}
}

export function forceInitModule(filter: any): void {
	const pluginId = getActivePluginId()
	try {
		revenge.modules.finders.lookupModule(filter, { initialize: true })
		logUsage(pluginId, 'finders', 'finder:forceInit', 'lookupModule', true)
	} catch (e) {
		logUsage(
			pluginId,
			'finders',
			'finder:forceInit',
			'lookupModule',
			false,
			String(e),
		)
	}
}

export * from './filters'
