/**
 * Toast helper following kmmiio99o's ToastsAPI specification.
 * https://git.gay/kmmiio99o/revenge-next-plugins/src/branch/main/docs/api.md
 */

export type ToastVariant =
	| 'default'
	| 'success'
	| 'critical'
	| 'warning'
	| 'info'

export interface ToastOptions {
	content: string
	subtitle?: string
	variant?: ToastVariant
	duration?: number
	position?: 'top' | 'bottom'
	icon?: number
	iconSide?: 'left' | 'right'
}

function getRevenge(): any {
	try {
		if (typeof revenge !== 'undefined') return revenge
	} catch {}
	return (globalThis as any).revenge
}

function getToastsApi(): any {
	const rev = getRevenge()
	return (
		rev?.toasts ||
		(globalThis as any).toasts ||
		(globalThis as any).revenge?.toasts ||
		undefined
	)
}

/**
 * Displays a toast using kmmiio's ToastsAPI if available,
 * with automatic fallback to native Android Toast / Discord ToastActionCreators.
 */
export function showToast(
	input: string | ToastOptions,
	variant: ToastVariant = 'default',
): void {
	const options: ToastOptions =
		typeof input === 'string'
			? { content: input, variant }
			: { variant: 'default', ...input }

	try {
		// 1. EverestLib showToast
		const rev = getRevenge()
		if (typeof rev?.everest?.showToast === 'function') {
			rev.everest.showToast(options)
			return
		}

		// 2. kmmiio ToastsAPI (unscoped.toasts / plugin.api.toasts / revenge.toasts)
		const api = getToastsApi()
		if (typeof api?.show === 'function') {
			api.show(options)
			return
		}

		// 2. React Native Native Android Toast (100% reliable native OS notification)
		const rev = getRevenge()
		const RN = rev?.react?.ReactNative || (globalThis as any).ReactNative
		if (RN?.ToastAndroid?.show) {
			const text = options.subtitle
				? `${options.content}\n${options.subtitle}`
				: options.content
			RN.ToastAndroid.show(text, RN.ToastAndroid.SHORT)
			return
		}

		// 3. Discord native ToastActionCreators fallback
		const finders = rev?.modules?.finders
		const filters = finders?.filters
		if (finders?.lookupModule && filters?.withProps) {
			const toastMod = finders.lookupModule(filters.withProps('showToast'))?.[0]
			if (typeof toastMod?.showToast === 'function') {
				toastMod.showToast(options.content)
				return
			}
		}
	} catch (e) {
		console.warn('[ImageStealer] Error showing toast:', e)
	}
}
