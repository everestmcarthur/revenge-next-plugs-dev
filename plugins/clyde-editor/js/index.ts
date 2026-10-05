import { patchClyde } from './patches/clyde'
import { CLYDE_DEFAULTS, type ClydeEditorStorage } from './lib/types'
import Settings from './ui/Settings'

export default plugin<{ jsonStorage: ClydeEditorStorage }>({
	jsonStorage: {
		load: true,
		default: CLYDE_DEFAULTS,
	},

	start(api) {
		const everest =
			(api as any).plugin?.api?.unscoped?.everest ??
			(revenge as any)?.everest ??
			(globalThis as any)?.__everest
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

		api.logger.info('[Clyde Utils] Starting plugin...')

		let unpatch = () => {}
		try {
			unpatch = patchClyde(api.jsonStorage)
			api.logger.info('[Clyde Utils] Successfully applied all patches!')
		} catch (e) {
			api.logger.error(`[Clyde Utils] Failed to apply patches: ${e}`)
		}

		api.cleanup(() => {
			unpatch()
		})
	},

	stop({ plugin }) {
		plugin.requireReload()
	},

	SettingsComponent: Settings,
})
