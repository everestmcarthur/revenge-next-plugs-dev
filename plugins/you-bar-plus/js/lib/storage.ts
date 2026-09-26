import type { JsonStorage } from '@revenge-mod/json-storage'
import { DEFAULT_STORAGE, type YouBarPlusStorage } from './types'

let activeStorageInstance: JsonStorage<YouBarPlusStorage> | null = null
let memoryStorage: YouBarPlusStorage = { ...DEFAULT_STORAGE }
let initialized = false

export function initStorage(storage: JsonStorage<YouBarPlusStorage>): () => void {
	activeStorageInstance = storage
	if (!initialized) {
		initialized = true
		storage.get().then((val) => {
			if (val) {
				memoryStorage = { ...DEFAULT_STORAGE, ...val }
			}
		})
	}
	const unsub = storage.subscribe((val) => {
		if (val) {
			memoryStorage = { ...DEFAULT_STORAGE, ...val }
		}
	})
	return () => unsub?.()
}

export function getYouBarStorage(): YouBarPlusStorage {
	return memoryStorage
}

export function setYouBarStorage(partial: Partial<YouBarPlusStorage>) {
	memoryStorage = { ...memoryStorage, ...partial }
	if (activeStorageInstance) {
		activeStorageInstance.set(partial)
	}
}
