import { DEFAULTS } from './defaults'
import { writeCurrentThemeToNative, writeFontToNative } from './lib/fs'
import { initLoader } from './lib/loader'
import Settings from './settings'
import type { ThemeifyStorage } from './types'

export default plugin<{ jsonStorage: ThemeifyStorage }>({
	jsonStorage: {
		load: true,
		default: DEFAULTS,
	},

	start({ cleanup, jsonStorage, plugin }) {
		if (plugin.startedLate) {
			try {
				plugin.requireReload()
			} catch {}
		}

		const loaderCleanup = initLoader(jsonStorage)
		cleanup(loaderCleanup)

		const syncToNative = (data?: ThemeifyStorage) => {
			try {
				const cache = data ?? {}
				if (cache.selectedThemeId && cache.themes?.[cache.selectedThemeId]) {
					writeCurrentThemeToNative(cache.themes[cache.selectedThemeId])
				}
				if (cache.selectedFontName && cache.fonts?.[cache.selectedFontName]) {
					writeFontToNative(cache.fonts[cache.selectedFontName].data)
				}
			} catch (e) {
				console.error('[Themeify] Failed to sync to native on startup', e)
			}
		}

		if (typeof jsonStorage.get === 'function') {
			jsonStorage.get().then((data) => syncToNative(data)).catch(() => {})
		}
	},

	SettingsComponent: Settings,
})
