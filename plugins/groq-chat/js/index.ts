import type { GroqChatStorage } from './lib/types'
import { DEFAULT_STORAGE } from './lib/constants'
import { setupGroqCommands } from './lib/commands'
import Settings from './ui/Settings'

export default plugin<{
	jsonStorage: GroqChatStorage
}>({
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

		const cleanup = setupGroqCommands(api.jsonStorage)

		api.cleanup(() => {
			try {
				cleanup?.()
			} catch {}
		})
	},

	SettingsComponent: Settings,
})
