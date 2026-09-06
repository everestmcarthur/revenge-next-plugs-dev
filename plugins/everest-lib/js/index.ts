import * as Modules from './lib/modules'
import * as Finders from './lib/finders'
import * as Stores from './lib/stores'
import * as Navigation from './lib/navigation'
import * as Patcher from './lib/patcher'
import * as Icons from './lib/icons'
import * as Tokens from './lib/tokens'
import * as Sheets from './lib/sheets'
import * as Registry from './lib/registry'
import * as Log from './lib/log'
import Settings from './ui/Settings'

const EverestLib = {
	...Modules,
	...Finders,
	...Stores,
	...Navigation,
	...Patcher,
	...Icons,
	...Tokens,
	...Sheets,
	...Registry,
	...Log,
}

// Attach to globalThis for consumption across plugins
;(globalThis as any).__everest = EverestLib

export default plugin({
	start({ decorate, plugin }) {
		if (plugin.startedLate) {
			try {
				plugin.requireReload()
			} catch {}
		}

		decorate((targetPlugin) => {
			targetPlugin.api.unscoped.everest = EverestLib
		})
	},
	SettingsComponent: Settings,
})

export type EverestLibApi = typeof EverestLib

declare module '@revenge-mod/plugins/types' {
	interface UnscopedPluginApi {
		everest: EverestLibApi
	}
}
