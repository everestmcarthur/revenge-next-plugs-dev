import { fetchCloudflareVault } from './api'
import { registerSlashCommands } from './commands/vault'
import { getCurrentUserId } from './components'
import { patchChatInput } from './patches/chatInput'
import { patchMessageActionSheet } from './patches/messageActionSheet'
import {
	defaultSettings,
	getStoredSettings,
	setJsonStorageInstance,
	updateStoredSettings,
} from './storage'
import Settings from './ui/Settings'
import type { StoredSettings } from './types'

export default plugin<{ jsonStorage: StoredSettings }>({
	jsonStorage: {
		load: true,
		default: defaultSettings,
	},

	start(api) {
		api.logger?.info?.('[ImageStealer] Starting ImageStealer...')

		if (api.jsonStorage) {
			setJsonStorageInstance(api.jsonStorage)
		}

		// Register with __everest / revenge.everest
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

		// 1. Message context menu hook ('Steal Emojis & Stickers')
		const unpatchActionSheet = patchMessageActionSheet()
		api.cleanup(unpatchActionSheet)

		// 2. Chat input hook (Nitro replacement & vault picker trigger)
		const unpatchChat = patchChatInput()
		api.cleanup(unpatchChat)

		// 3. Slash commands /vault and /steal
		const unregisterCommands = registerSlashCommands()
		api.cleanup(unregisterCommands)

		// 4. Background cloud sync
		setTimeout(() => {
			const settings = getStoredSettings()
			const userId = getCurrentUserId()
			if (userId && settings.syncWithCloud) {
				fetchCloudflareVault(userId).then(cloudItems => {
					if (cloudItems && cloudItems.length > 0) {
						const local = settings.vault
						const merged = [...cloudItems]
						for (const l of local) {
							if (!merged.some(m => m.id === l.id)) {
								merged.push(l)
							}
						}
						updateStoredSettings({ vault: merged })
					}
				})
			}
		}, 3000)

		api.logger?.info?.('[ImageStealer] Started cleanly.')
	},

	stop() {},
	SettingsComponent: Settings,
})
