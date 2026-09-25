import type { JsonStorage } from '@revenge-mod/json-storage'
import type { MoreAltsStorage } from '../lib/types'
import { openAccountSwitcherSheet } from '../ui/AccountSwitcherSheet'

export default function patchTabBarLongPress(
	storage: JsonStorage<MoreAltsStorage>,
): () => void {
	const cleanups: Array<() => void> = []
	const React = revenge.react.React

	const patchTabItem = (target: any) => {
		const component = target?.default ?? target
		if (!component) return

		try {
			const unpatch = revenge.patcher.after(
				component,
				typeof component === 'function' ? undefined : ('type' as any),
				(args: any[], res: any) => {
					if (!res || !res.props) return res

					try {
						const isYouTab =
							res.props.accessibilityLabel?.toLowerCase?.().includes('you') ||
							res.props.accessibilityLabel?.toLowerCase?.().includes('profile') ||
							res.props.accessibilityLabel?.toLowerCase?.().includes('account') ||
							res.props.name === 'you' ||
							res.props.route?.name === 'you' ||
							res.props.tab?.id === 'you' ||
							res.props.id === 'you'

						if (isYouTab) {
							const originalLongPress = res.props.onLongPress

							return React.cloneElement(res, {
								onLongPress: (...lpArgs: any[]) => {
									try {
										if (typeof originalLongPress === 'function') {
											originalLongPress(...lpArgs)
										}
									} catch {}

									try {
										openAccountSwitcherSheet(storage)
									} catch (e) {
										console.error('[MoreAlts] Failed to open switcher sheet on long press:', e)
									}
								},
							})
						}
					} catch (e) {
						console.error('[MoreAlts] Tab item clone error:', e)
					}

					return res
				},
			)
			cleanups.push(unpatch)
		} catch (e) {
			console.error('[MoreAlts] Failed to patch tab item:', e)
		}
	}

	// Find tab bar items by name and props
	const tabComponentNames = [
		'TabBarItem',
		'BottomTabBarItem',
		'BottomTabItem',
		'MobileBottomTabItem',
		'TabButton',
		'BottomTabButton',
		'NavigationTabButton',
		'YouTab',
		'UserAccountTab',
	]

	for (const name of tabComponentNames) {
		try {
			const filter = Object.assign(
				(_id: any, exports: any) => {
					const m = exports?.default ?? exports
					return (
						m?.name === name ||
						m?.displayName === name ||
						m?.type?.name === name ||
						m?.type?.displayName === name
					)
				},
				{ key: `typeName(${name})`, scopes: 4 },
			)

			const matches = revenge.modules.finders.lookupModule(filter as any)
			if (matches && matches !== revenge.modules.finders.NotFoundResult && matches[0]) {
				patchTabItem(matches[0])
			}

			const unsub = revenge.modules.finders.getModules(
				filter as any,
				(m) => patchTabItem(m),
				{ returnNamespace: true },
			)
			if (typeof unsub === 'function') cleanups.push(unsub)
		} catch {}
	}

	return () => {
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}
	}
}
