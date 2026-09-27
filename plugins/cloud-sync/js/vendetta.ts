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
export const findByProps = (...props: string[]) =>
	getMetro().findByProps?.(...props) ??
	g.revenge?.discord?.utils?.modules?.finders?.findByProps?.(...props)

export const findByName = (name: string, defaultExp?: boolean) =>
	getMetro().findByName?.(name, defaultExp) ??
	g.revenge?.discord?.utils?.modules?.finders?.findByName?.(name, defaultExp)

export const findByStoreName = (name: string) =>
	g.revenge?.discord?.flux?.Stores?.[name] ??
	getMetro().findByStoreName?.(name) ??
	g.revenge?.discord?.utils?.modules?.finders?.findByStoreName?.(name)

export const find = (filter: (m: any) => boolean) =>
	getMetro().find?.(filter) ??
	g.revenge?.discord?.utils?.modules?.finders?.find?.(filter)

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
			getCommon().FluxDispatcher?.[p] ??
			findByProps('dispatch', 'subscribe')?.[p],
	},
)

export const NavigationNative = new Proxy(
	{},
	{
		get: (_, p) =>
			getCommon().NavigationNative?.[p] ?? findByProps('useNavigation')?.[p],
	},
)

export const stylesheet = {
	createThemedStyleSheet: (styles: any) =>
		getCommon().stylesheet?.createThemedStyleSheet?.(styles) ??
		RN.StyleSheet.create(styles),
}

export const url = {
	openURL: (link: string) =>
		getCommon().url?.openURL?.(link) ?? RN.Linking.openURL(link),
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
		get: (_, p) => getUi().components?.Forms?.[p] ?? {},
	},
)

export const Search = new Proxy(
	{},
	{
		get: (_, p) => getUi().components?.Search?.[p] ?? {},
	},
)

export const showToast = (content: string, asset?: any) =>
	getUi().toasts?.showToast?.(content, asset)

export const showConfirmationAlert = (options: any) =>
	getUi().alerts?.showConfirmationAlert?.(options)

export const showAlert = (options: any) => getUi().alerts?.showAlert?.(options)

export const getAssetIDByName = (name: string) =>
	getUi().assets?.getAssetIDByName?.(name) ?? 0

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
