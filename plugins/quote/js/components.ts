/**
 * 100% Native Discord Mobile UI Components
 *
 * Sourced directly from decompiled Discord sources in decord (alpha / data branch):
 * https://github.com/everestmcarthur/decord/tree/data/alpha
 *
 * Dynamically and lazily resolved to avoid evaluating before Metro initializes them.
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
		if (!Real) return null

		if (prop === 'TextInput') {
			const { onChange, onChangeText, value, ...rest } = props
			const handleChange = (eOrText: any) => {
				const text =
					typeof eOrText === 'string'
						? eOrText
						: (eOrText?.nativeEvent?.text ?? eOrText?.text ?? '')
				if (typeof onChange === 'function') onChange(text)
				if (typeof onChangeText === 'function') onChangeText(text)
			}
			return React.createElement(Real, {
				...rest,
				ref,
				value: value ?? '',
				onChange: handleChange,
				onChangeText: handleChange,
			})
		}

		return React.createElement(Real, { ...props, ref })
	})
	LazyComp.displayName = `Lazy${prop}${subProp ? `_${subProp}` : ''}`
	return new Proxy(LazyComp, {
		get(target: any, p: string | symbol) {
			if (typeof p === 'string' && target[p] !== undefined) {
				return target[p]
			}
			try {
				let Real = getComponent(prop)
				if (subProp && Real) Real = Real[subProp]
				if (Real && p in Real) {
					return Real[p]
				}
			} catch {}
			return target[p]
		},
	})
}

/**
 * ActionSheet
 */
export const ActionSheet: any = createLazyComponent('ActionSheet')

/**
 * BottomSheetTitleHeader
 */
export const BottomSheetTitleHeader: any = createLazyComponent(
	'BottomSheetTitleHeader',
)

/**
 * ActionSheetCloseButton
 */
export const ActionSheetCloseButton: any = createLazyComponent(
	'ActionSheetCloseButton',
)

/**
 * ActionSheetRow
 */
export const ActionSheetRow: any = createLazyComponent('ActionSheetRow')

/**
 * ActionSheetActionCreators (openLazy, hideActionSheet)
 */
export function getActionSheetActionCreators(): any {
	const rev = getRevenge()
	return (
		rev?.discord?.actions?.ActionSheetActionCreators ??
		findByProps('openLazy', 'hideActionSheet') ??
		findByProps('showActionSheet')
	)
}

export function openLazyActionSheet(
	render: () => any,
	key: string,
	props: Record<string, any> = {},
): void {
	const actions = getActionSheetActionCreators()
	if (actions?.openLazy) {
		actions.openLazy(
			Promise.resolve({
				default: render,
			}),
			key,
			props,
		)
	} else if (actions?.showActionSheet) {
		actions.showActionSheet({
			key,
			content: render(),
		})
	}
}

export function hideActionSheet(key?: string): void {
	const actions = getActionSheetActionCreators()
	if (actions?.hideActionSheet) {
		try {
			actions.hideActionSheet(key)
		} catch {
			actions.hideActionSheet()
		}
	}
}

/**
 * TableRow
 */
export const TableRow: any = createLazyComponent('TableRow')
export const TableRowIcon: any = createLazyComponent('TableRow', 'Icon')
export const TableRowArrow: any = createLazyComponent('TableRow', 'Arrow')
export const TableRowTrailingText: any = createLazyComponent(
	'TableRow',
	'TrailingText',
)

/**
 * TableRowGroup
 */
export const TableRowGroup: any = createLazyComponent('TableRowGroup')

/**
 * TableSwitchRow
 */
export const TableSwitchRow: any = createLazyComponent('TableSwitchRow')

/**
 * TableRadioGroup
 */
export const TableRadioGroup: any = createLazyComponent('TableRadioGroup')

/**
 * TableRadioRow
 */
export const TableRadioRow: any = createLazyComponent('TableRadioRow')

/**
 * TableCheckboxRow
 */
export const TableCheckboxRow: any = createLazyComponent('TableCheckboxRow')

/**
 * Button
 */
export const Button: any = createLazyComponent('Button')

/**
 * TextInput
 */
export const TextInput: any = createLazyComponent('TextInput')
