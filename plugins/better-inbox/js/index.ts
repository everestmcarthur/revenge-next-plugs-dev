import { DEFAULT_STORAGE, type BetterInboxStorage } from './lib/types'
import { startInboxTracking } from './lib/notifications'
import patchYouBarButton from './patches/youbar'
import patchInAppNotifications from './patches/inAppNotifications'
import Settings from './ui/Settings'

export default plugin<{ jsonStorage: BetterInboxStorage }>({
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

		const cleanups: Array<() => void> = []

		try {
			const stopTracking = startInboxTracking(api.jsonStorage)
			cleanups.push(stopTracking)
		} catch (e) {
			api.logger.error(`[BetterInbox] Error starting inbox tracker: ${e}`)
		}

		try {
			const unpatchYouBar = patchYouBarButton(api.jsonStorage)
			cleanups.push(unpatchYouBar)
		} catch (e) {
			api.logger.error(`[BetterInbox] Error patching YouBar button: ${e}`)
		}

		try {
			const unpatchInApp = patchInAppNotifications(api.jsonStorage)
			cleanups.push(unpatchInApp)
		} catch (e) {
			api.logger.error(`[BetterInbox] Error patching in-app notifications: ${e}`)
		}

		api.cleanup(() => {
			for (const fn of cleanups) {
				try {
					fn()
				} catch {}
			}
		})
	},

	SettingsComponent: Settings,
})
