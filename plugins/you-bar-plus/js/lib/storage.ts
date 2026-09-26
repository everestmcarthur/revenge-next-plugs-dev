import type { JsonStorage } from '@revenge-mod/json-storage'
import { DEFAULT_STORAGE, type YouBarPlusStorage } from './types'

let activeStorageInstance: JsonStorage<YouBarPlusStorage> | null = null
let memoryStorage: YouBarPlusStorage = { ...DEFAULT_STORAGE }

export function initStorage(storage: JsonStorage<YouBarPlusStorage>): () => void {
	activeStorageInstance = storage

	// Synchronously hydrate from cache if available on boot
	if ((storage as any)?.cache) {
		memoryStorage = { ...DEFAULT_STORAGE, ...(storage as any).cache }
	}

	storage.get().then((val) => {
		if (val) {
			memoryStorage = { ...DEFAULT_STORAGE, ...val }
		}
	})

	const unsub = storage.subscribe((val) => {
		const current = val || (storage as any)?.cache
		if (current) {
			memoryStorage = { ...DEFAULT_STORAGE, ...current }
		}
	})

	return () => {
		unsub?.()
		activeStorageInstance = null
	}
}

export function getYouBarStorage(): YouBarPlusStorage {
	if ((activeStorageInstance as any)?.cache) {
		return { ...DEFAULT_STORAGE, ...(activeStorageInstance as any).cache }
	}
	return memoryStorage
}

export function setYouBarStorage(partial: Partial<YouBarPlusStorage>) {
	memoryStorage = { ...memoryStorage, ...partial }
	if (activeStorageInstance) {
		activeStorageInstance.set(partial)
	}
}
