import { DEFAULTS } from './defaults'
import { updateFonts } from './lib/fonts'
import { initLoader } from './lib/loader'
import { getCurrentTheme, updateThemes, writeThemeToNative } from './lib/themes'
import Settings from './settings'
import type { ThemeMasterStorage } from './types'

export default plugin<{ jsonStorage: ThemeMasterStorage }>({
	jsonStorage: {
		load: true,
		default: DEFAULTS,
	},
	async start({ cleanup, jsonStorage, plugin }) {
		const loaderCleanup = initLoader(jsonStorage)

		const write = async () => {
			const theme = getCurrentTheme(jsonStorage)
			await writeThemeToNative(theme ?? {})
		}

		const unsubscribe = jsonStorage.subscribe(write)
		if (jsonStorage.loaded) await write()
		void jsonStorage.get().then(write)

		try {
			await updateThemes(jsonStorage)
		} catch (e) {
			console.error(`[${plugin.manifest.id}] Failed to update themes`, e)
		}

		try {
			await updateFonts(jsonStorage)
		} catch (e) {
			console.error(`[${plugin.manifest.id}] Failed to update fonts`, e)
		}

		cleanup(loaderCleanup)
		cleanup(unsubscribe)
	},
	SettingsComponent: Settings,
})
