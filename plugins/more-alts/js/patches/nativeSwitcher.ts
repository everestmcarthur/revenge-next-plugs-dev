import type { JsonStorage } from '@revenge-mod/json-storage'
import type { MoreAltsStorage } from '../lib/types'

export default function patchNativeSwitcher(
	storage: JsonStorage<MoreAltsStorage>,
): () => void {
	const cleanups: Array<() => void> = []

	try {
		const { filters, lookupModule, getModules } = revenge.modules.finders
		const filter = filters.withProps('getCanUseMultiAccountMobile')

		const applyHook = (mod: any) => {
			if (typeof mod?.getCanUseMultiAccountMobile === 'function') {
				try {
					const unpatch = revenge.patcher.after(
						mod,
						'getCanUseMultiAccountMobile',
						() => {
							if (storage.cache?.enableNativeSwitcher !== false) {
								return true
							}
						},
					)
					cleanups.push(unpatch)
				} catch (e) {
					console.error('[MoreAlts] Failed to patch getCanUseMultiAccountMobile:', e)
				}
			}
		}

		const matches = lookupModule(filter)
		for (const m of matches || []) applyHook(m)

		const unsub = getModules(filter, (m) => applyHook(m), { returnNamespace: true })
		cleanups.push(() => unsub?.())

		// MultiAccountStore overrides
		const MultiAccountStore = (revenge.discord.flux.Stores as any)?.MultiAccountStore
		if (MultiAccountStore) {
			try {
				const unpatchCanUse = revenge.patcher.instead(
					MultiAccountStore,
					'getCanUseMultiAccountMobile',
					() => storage.cache?.enableNativeSwitcher !== false,
				)
				cleanups.push(unpatchCanUse)
			} catch {}

			try {
				const proto = Object.getPrototypeOf(MultiAccountStore)
				if (proto && typeof proto.getCanUseMultiAccountMobile === 'function') {
					const unpatchProto = revenge.patcher.instead(
						proto,
						'getCanUseMultiAccountMobile',
						() => storage.cache?.enableNativeSwitcher !== false,
					)
					cleanups.push(unpatchProto)
				}
			} catch {}

			try {
				const unpatchHasLogged = revenge.patcher.instead(
					MultiAccountStore,
					'getHasLoggedInAccounts',
					() => {
						if (storage.cache?.enableNativeSwitcher !== false) {
							return true
						}
					},
				)
				cleanups.push(unpatchHasLogged)
			} catch {}

			try {
				Object.defineProperty(MultiAccountStore, 'canUseMultiAccountNotifications', {
					get: () => storage.cache?.enableNativeSwitcher !== false,
					configurable: true,
				})
				cleanups.push(() => {
					try {
						delete (MultiAccountStore as any).canUseMultiAccountNotifications
					} catch {}
				})
			} catch (e) {
				console.error('[MoreAlts] Failed to override canUseMultiAccountNotifications:', e)
			}

			try {
				MultiAccountStore.emitChange?.()
			} catch {}
		}
	} catch (e) {
		console.error('[MoreAlts] patchNativeSwitcher error:', e)
	}

	return () => {
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}
	}
}
