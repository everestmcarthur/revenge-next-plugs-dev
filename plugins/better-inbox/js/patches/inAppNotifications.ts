import type { JsonStorage } from '@revenge-mod/json-storage'
import type { BetterInboxStorage } from '../lib/types'

export default function patchInAppNotifications(
	storage: JsonStorage<BetterInboxStorage>,
): () => void {
	const cleanups: Array<() => void> = []

	try {
		const { filters, lookupModule, getModules } = revenge.modules.finders
		const patchedTargets = new WeakSet<object>()

		const patchNotificationManager = (mod: any) => {
			const target = mod?.default ?? mod
			if (!target || typeof target !== 'object' || patchedTargets.has(target)) return
			patchedTargets.add(target)

			if (typeof target.showNotification === 'function') {
				try {
					const unpatchShow = revenge.patcher.instead(
						target,
						'showNotification',
						(args: any[], orig: any) => {
							if (storage.cache?.blockSystemNotifications) {
								return
							}
							return orig(...args)
						},
					)
					cleanups.push(unpatchShow)
				} catch (e) {
					console.error('[BetterInbox] Failed to patch showNotification:', e)
				}
			}

			if (typeof target.playNotificationSound === 'function') {
				try {
					const unpatchSound = revenge.patcher.instead(
						target,
						'playNotificationSound',
						(args: any[], orig: any) => {
							if (storage.cache?.blockSystemNotifications) {
								return
							}
							return orig(...args)
						},
					)
					cleanups.push(unpatchSound)
				} catch (e) {
					console.error('[BetterInbox] Failed to patch playNotificationSound:', e)
				}
			}
		}

		const notifFilter = filters.withProps('showNotification')
		const res = lookupModule(notifFilter)
		if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
			patchNotificationManager(res[0])
		}

		try {
			const unsub = getModules(notifFilter, (m) => patchNotificationManager(m), {
				cached: true,
				returnNamespace: true,
			})
			if (typeof unsub === 'function') {
				cleanups.push(unsub)
			}
		} catch {}
	} catch (e) {
		console.error('[BetterInbox] Error patching in-app notifications:', e)
	}

	return () => {
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}
	}
}
