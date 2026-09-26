import { findByStoreName, React } from '../vendetta'
import { vstorage } from '../index'
import { fluxSubscribe } from '../types'

const UserStore = findByStoreName('UserStore')

export interface AuthorizationState {
	token: string | undefined
	tokens: Record<string, string | undefined>
	init: () => void
	setToken: (token?: string) => void
	isAuthorized: () => boolean
}

const listeners = new Set<() => void>()

function getTokens(): Record<string, string | undefined> {
	if (!vstorage) return {}
	;(vstorage as any).tokens ??= {}
	return (vstorage as any).tokens
}

function getCurrentUserId(): string {
	return UserStore?.getCurrentUser()?.id ?? ''
}

const currentState: AuthorizationState = {
	token: undefined,
	tokens: {},
	init() {
		const userId = getCurrentUserId()
		const tokens = getTokens()
		currentState.tokens = tokens
		currentState.token = userId ? tokens[userId] : undefined
		listeners.forEach((l) => l())
	},
	setToken(token: string | undefined) {
		const userId = getCurrentUserId()
		const tokens = getTokens()
		if (userId) {
			if (token) {
				tokens[userId] = token
			} else {
				delete tokens[userId]
			}
		}
		currentState.tokens = { ...tokens }
		currentState.token = token
		listeners.forEach((l) => l())
	},
	isAuthorized: () => !!currentState.token,
}

export function useAuthorizationStore(): AuthorizationState {
	const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)
	React.useEffect(() => {
		listeners.add(forceUpdate)
		return () => {
			listeners.delete(forceUpdate)
		}
	}, [])
	return currentState
}

useAuthorizationStore.getState = () => {
	if (!currentState.token && getCurrentUserId()) {
		const tokens = getTokens()
		currentState.token = tokens[getCurrentUserId()]
		currentState.tokens = tokens
	}
	return currentState
}

useAuthorizationStore.subscribe = (listener: () => void) => {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

useAuthorizationStore.persist = {
	rehydrate: () => currentState.init(),
}

export const unsubAuthStore = fluxSubscribe('CONNECTION_OPEN', () => {
	currentState.init()
})
