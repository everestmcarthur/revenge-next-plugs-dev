/**
 * 100% Native Discord Mobile UI Components & ActionSheet Utilities
 */

import React from 'react'

function getRevenge(): any {
	try {
		if (typeof revenge !== 'undefined') return revenge
	} catch {}
	return (globalThis as any).revenge
}

export function findByProps<T = any>(...props: string[]): T | undefined {
	try {
		const rev = getRevenge()
		const filters = rev?.modules?.finders?.filters
		const lookupModule = rev?.modules?.finders?.lookupModule
		if (!lookupModule || !filters) return undefined
		const res = lookupModule(filters.withProps(...props))
		return res ? (res[0] as T) : undefined
	} catch {
		return undefined
	}
}

export function findByImportedPath<T = any>(path: string): T | undefined {
	try {
		const rev = getRevenge()
		const lookup = rev?.modules?.finders?.lookupModuleWithImportedPath
		if (typeof lookup === 'function') {
			const res = lookup(path)
			return res ? (res[0] as T) : undefined
		}
		return undefined
	} catch {
		return undefined
	}
}

function getComponent(prop: string): any {
	try {
		const rev = getRevenge()
		const design = rev?.discord?.design?.Design
		if (design?.[prop]) return design[prop]
	} catch {}
	return findByProps(prop)?.[prop]
}

function createLazyComponent(prop: string, subProp?: string): any {
	const LazyComp: any = React.forwardRef((props: any, ref: any) => {
		let Real = getComponent(prop)
		if (subProp && Real) {
			Real = Real[subProp]
		}
		if (!Real) {
			return null
		}
		return React.createElement(Real, { ref, ...props })
	})
	LazyComp.displayName = `Lazy${prop}${subProp ? `_${subProp}` : ''}`
	return LazyComp
}

export const ActionSheet = createLazyComponent('ActionSheet')
export const BottomSheetTitleHeader = createLazyComponent(
	'BottomSheetTitleHeader',
)
export const ActionSheetCloseButton = createLazyComponent(
	'ActionSheetCloseButton',
)
export const ActionSheetRow = createLazyComponent('ActionSheetRow')
export const TableRow = createLazyComponent('TableRow')
export const TableSwitchRow = createLazyComponent('TableSwitchRow')
export const TableRowGroup = createLazyComponent('TableRowGroup')
export const TableRadioGroup = createLazyComponent('TableRadioGroup')
export const TableRadioRow = createLazyComponent('TableRadioRow')
export const TextInput = createLazyComponent('TextInput')
export const SearchInput = createLazyComponent('SearchInput')
export const Button = createLazyComponent('Button')
export const IconButton = createLazyComponent('IconButton')
export const Stack = createLazyComponent('Stack')
export const FormRow = createLazyComponent('FormRow')

export function getActionSheetActionCreators(): any {
	try {
		const imported = findByImportedPath(
			'modules/action_sheet/native/ActionSheetActionCreators.tsx',
		)
		if (imported?.openLazy || imported?.default?.openLazy) {
			return imported.default?.openLazy ? imported.default : imported
		}
		return findByProps('openLazy', 'hideActionSheet') ?? findByProps('openLazy')
	} catch {
		return undefined
	}
}

export function openLazyActionSheet(
	renderAsync: () => Promise<{ default: React.ComponentType<any> }>,
	key: string,
	data?: any,
): void {
	try {
		const actions = getActionSheetActionCreators()
		if (actions?.openLazy) {
			actions.openLazy(renderAsync(), key, data)
		}
	} catch (e) {
		console.error('[ImageStealer] Error opening lazy action sheet:', e)
	}
}

export function hideActionSheet(key: string): void {
	try {
		const actions = getActionSheetActionCreators()
		if (typeof actions?.hideActionSheet === 'function') {
			actions.hideActionSheet(key)
		}
	} catch (e) {
		console.error('[ImageStealer] Error closing action sheet:', e)
	}
}

export function showToast(message: string): void {
	try {
		const rev = getRevenge()
		if (typeof rev?.toasts?.show === 'function') {
			try {
				rev.toasts.show({ title: message })
				return
			} catch {
				try {
					rev.toasts.show(message)
					return
				} catch {}
			}
		}

		const finders = rev?.modules?.finders
		const filters = finders?.filters
		if (finders?.lookupModule && filters?.withProps) {
			const toastMod = finders.lookupModule(filters.withProps('showToast'))?.[0]
			if (typeof toastMod?.showToast === 'function') {
				toastMod.showToast(message)
				return
			}
			const toastActionMod = finders.lookupModule(
				filters.withProps('open', 'close'),
			)?.[0]
			if (typeof toastActionMod?.open === 'function') {
				toastActionMod.open({ content: message })
				return
			}
		}
	} catch {}
}

export function copyToClipboard(
	text: string,
	label = 'Copied to clipboard!',
): boolean {
	try {
		const rev = getRevenge()
		const bundled = rev?.externals?.ReactNativeClipboard?.Clipboard
		const clipboard =
			bundled ??
			rev?.externals?.ReactNativeClipboard ??
			rev?.react?.ReactNative?.Clipboard
		if (typeof clipboard?.setString === 'function') {
			clipboard.setString(text)
			showToast(label)
			return true
		}
	} catch (e) {
		console.error('[ImageStealer] Error copying to clipboard:', e)
	}
	showToast('Failed to copy to clipboard')
	return false
}

export function getCurrentUserId(): string {
	try {
		const rev = getRevenge()
		const userStore = rev?.everest?.getUserStore?.()
		if (typeof userStore?.getCurrentUser === 'function') {
			const u = userStore.getCurrentUser()
			if (u?.id) return u.id
		}

		const finders = rev?.modules?.finders
		if (finders?.lookupModule && finders?.filters?.withProps) {
			const mods = finders.lookupModule(
				finders.filters.withProps('getCurrentUser'),
			)
			if (mods) {
				for (let i = 0; i < mods.length; i++) {
					try {
						const u = mods[i]?.getCurrentUser?.()
						if (u?.id) return u.id
					} catch {}
				}
			}
		}

		const fallback = findByProps('getCurrentUser')
		return fallback?.getCurrentUser?.()?.id || ''
	} catch {
		return ''
	}
}

export function useSegmentedControlState({
	items,
	initialSelectedId,
}: {
	items: Array<{ id: string; label: string; page: React.ReactNode }>
	initialSelectedId?: string
}) {
	const [selectedId, setSelectedId] = React.useState(
		initialSelectedId || items[0]?.id || '',
	)
	const activeItem = items.find(item => item.id === selectedId) || items[0]
	return {
		selectedId,
		setSelectedId,
		activePage: activeItem?.page,
		items,
	}
}
