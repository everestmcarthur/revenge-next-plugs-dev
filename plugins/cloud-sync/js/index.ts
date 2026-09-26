import { constants } from './vendetta'
import { findByStoreName } from './vendetta'
import { storage } from './vendetta'
import { plugins } from './vendetta'
import { themes } from './vendetta'

import Settings from './components/Settings'
import { lang as LangInstance } from './lang'
import { useAuthorizationStore } from './stores/AuthorizationStore'
import { useCacheStore } from './stores/CacheStore'
import { getData, saveData } from './stuff/api'
import { debounceSync } from './stuff/http'
import patcher from './stuff/patcher'
import { grabEverything } from './stuff/syncStuff'

const UserStore = findByStoreName('UserStore')

export const vstorage = storage as {
	config: {
		autoSync: boolean
		addToSettings: boolean
		ignoredPlugins: string[]
	}
	custom: {
		host: string
		clientId: string
	}
	realTrackingAnalyticsSentToChina: {
		pressedSettings?: boolean
		tooMuchData?: boolean
	}
}

export function isPluginProxied(id: string) {
	return [constants?.PROXY_PREFIX, (constants as any)?.BUNNY_PROXY_PREFIX]
		.filter(Boolean)
		.some(x => id.startsWith(x))
}

export function canImport(id: string) {
	return !id.includes('cloud-sync')
}

const autoSync = async () => {
	if (
		!vstorage?.config?.autoSync ||
		!useAuthorizationStore.getState().isAuthorized()
	) {
		return
	}

	const cache = useCacheStore.getState()
	const everything = await grabEverything()

	if (!Object.keys(everything.plugins).length) return

	if (JSON.stringify(cache.data) !== JSON.stringify(everything)) {
		const userId = UserStore?.getCurrentUser()?.id ?? null
		if (initState.didInit !== userId) {
			initState.didInit = userId
			await getData()
		}

		if (JSON.stringify(cache.data) !== JSON.stringify(everything)) {
			debounceSync(async () => {
				try {
					if (useAuthorizationStore.getState().isAuthorized()) {
						await saveData(everything)
					}
				} catch (e: any) {
					if (e?.message?.toLowerCase().includes('request entity too large')) {
						vstorage.realTrackingAnalyticsSentToChina.tooMuchData = true
						vstorage.config.autoSync = false
					}
				}
			})
		}
	}
}

const emitterSymbol = Symbol.for('vendetta.storage.emitter')

export const lang = LangInstance
export const initState: { didInit: string | null } = {
	didInit: null,
}

const patches: (() => void)[] = []

export function onLoad() {
	vstorage.config ??= {
		autoSync: false,
		addToSettings: true,
		ignoredPlugins: [],
	}
	vstorage.custom ??= {
		host: '',
		clientId: '',
	}
	vstorage.realTrackingAnalyticsSentToChina ??= {
		pressedSettings: false,
		tooMuchData: false,
	}

	try {
		const pluginEmitter = (plugins as any)?.[emitterSymbol]
		const themeEmitter = (themes as any)?.[emitterSymbol]

		if (pluginEmitter) {
			pluginEmitter.on('SET', autoSync)
			pluginEmitter.on('DEL', autoSync)
			patches.push(() => {
				pluginEmitter.off('SET', autoSync)
				pluginEmitter.off('DEL', autoSync)
			})
		}

		if (themeEmitter) {
			themeEmitter.on('SET', autoSync)
			themeEmitter.on('DEL', autoSync)
			patches.push(() => {
				themeEmitter.off('SET', autoSync)
				themeEmitter.off('DEL', autoSync)
			})
		}
	} catch {}

	patches.push(patcher())
}

export function onUnload() {
	for (const x of patches) {
		try {
			x()
		} catch {}
	}
}

export const settings = Settings

// Revenge Next plugin API export
export default plugin({
	start(api: any) {
		onLoad()
		api?.cleanup?.(() => onUnload())
	},
	SettingsComponent: Settings,
})
