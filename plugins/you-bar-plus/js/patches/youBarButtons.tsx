import type { JsonStorage } from '@revenge-mod/json-storage'
import { saveCachedModuleId, type YouBarPlusStorage } from '../lib/types'

let updateCallbacks: Array<() => void> = []

export function requestYouBarUpdate() {
	for (const cb of updateCallbacks) {
		try {
			cb()
		} catch {}
	}
}

let cachedTransitionRouter: any = null
let cachedUserSettingsRouter: any = null

function isYouBarNotificationsButton(mod: any): boolean {
	if (!mod) return false
	const comp = mod?.YouBarNotificationsButton ?? mod?.default ?? mod
	const name =
		comp?.name ||
		comp?.displayName ||
		comp?.type?.name ||
		comp?.type?.displayName ||
		mod?.name ||
		mod?.displayName
	return name === 'YouBarNotificationsButton'
}

function getTransitionRouter(storage?: JsonStorage<YouBarPlusStorage>) {
	if (typeof cachedTransitionRouter?.transitionToGuild === 'function') {
		return cachedTransitionRouter
	}

	const everest = (globalThis as any).__everest ?? (revenge as any)?.everest
	if (typeof everest?.transitionToGuild === 'function') {
		cachedTransitionRouter = everest
		return everest
	}

	if (typeof (globalThis as any).__r === 'function') {
		const cachedId = storage?.cache?.moduleCache?.transitionRouterId
		if (typeof cachedId === 'number') {
			try {
				const mod = (globalThis as any).__r(cachedId)
				const target = mod?.default ?? mod
				if (typeof target?.transitionToGuild === 'function') {
					cachedTransitionRouter = target
					return target
				}
			} catch {}
		}
	}

	try {
		const { filters, lookupModule } = revenge.modules.finders
		const res = lookupModule(filters.withProps('transitionToGuild'))
		if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
			const mod = res[0]?.default ?? res[0]
			if (typeof mod?.transitionToGuild === 'function') {
				cachedTransitionRouter = mod
				if (typeof res[1] === 'number' && storage) {
					saveCachedModuleId(storage, 'transitionRouterId', res[1])
				}
				return mod
			}
		}
	} catch {}

	return undefined
}

function getUserSettingsRouter(storage?: JsonStorage<YouBarPlusStorage>) {
	if (typeof cachedUserSettingsRouter?.openUserSettings === 'function') {
		return cachedUserSettingsRouter
	}

	const everest = (globalThis as any).__everest ?? (revenge as any)?.everest
	if (typeof everest?.openUserSettings === 'function') {
		cachedUserSettingsRouter = everest
		return everest
	}

	if (typeof (globalThis as any).__r === 'function') {
		const cachedId = storage?.cache?.moduleCache?.userSettingsId
		if (typeof cachedId === 'number') {
			try {
				const mod = (globalThis as any).__r(cachedId)
				const target = mod?.default ?? mod
				if (
					typeof target?.openUserSettings === 'function' &&
					!target.$$baseObject &&
					!target.$$loader
				) {
					cachedUserSettingsRouter = target
					return target
				}
			} catch {}
		}
	}

	try {
		const { filters, lookupModule } = revenge.modules.finders
		const f = filters.createFilterGenerator(
			(_a, _id, exp) => {
				const t = exp?.default ?? exp
				if (!t || typeof t !== 'object') return false
				if (t.$$baseObject || t.$$loader || t.messages || t.defaultLocale) return false
				return typeof t.openUserSettings === 'function'
			},
			() => 'userSettingsAction',
			filters.FilterScopes.All,
		)()
		const res = lookupModule(f)
		if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
			const t = res[0]?.default ?? res[0]
			if (typeof t?.openUserSettings === 'function') {
				cachedUserSettingsRouter = t
				if (typeof res[1] === 'number' && storage) {
					saveCachedModuleId(storage, 'userSettingsId', res[1])
				}
				return t
			}
		}
	} catch {}

	return undefined
}

export default function patchYouBarButtons(
	storage: JsonStorage<YouBarPlusStorage>,
): () => void {
	const cleanups: Array<() => void> = []
	const patchedButtonTargets = new WeakSet<object>()
	const React = revenge.react.React

	const unsubStorage = storage.subscribe(() => {
		requestYouBarUpdate()
	})
	cleanups.push(() => unsubStorage?.())

	const applyPatch = (targetModule: any, id?: number) => {
		const component =
			targetModule?.YouBarNotificationsButton ??
			targetModule?.default ??
			targetModule

		if (!component || (typeof component !== 'function' && typeof component !== 'object')) return
		if (patchedButtonTargets.has(component)) return
		patchedButtonTargets.add(component)

		if (typeof id === 'number') {
			saveCachedModuleId(storage, 'youBarButtonId', id)
		}

		const unpatch = revenge.patcher.instead(
			component,
			'type',
			(args: any[], OriginalRender: any) => {
				const [, forceUpdate] = React.useReducer(
					(x: number) => x + 1,
					0,
				)

				React.useEffect(() => {
					updateCallbacks.push(forceUpdate)
					return () => {
						updateCallbacks = updateCallbacks.filter(
							(cb) => cb !== forceUpdate,
						)
					}
				}, [])

				const res = OriginalRender(...args)
				if (!res) return res

				const currentStorage: YouBarPlusStorage = {
					showDMButton: true,
					showSettingsButton: true,
					showNotificationsButton: true,
					order: ['dms', 'notifications', 'settings'],
					...(storage.cache ?? {}),
				}

				const targetElement = res.props?.children ?? res
				const IconButton =
					(typeof targetElement?.type === 'function' || typeof targetElement?.type === 'object')
						? targetElement.type
						: (revenge.discord?.design?.Design?.IconButton ?? targetElement?.type)
				const originalProps = targetElement?.props ?? res?.props ?? {}

				let SettingsIcon: any
				let ChatIcon: any
				try {
					SettingsIcon =
						revenge.assets.getAssetIdByName('SettingsIcon') ??
						revenge.assets.getAssetIdByName('ic_settings')
					ChatIcon =
						revenge.assets.getAssetIdByName('ChatIcon') ??
						revenge.assets.getAssetIdByName('ic_chat')
				} catch {}

				if (!IconButton) return res

				const dmButton =
					currentStorage.showDMButton !== false
						? React.createElement(IconButton, {
								key: 'youbar-dm-button',
								variant: originalProps.variant || 'tertiary',
								size: originalProps.size || 'sm',
								icon: ChatIcon,
								accessibilityLabel: 'Direct Messages',
								onPress: () => {
									try {
										const router = getTransitionRouter(storage)
										router?.transitionToGuild?.('@me')
									} catch (e) {
										console.error('[YouBar+] DM button error:', e)
									}
								},
						  })
						: null

				const settingsButton =
					currentStorage.showSettingsButton !== false
						? React.createElement(IconButton, {
								key: 'youbar-settings-button',
								variant: originalProps.variant || 'tertiary',
								size: originalProps.size || 'sm',
								icon: SettingsIcon,
								accessibilityLabel: 'User Settings',
								onPress: () => {
									try {
										const router = getUserSettingsRouter(storage)
										router?.openUserSettings?.()
									} catch (e) {
										console.error('[YouBar+] Settings button error:', e)
									}
								},
						  })
						: null

				const notificationsButton =
					currentStorage.showNotificationsButton !== false ? res : null

				const order =
					Array.isArray(currentStorage.order) &&
					currentStorage.order.length === 3
						? currentStorage.order
						: (['dms', 'notifications', 'settings'] as const)

				const buttonMap: Record<string, any> = {
					dms: dmButton,
					notifications: notificationsButton,
					settings: settingsButton,
				}

				const renderedButtons = order
					.map((id) => buttonMap[id])
					.filter(Boolean)

				if (renderedButtons.length === 0) return null

				const RN = revenge.react.ReactNative

				return React.createElement(
					RN?.View ?? React.Fragment,
					RN?.View
						? {
								style: {
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'flex-end',
									gap: 4,
								},
						  }
						: null,
					...renderedButtons,
				)
			},
		)

		cleanups.push(unpatch)
	}

	const checkFastCache = (cache?: YouBarPlusStorage['moduleCache']) => {
		if (typeof (globalThis as any).__r !== 'function') return
		const req = (globalThis as any).__r
		const cachedId = cache?.youBarButtonId ?? storage.cache?.moduleCache?.youBarButtonId
		const candidates = new Set<number>([
			...(typeof cachedId === 'number' ? [cachedId] : []),
			16476,
			16427,
		])
		for (const id of candidates) {
			try {
				const mod = req(id)
				if (isYouBarNotificationsButton(mod)) {
					applyPatch(mod, id)
				}
			} catch {}
		}

		if (patchedButtonTargets.size === 0) {
			for (let id = 16400; id <= 16550; id++) {
				try {
					const mod = req(id)
					if (isYouBarNotificationsButton(mod)) {
						applyPatch(mod, id)
						break
					}
				} catch {}
			}
		}
	}

	checkFastCache()

	storage
		.get()
		.then((data) => {
			checkFastCache(data?.moduleCache)
		})
		.catch(() => {})

	try {
		const filter = revenge.modules.finders.filters.createFilterGenerator(
			([name]: [string], exports: any) => {
				const def = exports?.default
				return (
					exports?.name === name ||
					exports?.displayName === name ||
					exports?.type?.name === name ||
					exports?.type?.displayName === name ||
					def?.name === name ||
					def?.displayName === name ||
					def?.type?.name === name ||
					def?.type?.displayName === name
				)
			},
			([name]: [string]) => `componentName(${name})`,
			revenge.modules.finders.filters.FilterScopes.All,
		)('YouBarNotificationsButton')

		const res = revenge.modules.finders.lookupModule(filter)
		if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
			applyPatch(res[0], res[1] as number | undefined)
		}

		const unsub = revenge.modules.finders.getModules(
			filter,
			(mod, id) => {
				applyPatch(mod, id as number | undefined)
			},
			{ cached: true, returnNamespace: true },
		)
		cleanups.push(() => unsub?.())
	} catch (e) {
		console.error('[YouBar+] Error finding YouBarNotificationsButton:', e)
	}

	return () => {
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}
	}
}
