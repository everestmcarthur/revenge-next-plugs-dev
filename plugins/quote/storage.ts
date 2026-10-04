import type { StoredSettings } from './types'

export const defaultSettings: StoredSettings = {
	blockMode: 'never',
	allowCustomQuotes: true,
	forceDisableCustomQuotes: false,
	instantQuote: true,
	zipline: {
		enabled: false,
		host: 'i.allyapp.cc',
		token: '',
	},
	defaultSettings: {
		light: false,
		color: false,
		bold: false,
		flip: false,
		new: false,
		gif: false,
		watermark: false,
		watermarkText: 'Make It A Quote',
	},
}

let activeJsonStorage: any = null

export function setJsonStorageInstance(inst: any) {
	activeJsonStorage = inst
}

export function getStorage(): any {
	if (activeJsonStorage) return activeJsonStorage
	const rev = (globalThis as any).revenge
	if (
		rev?.jsonStorage?.getJsonStorage &&
		rev?.jsonStorage?.pluginStoragePathFor
	) {
		const path = rev.jsonStorage.pluginStoragePathFor(
			'dev.everestmcarthur.quote',
			'settings.json',
		)
		activeJsonStorage = rev.jsonStorage.getJsonStorage(path, {
			default: defaultSettings,
			load: true,
		})
		return activeJsonStorage
	}
	return {
		cache: defaultSettings,
		use: () => defaultSettings,
		get: async () => defaultSettings,
		set: async (val: any) => {
			Object.assign(defaultSettings, val)
		},
	}
}

export function getStoredSettings(): StoredSettings {
	try {
		const inst = getStorage()
		const c = inst?.cache
		if (c) {
			return {
				...defaultSettings,
				...c,
				defaultSettings: {
					...defaultSettings.defaultSettings,
					...(c.defaultSettings ?? {}),
				},
				zipline: {
					...defaultSettings.zipline,
					...(c.zipline ?? {}),
				},
			}
		}
	} catch {}
	return defaultSettings
}

export const storage = new Proxy({} as any, {
	get(_target, prop) {
		if (prop === 'cache') {
			return getStoredSettings()
		}
		const inst = getStorage()
		const val = inst[prop]
		return typeof val === 'function' ? val.bind(inst) : val
	},
	set(_target, prop, value) {
		const inst = getStorage()
		inst[prop] = value
		return true
	},
})
