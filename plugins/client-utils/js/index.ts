import { setupHooks } from './hooks'
import { registerBuiltinCommands } from './builtins'
import {
	registerCommand,
	unregisterCommand,
	commands,
	syncIndexStore,
} from './registry'

const clientUtilsApi = {
	registerCommand,
	unregisterCommand,
	commands,
	syncIndexStore,
	version: '1.0.26',
}

export default plugin({
	start(api) {
		api.logger.info('[ClientUtils] Initializing modular slash command engine...')

		setupHooks({ cleanup: api.cleanup, logger: api.logger })
		registerBuiltinCommands()

		const everest = (globalThis as any).__everest ?? (globalThis as any).revenge?.everest
		everest?.setActivePlugin?.(api.plugin.manifest.id)
		everest?.registerPlugin?.({
			id: api.plugin.manifest.id,
			name: api.plugin.manifest.name,
			icon: api.plugin.manifest.icon,
			author: api.plugin.manifest.author,
			description: api.plugin.manifest.description,
			version: api.plugin.manifest.version,
			getStatus: () => api.plugin.status,
			getErrors: () => api.plugin.errors,
		})

		;(globalThis as any).__c_utils = clientUtilsApi
		if (typeof (revenge?.plugins as any) !== 'undefined') {
			;(revenge.plugins as any).clientUtils = clientUtilsApi
		}

		api.cleanup(() => {
			delete (globalThis as any).__c_utils
			if ((revenge?.plugins as any)?.clientUtils) {
				delete (revenge.plugins as any).clientUtils
			}
			api.logger.info('[ClientUtils] Stopped cleanly.')
		})
	},
})
