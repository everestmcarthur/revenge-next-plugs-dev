import { JsonStorageUpdateMode } from '@revenge-mod/json-storage'
import { patchClyde } from './patches/clyde'
import type { ClydeEditorStorage } from './lib/types'
import Settings from './ui/Settings'

export default plugin<{ jsonStorage: ClydeEditorStorage }>({
	jsonStorage: {
		load: true,
		default: {
			destroyClyde: false,
			name: 'Clyde',
			avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
			banner: '',
			bio: "I'm your friendly Discord bot companion!",
			tagText: 'APP',
			tagTextColor: '#FFFFFF',
			tagBackgroundColor: '#5865F2',
			tagVerified: true,
			color: '#5865F2',
			selectedPreset: 'clyde',
		},
	},

	start(api) {
		api.logger.info('[Clyde Utils] Starting plugin...')
		if (api.plugin.startedLate) {
			try {
				api.plugin.requireReload()
			} catch {}
		}

		let unpatch = () => {}
		try {
			unpatch = patchClyde(api.jsonStorage)
			api.logger.info('[Clyde Utils] Successfully applied all patches!')
		} catch (e) {
			api.logger.error(`[Clyde Utils] Failed to apply patches: ${e}`)
		}

		const unsubStorage = api.jsonStorage.subscribe((_, mode) => {
			if (mode === JsonStorageUpdateMode.Load) return
			api.plugin.requireReload()
		})

		api.cleanup(() => {
			unpatch()
			try {
				unsubStorage()
			} catch {}
		})
	},

	stop({ plugin }) {
		plugin.requireReload()
	},

	SettingsComponent: Settings,
})
