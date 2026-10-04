import { registerQuoteSlashCommand } from './commands/quote'
import { patchMessageActionSheet } from './patches/messageActionSheet'
import Settings from './Settings'
import { defaultSettings, setJsonStorageInstance } from './storage'
import type { StoredSettings } from './types'

export default plugin<{ jsonStorage: StoredSettings }>({
	jsonStorage: {
		load: true,
		default: defaultSettings,
	},

	start(api) {
		api.logger?.info?.('[Quote] Starting Make It A Quote...')

		if (api.jsonStorage) {
			setJsonStorageInstance(api.jsonStorage)
		}

		// Register with __everest if present (Rosie's plugin manager pattern)
		let rev: any
		try {
			if (typeof revenge !== 'undefined') rev = revenge
		} catch {}
		rev ??= (globalThis as any).revenge
		let everest: any
		try {
			if (typeof __everest !== 'undefined') everest = __everest
		} catch {}
		everest ??= (globalThis as any).__everest ?? rev?.everest
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

		// 1. Action sheet hook (derived-promise openLazy + tralwdwdd patcher)
		const unpatchActionSheet = patchMessageActionSheet()
		api.cleanup(unpatchActionSheet)

		// 2. Slash command /quote (Rosie's ClientUtils)
		const unregisterCommand = registerQuoteSlashCommand()
		api.cleanup(unregisterCommand)

		api.logger?.info?.('[Quote] Started cleanly.')
	},
	stop() {},
	SettingsComponent: Settings,
})
