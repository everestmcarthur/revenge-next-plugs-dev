import startEngine from './lib/engine'
import Settings from './ui/pages/Settings'
import type { ThemeMasterStorage } from './lib/types'

export default plugin<{ jsonStorage: ThemeMasterStorage }>({
	jsonStorage: {
		load: true,
		default: {
			enabled: false,
			specName: '',
			specUrl: '',
			semanticColors: {},
		},
	},

	start(api) {
		let stop = () => {}
		try {
			stop = startEngine(api.jsonStorage)
		} catch (e) {
			api.logger.error(`[Theme Master] Failed to start the theme engine: ${e}`)
		}
		api.cleanup(stop)
	},

	SettingsComponent: Settings,
})
