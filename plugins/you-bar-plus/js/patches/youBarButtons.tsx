import type { JsonStorage } from '@revenge-mod/json-storage'
import type { YouBarPlusStorage } from '../lib/types'

let updateCallbacks: Array<() => void> = []

export function requestYouBarUpdate() {
	for (const cb of updateCallbacks) {
		try {
			cb()
		} catch {}
	}
}

function getTransitionRouter() {
	const everest = (globalThis as any).__everest ?? (revenge as any)?.everest
	if (typeof everest?.transitionToGuild === 'function') {
		return everest
	}

	try {
		const { filters, lookupModule } = revenge.modules.finders
		return lookupModule(filters.withProps('transitionToGuild'))?.[0]
	} catch {}

	return undefined
}

function getUserSettingsRouter() {
	const everest = (globalThis as any).__everest ?? (revenge as any)?.everest
	if (typeof everest?.openUserSettings === 'function') {
		return everest
	}

	if (typeof (globalThis as any).__r === 'function') {
		try {
			const direct = (globalThis as any).__r(6213)
			const t = direct?.default ?? direct
			if (
				typeof t?.openUserSettings === 'function' &&
				!t.$$baseObject &&
				!t.$$loader
			) {
				return t
			}
		} catch {}
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
		const matches = lookupModule(f)
		for (const m of matches || []) {
			const t = m?.default ?? m
			if (typeof t?.openUserSettings === 'function') return t
		}
	} catch {}

	return undefined
}

export default function patchYouBarButtons(
	storage: JsonStorage<YouBarPlusStorage>,
): () => void {
	const cleanups: Array<() => void> = []
	const React = revenge.react.React

	const unsubStorage = storage.subscribe(() => {
		requestYouBarUpdate()
	})
	cleanups.push(() => unsubStorage?.())

	const applyPatch = (targetModule: any) => {
		const component =
			targetModule?.YouBarNotificationsButton ??
			targetModule?.default ??
			targetModule

		if (!component) return

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
					revenge.discord?.design?.Design?.IconButton ??
					targetElement?.type
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
										const router = getTransitionRouter()
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
										const router = getUserSettingsRouter()
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

				return React.createElement(
					React.Fragment,
					null,
					...renderedButtons,
				)
			},
		)

		cleanups.push(unpatch)
	}

	// Lookup YouBarNotificationsButton using finders across all scopes
	try {
		const filter = revenge.modules.finders.filters.createFilterGenerator(
			([name]: [string], _id: any, exports: any) =>
				exports?.name === name ||
				exports?.displayName === name ||
				exports?.default?.name === name ||
				exports?.default?.displayName === name ||
				exports?.default?.type?.name === name ||
				exports?.default?.type?.displayName === name,
			([name]: [string]) => `typeName(${name})`,
			revenge.modules.finders.filters.FilterScopes.All,
		)('YouBarNotificationsButton')

		const matches = revenge.modules.finders.lookupModule(filter)
		if (matches && matches.length > 0) {
			for (const m of matches) {
				applyPatch(m)
			}
		}

		const unsub = revenge.modules.finders.getModules(
			filter,
			(mod) => {
				applyPatch(mod)
			},
			{ returnNamespace: true },
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
