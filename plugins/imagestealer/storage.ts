import type { StoredSettings, VaultItem } from './types'

export const defaultSettings: StoredSettings = {
	apiUrl: 'https://imagestealer-backend.allyapp.workers.dev',
	sendFormat: 'cdn',
	autoCompress: true,
	syncWithCloud: true,
	nitroBypass: true,
	zipline: {
		enabled: false,
		host: 'i.allyapp.cc',
		token: '',
	},
	vault: [],
	stashServers: [],
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
			'dev.everestmcarthur.imagestealer',
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
				zipline: {
					...defaultSettings.zipline,
					...(c.zipline ?? {}),
				},
				vault: Array.isArray(c.vault) ? c.vault : [],
				stashServers: Array.isArray(c.stashServers) ? c.stashServers : [],
			}
		}
	} catch {}
	return defaultSettings
}

export function updateStoredSettings(
	patch: Partial<StoredSettings>,
): StoredSettings {
	const current = getStoredSettings()
	const updated = {
		...current,
		...patch,
		zipline: {
			...current.zipline,
			...(patch.zipline ?? {}),
		},
		vault: patch.vault !== undefined ? patch.vault : current.vault,
		stashServers:
			patch.stashServers !== undefined
				? patch.stashServers
				: current.stashServers,
	}
	const inst = getStorage()
	if (typeof inst?.set === 'function') {
		inst.set(updated)
	}
	return updated
}

export function addVaultItemToStorage(item: VaultItem): StoredSettings {
	const current = getStoredSettings()
	const filtered = current.vault.filter(
		i => i.id !== item.id && i.url !== item.url,
	)
	const newVault = [item, ...filtered]
	return updateStoredSettings({ vault: newVault })
}

export function removeVaultItemFromStorage(itemId: string): StoredSettings {
	const current = getStoredSettings()
	const newVault = current.vault.filter(i => i.id !== itemId)
	return updateStoredSettings({ vault: newVault })
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
