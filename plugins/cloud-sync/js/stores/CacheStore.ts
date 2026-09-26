import { findByStoreName } from '../vendetta'
import { RNCacheModule, zustand, zustandMW } from '../stuff/nativeModules'
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

interface CacheState {
	data: UserData | undefined
	at: string | undefined
	dir: Record<string, { data: UserData; at: string }>
	init: () => void
	updateData: (data?: UserData, at?: string) => void
	hasData: () => boolean
}

export const useCacheStore = zustand.create<
	CacheState,
	[['zustand/persist', { dir: CacheState['dir'] }]]
>(
	zustandMW.persist(
		(set: any, get: any) => ({
			data: undefined,
			at: undefined,
			dir: {},
			init() {
				const { data, at } = get().dir[UserStore?.getCurrentUser()?.id] ?? {}
				set({ data, at })
			},
			updateData(data: UserData | undefined, at: string | undefined) {
				set({
					data,
					at,
					dir: {
						...get().dir,
						[UserStore?.getCurrentUser()?.id]: { data, at },
					},
				})
			},
			hasData: () => !!get().data && !!get().at,
		}),
		{
			name: 'cloudsync-cache',
			storage: zustandMW.createJSONStorage(() => RNCacheModule),
			partialize: ({ dir }: any) => ({ dir }),
			onRehydrateStorage: () => (state: any) => state?.init(),
		},
	),
)

export const unsubCacheStore = fluxSubscribe('CONNECTION_OPEN', () => {
	useCacheStore.persist.rehydrate()
})
