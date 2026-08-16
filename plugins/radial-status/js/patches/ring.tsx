import { Dispatcher } from '@revenge-mod/discord/common/flux'
import { Stores } from '@revenge-mod/discord/flux'
import { guard } from '../lib/safe'
import type { JsonStorage } from '@revenge-mod/json-storage'
import type { RadialStatusStorage } from '../lib/types'

function isNativeAvailable(): boolean {
	try {
		return typeof revenge?.modules?.native?.callNativeMethod === 'function'
	} catch {
		return false
	}
}

function hexToArgbDecimalString(hex: string): string {
	const clean = hex.replace('#', '')
	const rgb = Number.parseInt(clean, 16)
	return ((0xff000000 | rgb) >>> 0).toString()
}

function configureNative(storage: JsonStorage<RadialStatusStorage>) {
	const cache = storage.cache
	const colorEntries: [string, string][] = Object.entries(cache?.colors ?? {})
	const colors = Object.fromEntries(
		colorEntries.map(([status, hex]) => [status, hexToArgbDecimalString(hex)]),
	)
	revenge.modules.native
		.callNativeMethod('radialstatus.configure', [!!cache?.enabled, cache?.ringThickness ?? 2, colors])
		.catch(() => {})
}

function pushPresence(userId: string, status: string) {
	revenge.modules.native.callNativeMethod('radialstatus.setPresence', [userId, status]).catch(() => {})
}

function pushKnownPresences() {
	guard(() => {
		const PresenceStore = (Stores as Record<string, any>).PresenceStore
		const UserStore = (Stores as Record<string, any>).UserStore
		const users = UserStore?.getUsers?.()
		if (!users) {
			console.log('[RadialStatus] UserStore.getUsers() unavailable')
			return
		}
		let pushed = 0
		for (const id of Object.keys(users)) {
			const status = PresenceStore?.getStatus?.(id)
			if (status) {
				pushPresence(id, status)
				pushed++
			}
		}
		console.log(`[RadialStatus] pushed ${pushed} known presence(s)`)
	}, undefined)
}

export default function patchRing(storage: JsonStorage<RadialStatusStorage>) {
	console.log('[RadialStatus] native available:', isNativeAvailable())
	if (!isNativeAvailable()) return () => {}

	configureNative(storage)
	pushKnownPresences()

	const onPresenceUpdate = (event: any) => {
		guard(() => {
			const updates = Array.isArray(event?.updates) ? event.updates : [event]
			for (const update of updates) {
				const userId = update?.user?.id ?? update?.userId
				const status = update?.status
				if (userId && status) pushPresence(userId, status)
			}
		}, undefined)
	}

	Dispatcher.subscribe('PRESENCE_UPDATES', onPresenceUpdate)
	const unsubStorage = storage.subscribe(() => configureNative(storage))

	return () => {
		Dispatcher.unsubscribe('PRESENCE_UPDATES', onPresenceUpdate)
		unsubStorage?.()
	}
}
