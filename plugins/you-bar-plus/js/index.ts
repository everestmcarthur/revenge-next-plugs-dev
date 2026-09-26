import patchYouBarButtons, { requestYouBarUpdate } from './patches/youBarButtons'
import patchCompactYou, { syncConstants } from './patches/compactYou'
import patchHideBuiltinDm, { requestGuildsBarUpdate } from './patches/hideBuiltinDm'
import Settings from './ui/Settings'
import { DEFAULT_STORAGE, type YouBarPlusStorage } from './lib/types'
import { initStorage } from './lib/storage'

export default plugin<{ jsonStorage: YouBarPlusStorage }>({
	jsonStorage: {
		load: true,
		default: DEFAULT_STORAGE,
	},

	start(api) {
		if (api.plugin.startedLate) {
			try {
				api.plugin.requireReload()
			} catch {}
		}

		const cleanStorage = initStorage(api.jsonStorage)

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
			syncConstants()
			requestYouBarUpdate()
			requestGuildsBarUpdate()
		})

		let unpatchButtons = () => {}
		try {
			unpatchButtons = patchYouBarButtons(api.jsonStorage)
		} catch (e) {
			api.logger.error(`[YouBar+] Failed to apply buttons patch: ${e}`)
		}

		let unpatchCompact = () => {}
		try {
			unpatchCompact = patchCompactYou(api.jsonStorage)
		} catch (e) {
			api.logger.error(`[YouBar+] Failed to apply compacting patch: ${e}`)
		}

		let unpatchBuiltinDm = () => {}
		try {
			unpatchBuiltinDm = patchHideBuiltinDm(api.jsonStorage)
		} catch (e) {
			api.logger.error(`[YouBar+] Failed to apply hide builtin DM patch: ${e}`)
		}

		api.cleanup(() => {
			cleanStorage()
			unpatchButtons()
			unpatchCompact()
			unpatchBuiltinDm()
		})
	},

	SettingsComponent: Settings,
})
