export function getEverest(): any {
	return (globalThis as any).__everest
}

export function getClientUtils(): any {
	return (revenge as any)?.plugins?.clientUtils ?? (globalThis as any).__c_utils
}

export function getReact(): any {
	return (revenge as any)?.react?.React
}

export function getReactNative(): any {
	return (revenge as any)?.react?.ReactNative
}

export function getDispatcher(): any {
	try {
		const raw = (globalThis as any).__r?.(573)
		const mod = raw?.default || raw
		if (mod?.dispatch) return mod
	} catch {}
	return (revenge as any)?.discord?.flux?.Dispatcher || getModule(revenge.modules.finders.filters.withProps('dispatch', 'subscribe'))
}

export function copyToClipboard(str: string): void {
	try {
		const rn = getReactNative()
		if (rn?.Clipboard?.setString) {
			rn.Clipboard.setString(str)
			return
		}
		const clip = getModule(revenge.modules.finders.filters.withProps('setString', 'getString'))
		if (clip?.setString) {
			clip.setString(str)
			return
		}
	} catch {}
}

export function showToast(message: string, icon?: string): void {
	try {
		const rn = getReactNative()
		if (rn?.ToastAndroid?.show) {
			rn.ToastAndroid.show(message, rn.ToastAndroid.SHORT)
			return
		}
		const everest = getEverest()
		if (everest?.showToast) {
			everest.showToast(message, icon)
			return
		}
		const toasts = getModule(revenge.modules.finders.filters.withProps('showToast'))
		if (toasts?.showToast) {
			toasts.showToast(message)
			return
		}
	} catch {}
}

export function getFinders() {
	return revenge.modules.finders
}

export function getFilters() {
	return revenge.modules.finders.filters
}

export function getModule(filter: any): any {
	try {
		const res = revenge.modules.finders.lookupModule(filter, { initialize: true })
		if (Array.isArray(res)) return res[0]
		return res
	} catch {
		return null
	}
}

export function getModuleExport(filter: any): { exports: any; modId: number | null } {
	try {
		const res = revenge.modules.finders.lookupModule(filter, { initialize: true })
		if (Array.isArray(res) && res[1] != null) {
			const exp = revenge.modules.metro.getInitializedModuleExports(res[1])
			return { exports: exp ?? res[0], modId: res[1] }
		}
		return { exports: res, modId: null }
	} catch {
		return { exports: null, modId: null }
	}
}

export function getActionSheetRow(): any {
	try {
		const mod = getModule(revenge.modules.finders.filters.withProps('ActionSheetRow'))
		return mod?.ActionSheetRow
	} catch {
		return null
	}
}

export function getLazyActionSheet(): any {
	try {
		return getModule(revenge.modules.finders.filters.withProps('openLazy', 'hideActionSheet'))
	} catch {
		return null
	}
}
