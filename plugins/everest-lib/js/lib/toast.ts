export interface ToastOptions {
	content: string
	key?: string
	icon?: any
	duration?: number
}

export function showToast(options: string | ToastOptions): void {
	const content = typeof options === 'string' ? options : options.content
	const key =
		typeof options === 'string'
			? `toast-${Date.now()}`
			: options.key ?? `toast-${Date.now()}`
	const icon = typeof options === 'object' ? options.icon : undefined

	try {
		const creators = (revenge as any).discord?.actions?.ToastActionCreators
		if (creators && typeof creators.open === 'function') {
			creators.open({ key, content, icon })
			return
		}
	} catch {}

	try {
		const toastUtil = (revenge as any).utils?.toast
		if (toastUtil && typeof toastUtil.show === 'function') {
			toastUtil.show(content)
			return
		}
	} catch {}

	try {
		const toastAndroid = (revenge as any).react?.ReactNative?.ToastAndroid
		if (toastAndroid && typeof toastAndroid.show === 'function') {
			toastAndroid.show(content, toastAndroid.SHORT ?? 0)
			return
		}
	} catch {}

	console.log(`[EverestLib Toast] ${content}`)
}
