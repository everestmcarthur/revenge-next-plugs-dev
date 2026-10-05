import { EverestLib } from './lib/api'
import * as Log from './lib/log'
import * as Modules from './lib/modules'
import Settings from './ui/Settings'

// Attach to globals immediately for synchronous availability across all plugins
;(revenge as any).everest = EverestLib
;(globalThis as any).__everest = EverestLib

export default plugin({
	start({ decorate, plugin }) {
		if (plugin.startedLate) {
			try {
				plugin.requireReload()
			} catch {}
		}

		// Logs every native call with the calling plugin attached.
		const native = (revenge as any).modules?.native
		if (native && typeof native.callNativeMethod === 'function') {
			const original = native.callNativeMethod
			native.callNativeMethod = function patchedNative(
				method: string,
				args: any[],
			) {
				const caller = Modules.getActivePluginId?.() ?? 'unknown'
				let found = true
				let result: any
				try {
					result = original.call(this, method, args)
				} catch {
					found = false
				}
				Log.addLog({
					id: caller,
					module: 'native',
					action: method,
					target: method,
					attempt: 1,
					found,
				})
				return result
			}
		}

		// Decorate all plugins with scoped and unscoped access to EverestLib
		decorate(targetPlugin => {
			targetPlugin.api.unscoped.everest = EverestLib
		})
	},
	SettingsComponent: Settings,
})

export { EverestLib }
export type EverestLibApi = typeof EverestLib

declare module '@revenge-mod/plugins/types' {
	interface UnscopedPluginApi {
		everest: EverestLibApi
	}
}
