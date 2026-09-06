import patchYouBarButtons, { requestYouBarUpdate } from './patches/youBarButtons'
import Settings from './ui/Settings'
import type { YouBarPlusStorage } from './lib/types'

export const DEFAULT_STORAGE: YouBarPlusStorage = {
	showDMButton: true,
	showSettingsButton: true,
}

export default plugin<{ jsonStorage: YouBarPlusStorage }>({
	jsonStorage: {
		load: true,
		default: DEFAULT_STORAGE,
	},

	start(api) {
		const everest = (globalThis as any).__everest
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

		void api.jsonStorage.get().then(() => {
			requestYouBarUpdate()
		})

		let unpatch = () => {}
		try {
			unpatch = patchYouBarButtons(api.jsonStorage)
		} catch (e) {
			api.logger.error(`[YouBar+] Failed to apply buttons patch: ${e}`)
		}

		api.cleanup(() => {
			unpatch()
		})
	},

	SettingsComponent: Settings,
})
