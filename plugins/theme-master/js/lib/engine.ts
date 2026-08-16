import { installResolver, setTokenOverrides, uninstallResolver } from './resolver'
import type { JsonStorage } from '@revenge-mod/json-storage'
import type { ThemeMasterStorage } from './types'

function applyFromStorage(storage: ThemeMasterStorage | Record<string, any> | undefined) {
	setTokenOverrides(storage?.enabled ? (storage.semanticColors ?? {}) : {})
}

export default function startEngine(storage: JsonStorage<ThemeMasterStorage>): () => void {
	installResolver(() => applyFromStorage(storage.cache))
	const unsub = storage.subscribe(() => applyFromStorage(storage.cache))
	void storage.get().then(() => applyFromStorage(storage.cache))

	return () => {
		unsub?.()
		uninstallResolver()
	}
}
