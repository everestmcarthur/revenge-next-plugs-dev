import { patchClyde } from './patches/clyde'
import { CLYDE_DEFAULTS, type ClydeEditorStorage } from './lib/types'
import Settings from './ui/Settings'

export default plugin<{ jsonStorage: ClydeEditorStorage }>({
	jsonStorage: {
		load: true,
		default: CLYDE_DEFAULTS,
	},

	start(api) {
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
