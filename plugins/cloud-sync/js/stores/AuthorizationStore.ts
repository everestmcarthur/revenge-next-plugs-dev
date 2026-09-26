import { findByStoreName } from '../vendetta'
import { RNCacheModule, zustand, zustandMW } from '../stuff/nativeModules'
import { fluxSubscribe } from '../types'

const UserStore = findByStoreName('UserStore')

interface AuthorizationState {
	token: string | undefined
	tokens: Record<string, string | undefined>
	init: () => void
	setToken: (token?: string) => void
	isAuthorized: () => boolean
}

export const useAuthorizationStore = zustand.create<
	AuthorizationState,
	[['zustand/persist', { tokens: AuthorizationState['tokens'] }]]
>(
	zustandMW.persist(
		(set: any, get: any) => ({
			token: undefined,
			tokens: {},
			init() {
				set({
					token: get().tokens[UserStore?.getCurrentUser()?.id],
				})
			},
			setToken(token: string | undefined) {
				set({
					token,
					tokens: {
						...get().tokens,
						[UserStore?.getCurrentUser()?.id]: token,
					},
				})
			},
			isAuthorized: () => !!get().token,
		}),
		{
			name: 'cloudsync-auth',
			storage: zustandMW.createJSONStorage(() => RNCacheModule),
			partialize: ({ tokens }: any) => ({ tokens }),
			onRehydrateStorage: () => (state: any) => state?.init(),
		},
	),
)

export const unsubAuthStore = fluxSubscribe('CONNECTION_OPEN', () =>
	useAuthorizationStore.persist.rehydrate(),
)
