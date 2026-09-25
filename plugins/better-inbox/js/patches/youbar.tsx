import { findByImportedPath, waitForImportedPath } from '../../../shared/finders'
import type { JsonStorage } from '@revenge-mod/json-storage'
import type { BetterInboxStorage } from '../lib/types'
import NotificationCenter from '../ui/NotificationCenter'

let updateCallbacks: Array<() => void> = []

export function requestYouBarUpdate() {
	for (const cb of updateCallbacks) {
		try {
			cb()
		} catch {}
	}
}

export function openNotificationCenter() {
	try {
		const everest = (globalThis as any).__everest ?? (revenge as any)?.everest
		const { filters, lookupModule } = revenge.modules.finders

		const Navigation = everest?.getNavigation?.() ?? lookupModule(filters.withProps('push', 'pushLazy', 'pop'))?.[0]
		const Navigator = everest?.getNavigator?.() ?? lookupModule(filters.withProps('Navigator'))?.[0]?.Navigator
		const modalClose = everest?.getModalCloseButton ?? lookupModule(filters.withProps('getHeaderCloseButton', 'getRenderCloseButton'))?.[0]
		const closeBtn = typeof modalClose === 'function'
			? modalClose
			: (modalClose?.getHeaderCloseButton ?? modalClose?.getRenderCloseButton)

		// 1. Primary: Full-Screen Page Navigation
		if (Navigation?.push && Navigator) {
			Navigation.push(() => {
				const { Page } = (revenge.components ?? {}) as any
				const Content = <NotificationCenter hideHeader={true} />

				return (
					<Navigator
						initialRouteName="BetterInbox"
						goBackOnBackPress
						screens={{
							BetterInbox: {
								title: 'Inbox',
								headerLeft: closeBtn ? closeBtn(() => Navigation.pop()) : undefined,
								render: () => Page ? <Page>{Content}</Page> : Content,
							},
						}}
					/>
				)
			})
			return
		}

		// 2. Fallback: BottomSheet popup if navigation stack is unavailable
		const actions = revenge.discord?.actions?.ActionSheetActionCreators
		if (actions?.openLazy) {
			actions.openLazy(
				Promise.resolve({
					default: () => {
						const { ActionSheet, BottomSheetTitleHeader, ActionSheetCloseButton } =
							(revenge.discord?.design?.Design ?? {}) as any
						return (
							<ActionSheet>
								<BottomSheetTitleHeader
									title="BetterInbox"
									trailing={<ActionSheetCloseButton />}
								/>
								<NotificationCenter hideHeader={false} />
							</ActionSheet>
						)
					},
				}),
			)
			return
		}
	} catch (e) {
		console.error('[BetterInbox] Failed to open notification center:', e)
	}
}

// Make openNotificationCenter globally accessible so YouBar+ can trigger it directly if needed
;(globalThis as any).__betterInboxOpen = openNotificationCenter

function transformNotificationElement(el: any): any {
	if (!el) return el
	const React = revenge.react.React

	let InboxIcon: any
	try {
		InboxIcon =
			revenge.assets.getAssetIdByName('ic_notification_24px') ??
			revenge.assets.getAssetIdByName('BellIcon') ??
			revenge.assets.getAssetIdByName('NotificationBellIcon')
	} catch {}

	const targetChild = el.props?.children ?? el
	const origProps = targetChild?.props ?? el?.props ?? {}

	const newProps = {
		...origProps,
		icon: InboxIcon || origProps.icon,
		accessibilityLabel: 'BetterInbox',
		onPress: openNotificationCenter,
	}

	if (el.props?.children && typeof el.props.children === 'object') {
		return React.cloneElement(el, {
			...el.props,
			children: React.cloneElement(el.props.children, newProps),
		})
	}

	return React.cloneElement(el, newProps)
}

function patchButtonTree(node: any, storage: JsonStorage<BetterInboxStorage>): any {
	if (!node) return node
	const React = revenge.react.React

	// Case 1: YouBar+ rendered a View containing array of buttons: [dmButton, notificationsButton, settingsButton]
	if (Array.isArray(node.props?.children)) {
		let modified = false
		const newChildren = node.props.children.map((child: any) => {
			if (!child) return child
			// If this child is YouBar+'s DM button or Settings button, keep it intact!
			if (
				child.key === 'youbar-dm-button' ||
				child.key === 'youbar-settings-button' ||
				child.props?.accessibilityLabel === 'Direct Messages' ||
				child.props?.accessibilityLabel === 'User Settings'
			) {
				return child
			}
			// Notifications button found inside YouBar+'s button row
			modified = true
			return transformNotificationElement(child)
		})
		if (modified) {
			return React.cloneElement(node, { ...node.props }, ...newChildren)
		}
	}

	// Case 2: Standalone YouBar button (YouBar+ not installed or notifications button alone)
	if (
		node.key !== 'youbar-dm-button' &&
		node.key !== 'youbar-settings-button' &&
		node.props?.accessibilityLabel !== 'Direct Messages' &&
		node.props?.accessibilityLabel !== 'User Settings'
	) {
		return transformNotificationElement(node)
	}

	return node
}

function isYouBarNotificationsButton(mod: any): boolean {
	if (!mod) return false
	if ((mod as any).__isYouBarNotificationsButton) return true
	const comp = mod?.YouBarNotificationsButton ?? mod?.default ?? mod
	if ((comp as any)?.__isYouBarNotificationsButton || (comp as any)?.type?.__isYouBarNotificationsButton) return true
	const name =
		comp?.name ||
		comp?.displayName ||
		comp?.type?.name ||
		comp?.type?.displayName ||
		mod?.name ||
		mod?.displayName
	return name === 'YouBarNotificationsButton'
}

export default function patchYouBarButton(
	storage: JsonStorage<BetterInboxStorage>,
): () => void {
	const cleanups: Array<() => void> = []
	const patchedButtonTargets = new WeakSet<object>()

	const unsubStorage = storage.subscribe(() => {
		requestYouBarUpdate()
	})
	cleanups.push(() => unsubStorage?.())

	const applyPatch = (targetModule: any) => {
		const comp =
			targetModule?.YouBarNotificationsButton ??
			targetModule?.default ??
			targetModule

		if (!comp || (typeof comp !== 'function' && typeof comp !== 'object')) return
		if (patchedButtonTargets.has(comp)) return
		patchedButtonTargets.add(comp)

		const isMemo = typeof comp.type === 'function'
		const target = isMemo ? comp : (typeof targetModule?.default === 'function' ? targetModule : comp)
		const prop = isMemo ? 'type' : (typeof targetModule?.default === 'function' ? 'default' : 'type')

		try {
			const unpatch = revenge.patcher.after(
				target,
				prop,
				(res: any) => {
					if (!res) return res
					if (storage.cache?.showYouBarButton === false) {
						return res
					}

					try {
						return patchButtonTree(res, storage)
					} catch (err) {
						console.error('[BetterInbox] Error in button tree transform:', err)
						return res
					}
				},
			)
			cleanups.push(unpatch)
		} catch (e) {
			console.error('[BetterInbox] Failed to patch YouBar button:', e)
		}
	}

	try {
		const imported = findByImportedPath(
			'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx',
		)
		if (imported) applyPatch(imported)

		const unsubPath = waitForImportedPath(
			'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx',
			(m) => {
				if (m) applyPatch(m)
			},
		)
		if (unsubPath) cleanups.push(unsubPath)

		const compFilter = Object.assign(
			(_id: any, m: any) => isYouBarNotificationsButton(m),
			{ key: 'name(YouBarNotificationsButton)', scopes: 4 },
		)

		const matches = revenge.modules.finders.lookupModule(compFilter as any)
		if (matches && matches !== revenge.modules.finders.NotFoundResult && matches[0]) {
			applyPatch(matches[0])
		}

		const unsubFinders = revenge.modules.finders.getModules(
			compFilter as any,
			(m: any) => applyPatch(m),
			{ cached: true, returnNamespace: true },
		)
		if (typeof unsubFinders === 'function') {
			cleanups.push(unsubFinders)
		}
	} catch (e) {
		console.error('[BetterInbox] Error finding YouBarNotificationsButton:', e)
	}

	return () => {
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}
		if ((globalThis as any).__betterInboxOpen === openNotificationCenter) {
			delete (globalThis as any).__betterInboxOpen
		}
	}
}
