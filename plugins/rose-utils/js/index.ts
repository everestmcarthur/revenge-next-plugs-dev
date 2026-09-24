import { initSilentEdit } from './features/silentEdit'
import { initNoTypingAnimation } from './features/noTypingAnimation'
import { initAnonymousFileNames } from './features/anonymousFileNames'
import { initValidUser } from './features/validUser'
import { initCharCounter } from './features/charCounter'
import { initUwUify } from './features/uwuify'
import { initPiratifier } from './features/piratifier'
import { initGifRoulette } from './features/gifRoulette'
import { initUrbanDictionary } from './features/urbanDictionary'
import { initCopyRoleColor } from './features/copyRoleColor'
import { initRoleColorEverywhere } from './features/roleColorEverywhere'
import { initCustomUserTags } from './features/customUserTags'
import { initServerInfo } from './features/serverInfo'
import { initUserNotif } from './features/userNotif'
import { initDislate } from './features/dislate'
import { initRpc } from './features/rpc'
import { initTranslate } from './features/translate'
import Settings from './settings'
import { defaultSettings, type RoseUtilsSettings } from './types'

export default plugin<{ jsonStorage: RoseUtilsSettings }>({
	jsonStorage: {
		load: true,
		default: defaultSettings,
	},

	start(api) {
		if (api.plugin.startedLate) {
			try {
				api.plugin.requireReload()
			} catch {}
		}

		const getSettings = (): RoseUtilsSettings => {
			const cache = api.jsonStorage.cache || {}
			return { ...defaultSettings, ...cache }
		}

		let cleanups: (() => void)[] = []

		const startFeatures = () => {
			for (const c of cleanups) {
				try {
					c()
				} catch {}
			}
			cleanups = []
			const settings = getSettings()
			cleanups = [
				initSilentEdit(settings),
				initNoTypingAnimation(settings),
				initAnonymousFileNames(settings),
				initValidUser(settings),
				initCharCounter(settings),
				initUwUify(settings),
				initPiratifier(settings),
				initGifRoulette(settings),
				initUrbanDictionary(settings),
				initCopyRoleColor(settings),
				initRoleColorEverywhere(settings),
				initCustomUserTags(settings),
				initServerInfo(settings),
				initUserNotif(settings),
				initDislate(settings),
				initRpc(settings),
				initTranslate(settings),
			]
		}

		startFeatures()

		if (typeof api.jsonStorage.subscribe === 'function') {
			api.cleanup(
				api.jsonStorage.subscribe(() => {
					startFeatures()
				})
			)
		} else if (typeof api.jsonStorage.get === 'function') {
			Promise.resolve(api.jsonStorage.get()).then(() => {
				startFeatures()
			})
		}

		api.cleanup(() => {
			for (const c of cleanups) {
				try {
					c()
				} catch {}
			}
			cleanups = []
		})
	},

	SettingsComponent: Settings,
})
