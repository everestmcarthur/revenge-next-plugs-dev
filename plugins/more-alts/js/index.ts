import patchNativeSwitcher from './patches/nativeSwitcher'
import patchTabBarLongPress from './patches/tabBarLongPress'
import Settings from './ui/Settings'
import { DEFAULT_STORAGE, type MoreAltsStorage } from './lib/types'

export default plugin<{ jsonStorage: MoreAltsStorage }>({
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

		let unpatchNative = () => {}
		try {
			unpatchNative = patchNativeSwitcher(api.jsonStorage)
		} catch (e) {
			api.logger.error(`[MoreAlts] Failed to apply native switcher patch: ${e}`)
		}

		let unpatchLongPress = () => {}
		try {
			unpatchLongPress = patchTabBarLongPress(api.jsonStorage)
		} catch (e) {
			api.logger.error(`[MoreAlts] Failed to apply tab bar long press patch: ${e}`)
		}

		api.cleanup(() => {
			unpatchNative()
			unpatchLongPress()
		})
	},

	SettingsComponent: Settings,
})
