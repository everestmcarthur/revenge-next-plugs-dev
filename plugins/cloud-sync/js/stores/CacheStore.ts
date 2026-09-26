import { findByStoreName, React } from '../vendetta'
import { vstorage } from '../index'
import { fluxSubscribe } from '../types'

const UserStore = findByStoreName('UserStore')

export interface UserData {
	plugins: Record<
		string,
		{
			enabled: boolean
			storage?: string
		}
	>
	themes: Record<
		string,
		{
			enabled: boolean
		}
	>
	fonts: {
		installed: Record<
			string,
			{
				enabled: boolean
			}
		>
		custom: any[]
	}
}

export interface CacheState {
	data: UserData | undefined
	at: string | undefined
	dir: Record<string, { data: UserData; at: string }>
	init: () => void
	updateData: (data?: UserData, at?: string) => void
	hasData: () => boolean
}

const listeners = new Set<() => void>()

function getDir(): Record<string, { data: UserData; at: string }> {
	if (!vstorage) return {}
	;(vstorage as any).cacheDir ??= {}
	return (vstorage as any).cacheDir
}

function getCurrentUserId(): string {
	return UserStore?.getCurrentUser()?.id ?? ''
}

const currentState: CacheState = {
	data: undefined,
	at: undefined,
	dir: {},
	init() {
		const userId = getCurrentUserId()
		const dir = getDir()
		currentState.dir = dir
		if (userId && dir[userId]) {
			currentState.data = dir[userId].data
			currentState.at = dir[userId].at
		} else {
			currentState.data = undefined
			currentState.at = undefined
		}
		listeners.forEach((l) => l())
	},
	updateData(data?: UserData, at?: string) {
		const userId = getCurrentUserId()
		const dir = getDir()
		if (userId) {
			if (data && at) {
				dir[userId] = { data, at }
			} else {
				delete dir[userId]
			}
		}
		currentState.dir = { ...dir }
		currentState.data = data
		currentState.at = at
		listeners.forEach((l) => l())
	},
	hasData: () => !!currentState.data && !!currentState.at,
}

export function useCacheStore(): CacheState {
	const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)
	React.useEffect(() => {
		listeners.add(forceUpdate)
		return () => {
			listeners.delete(forceUpdate)
		}
	}, [])
	return currentState
}

useCacheStore.getState = () => {
	if (!currentState.data && getCurrentUserId()) {
		const dir = getDir()
		const item = dir[getCurrentUserId()]
		if (item) {
			currentState.data = item.data
			currentState.at = item.at
		}
		currentState.dir = dir
	}
	return currentState
}

useCacheStore.subscribe = (listener: () => void) => {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

useCacheStore.persist = {
	rehydrate: () => currentState.init(),
}

export const unsubCacheStore = fluxSubscribe('CONNECTION_OPEN', () => {
	currentState.init()
})
