const g = globalThis as any
export const React = g.revenge?.react?.React ?? g.vendetta?.metro?.common?.React
export const RN =
	g.revenge?.react?.ReactNative ?? g.vendetta?.metro?.common?.ReactNative
export const ReactNative = RN
const getVendetta = () => g.vendetta ?? g.revenge ?? g.bunny ?? {}
const getMetro = () => getVendetta().metro ?? {}
const getCommon = () => getMetro().common ?? {}
const getUi = () => getVendetta().ui ?? {}

// Metro finders
export const findByProps = (...props: string[]) => {
	const metro = getMetro()
	if (typeof metro?.findByProps === 'function') return metro.findByProps(...props)
	if (typeof g.revenge?.discord?.utils?.modules?.finders?.findByProps === 'function')
		return g.revenge.discord.utils.modules.finders.findByProps(...props)
	const finders = g.revenge?.modules?.finders
	if (finders?.lookupModule && finders?.filters?.withProps) {
		try {
			const mod = finders.lookupModule(finders.filters.withProps(...props))
			return Array.isArray(mod) ? mod[0] : mod
		} catch {}
	}
	return undefined
}

export const findByName = (name: string, defaultExp?: boolean) => {
	const metro = getMetro()
	if (typeof metro?.findByName === 'function') return metro.findByName(name, defaultExp)
	if (typeof g.revenge?.discord?.utils?.modules?.finders?.findByName === 'function')
		return g.revenge.discord.utils.modules.finders.findByName(name, defaultExp)
	const finders = g.revenge?.modules?.finders
	if (finders?.lookupModule && finders?.filters?.withName) {
		try {
			const mod = finders.lookupModule(finders.filters.withName(name))
			return Array.isArray(mod) ? mod[0] : mod
		} catch {}
	}
	return undefined
}

export const findByStoreName = (name: string) => {
	if (g.revenge?.discord?.flux?.Stores?.[name])
		return g.revenge.discord.flux.Stores[name]
	if (typeof g.revenge?.discord?.flux?.getStore === 'function') {
		try {
			const s = g.revenge.discord.flux.getStore(name)
			if (s) return s
		} catch {}
	}
	const metro = getMetro()
	if (typeof metro?.findByStoreName === 'function') return metro.findByStoreName(name)
	if (typeof g.revenge?.discord?.utils?.modules?.finders?.findByStoreName === 'function')
		return g.revenge.discord.utils.modules.finders.findByStoreName(name)
	return undefined
}

export const find = (filter: (m: any) => boolean) => {
	const metro = getMetro()
	if (typeof metro?.find === 'function') return metro.find(filter)
	if (typeof g.revenge?.discord?.utils?.modules?.finders?.find === 'function')
		return g.revenge.discord.utils.modules.finders.find(filter)
	const finders = g.revenge?.modules?.finders
	if (finders?.lookupModule) {
		try {
			const mod = finders.lookupModule(filter)
			return Array.isArray(mod) ? mod[0] : mod
		} catch {}
	}
	return undefined
}

// Common
export const constants = new Proxy(
	{},
	{
		get: (_, p) => getCommon().constants?.[p] ?? getVendetta().constants?.[p],
	},
)

export const FluxDispatcher = new Proxy(
	{},
	{
		get: (_, p) =>
			g.revenge?.discord?.common?.flux?.Dispatcher?.[p] ??
			g.revenge?.discord?.flux?.Dispatcher?.[p] ??
			g.revenge?.discord?.flux?.Stores?.ExperimentStore?._dispatcher?.[p] ??
			getCommon().FluxDispatcher?.[p] ??
			findByProps('dispatch', 'subscribe')?.[p],
	},
)

export const NavigationNative = new Proxy(
	{},
	{
		get: (_, p) =>
			g.revenge?.everest?.getNavigation?.()?.[p] ??
			g.revenge?.everest?.getNavigator?.()?.[p] ??
			getCommon().NavigationNative?.[p] ??
			findByProps('useNavigation')?.[p],
	},
)

export const stylesheet = {
	createThemedStyleSheet: (styles: any) =>
		getCommon().stylesheet?.createThemedStyleSheet?.(styles) ??
		RN?.StyleSheet?.create(styles) ??
		styles,
}

export const url = {
	openURL: (link: string) =>
		getCommon().url?.openURL?.(link) ?? RN?.Linking?.openURL?.(link),
}

// UI
export const semanticColors = new Proxy(
	{},
	{
		get: (_, p) => getUi().semanticColors?.[p] ?? p,
	},
)

export const Forms = new Proxy(
	{},
	{
		get: (_, p) => {
			const uiForm = getUi().components?.Forms?.[p]
			if (uiForm && typeof uiForm === 'function') return uiForm

			const design = g.revenge?.discord?.design?.Design
			if (design) {
				if (p === 'FormRow' && design.TableRow) {
					const Row = design.TableRow
					Row.Icon = ({ source, style }: any) =>
						source ? React.createElement(RN.Image, { source, style }) : null
					Row.Arrow = () => null
					return Row
				}
				if (p === 'FormSwitchRow' && design.TableSwitchRow) return design.TableSwitchRow
				if (p === 'FormCheckboxRow' && design.TableCheckboxRow) return design.TableCheckboxRow
				if (p === 'FormRadioRow' && design.TableRadioRow) return design.TableRadioRow
				if (p === 'FormInput' && (design.TextInput || design.TextField))
					return design.TextInput || design.TextField
				if (p === 'FormSection' && design.TableRowGroup) return design.TableRowGroup
				if (design[p]) return design[p]
			}

			const Fallback: any = (props: any) => props?.children ?? null
			Fallback.Icon = ({ source, style }: any) =>
				source ? React.createElement(RN.Image, { source, style }) : null
			Fallback.Arrow = () => null
			return Fallback
		},
	},
)

export const Search: any = Object.assign(
	function Search(props: any) {
		const UiSearch = getUi().components?.Search
		if (typeof UiSearch === 'function') return React.createElement(UiSearch, props)
		const RevengeSearch = g.revenge?.components?.SearchInput
		if (typeof RevengeSearch === 'function')
			return React.createElement(RevengeSearch, {
				value: props.value,
				onChangeText: props.onChangeText ?? props.onChange,
				placeholder: props.placeholder ?? 'Search...',
				style: props.style,
			})
		return React.createElement(RN.TextInput, {
			value: props.value,
			onChangeText: props.onChangeText ?? props.onChange,
			placeholder: props.placeholder ?? 'Search...',
			placeholderTextColor: '#80848e',
			style: [
				{
					backgroundColor: '#1e1f22',
					borderRadius: 8,
					padding: 10,
					color: '#fff',
				},
				props.style,
			],
		})
	},
	new Proxy(
		{},
		{
			get: (_, p) => getUi().components?.Search?.[p] ?? (() => null),
		},
	),
)

export const showToast = (content: string, asset?: any) => {
	if (typeof getUi().toasts?.showToast === 'function') {
		return getUi().toasts.showToast(content, asset)
	}
	const toastMod = findByProps('showToast')
	if (typeof toastMod?.showToast === 'function') {
		try {
			return toastMod.showToast(content, asset)
		} catch {}
	}
	if (typeof RN?.ToastAndroid?.show === 'function') {
		RN.ToastAndroid.show(content, RN.ToastAndroid.SHORT)
	}
}

export const showConfirmationAlert = (options: any) => {
	if (typeof getUi().alerts?.showConfirmationAlert === 'function') {
		return getUi().alerts.showConfirmationAlert(options)
	}
	if (RN?.Alert?.alert) {
		RN.Alert.alert(
			options.title ?? '',
			options.content ?? options.body ?? '',
			[
				{ text: options.cancelText ?? 'Cancel', style: 'cancel', onPress: options.onCancel },
				{ text: options.confirmText ?? 'OK', onPress: options.onConfirm },
			],
		)
	}
}

export const showAlert = (options: any) => {
	if (typeof getUi().alerts?.showAlert === 'function') {
		return getUi().alerts.showAlert(options)
	}
	if (RN?.Alert?.alert) {
		RN.Alert.alert(
			options.title ?? '',
			options.content ?? options.body ?? '',
			[{ text: options.confirmText ?? 'OK', onPress: options.onConfirm }],
		)
	}
}

export const getAssetIDByName = (name: string) =>
	g.revenge?.assets?.getAssetIdByName?.(name) ??
	g.revenge?.assets?.getAssetByName?.(name)?.id ??
	getUi().assets?.getAssetIDByName?.(name) ??
	0

// Plugins & Themes
export const plugins = new Proxy(
	{},
	{
		get: (_, p) => {
			if (typeof p === 'string') {
				const pList = g.revenge?.hidden?.plugins?.internal?.pList
				if (pList instanceof Map && pList.has(p)) return pList.get(p)
			}
			return getVendetta().plugins?.[p]
		},
		has: (_, p) => {
			if (typeof p === 'string') {
				const pList = g.revenge?.hidden?.plugins?.internal?.pList
				if (pList instanceof Map && pList.has(p)) return true
			}
			return p in (getVendetta().plugins ?? {})
		},
		ownKeys: () => {
			const pList = g.revenge?.hidden?.plugins?.internal?.pList
			if (pList instanceof Map) {
				return Array.from(pList.keys())
			}
			return Object.keys(getVendetta().plugins ?? {})
		},
		getOwnPropertyDescriptor: (_, p) => {
			const pList = g.revenge?.hidden?.plugins?.internal?.pList
			if (pList instanceof Map && pList.has(p)) {
				return {
					configurable: true,
					enumerable: true,
					value: pList.get(p),
					writable: true,
				}
			}
			return Object.getOwnPropertyDescriptor(getVendetta().plugins ?? {}, p)
		},
		set: (_, p, v) => {
			const target = getVendetta().plugins
			if (target) target[p] = v
			return true
		},
	},
)

export const themes = new Proxy(
	{},
	{
		get: (_, p) => getVendetta().themes?.[p],
		set: (_, p, v) => {
			const target = getVendetta().themes
			if (target) target[p] = v
			return true
		},
	},
)

export const installPlugin = async (id: string, enabled = true, repoUrl?: string) => {
	const reposApi = g.revenge?.hidden?.plugins?.repositories
	const internalApi = g.revenge?.hidden?.plugins?.internal
	if (reposApi?.planInstall && reposApi?.installFromRepo) {
		const repoUrls = repoUrl ? [repoUrl] : null
		const plan = await reposApi.planInstall(id, null, null, repoUrls)
		await reposApi.installFromRepo(plan)
		const plugin = internalApi?.pList?.get(id)
		if (plugin && internalApi?.isPluginEnabled) {
			const isEnabled = internalApi.isPluginEnabled(plugin)
			if (enabled && !isEnabled && internalApi.enablePlugin) {
				await internalApi.enablePlugin(plugin)
			} else if (!enabled && isEnabled && internalApi.disablePlugin) {
				await internalApi.disablePlugin(plugin)
			}
		}
		return
	}
	return getVendetta().plugins?.installPlugin?.(id, enabled)
}

export const removePlugin = async (id: string) => {
	const internalApi = g.revenge?.hidden?.plugins?.internal
	if (typeof internalApi?.uninstallExternalPlugin === 'function') {
		return await internalApi.uninstallExternalPlugin(id)
	}
	return getVendetta().plugins?.removePlugin?.(id)
}

export const installTheme = (id: string) =>
	getVendetta().themes?.installTheme?.(id)

export const removeTheme = (id: string) =>
	getVendetta().themes?.removeTheme?.(id)

// Storage
export const storage = new Proxy(
	{},
	{
		get: (_, p) =>
			getVendetta().plugin?.storage?.[p] ?? getVendetta().storage?.[p],
		set: (_, p, v) => {
			const target = getVendetta().plugin?.storage ?? getVendetta().storage
			if (target) target[p] = v
			return true
		},
	},
)

export const useProxy = (target: any) =>
	getVendetta().storage?.useProxy?.(target) ?? target

export const createMMKVBackend = (key: string) => ({
	get: async () => {
		try {
			if (g.revenge?.jsonStorage?.getJsonStorage) {
				return (await g.revenge.jsonStorage.getJsonStorage(key).get()) ?? {}
			}
			return (
				(await getVendetta().storage?.createMMKVBackend?.(key)?.get?.()) ?? {}
			)
		} catch {
			return {}
		}
	},
	set: async (val: any) => {
		try {
			if (g.revenge?.jsonStorage?.getJsonStorage) {
				await g.revenge.jsonStorage.getJsonStorage(key).set(val)
				return
			}
			await getVendetta().storage?.createMMKVBackend?.(key)?.set?.(val)
		} catch {}
	},
})

// Settings
export const settings = new Proxy(
	{},
	{
		get: (_, p) => getVendetta().settings?.[p],
	},
)

export const plugin = new Proxy(
	{},
	{
		get: (_, p) => getVendetta().plugin?.[p],
	},
)

// Logger
export const logger = {
	log: (...args: any[]) => console.log('[CloudSync]', ...args),
	error: (...args: any[]) => console.error('[CloudSync]', ...args),
	warn: (...args: any[]) => console.warn('[CloudSync]', ...args),
	info: (...args: any[]) => console.info('[CloudSync]', ...args),
}

// Utils
export const without = (obj: any, ...keys: string[]) => {
	if (!obj) return {}
	const res = { ...obj }
	for (const k of keys) delete res[k]
	return res
}

export const findInReactTree = (
	tree: any,
	filter: (node: any) => boolean,
): any => {
	if (!tree) return null
	if (filter(tree)) return tree
	if (Array.isArray(tree)) {
		for (const item of tree) {
			const res = findInReactTree(item, filter)
			if (res) return res
		}
	} else if (typeof tree === 'object') {
		for (const key of Object.keys(tree)) {
			const res = findInReactTree(tree[key], filter)
			if (res) return res
		}
	}
	return null
}
