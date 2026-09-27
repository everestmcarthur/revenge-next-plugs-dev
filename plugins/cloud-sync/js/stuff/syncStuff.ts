import { installPlugin, plugins } from '../vendetta'
import { createMMKVBackend } from '../vendetta'
import { installTheme, themes } from '../vendetta'
import { getAssetIDByName } from '../vendetta'
import { showToast } from '../vendetta'
import { without } from '../vendetta'

import { canImport, isPluginProxied, lang, vstorage } from '../index'
import { addLog, clearLogs, isInPage } from '../components/pages/ImportLogsPage'
import type { UserData } from '../stores/CacheStore'
import { RNCacheModule } from './nativeModules'
import {
	addFont,
	type FontDefinition,
	getFonts,
	getSelectedFont,
	hasFontByName,
	hasFontBySource,
	installFont,
} from './fonts'

function stripNoCloudSync(obj: unknown) {
	if (obj && typeof obj === 'object') {
		if (Array.isArray(obj)) {
			const filtered: typeof obj = []
			for (const val of obj) {
				const rep = stripNoCloudSync(val)
				if (rep !== undefined) filtered.push(rep)
			}

			return filtered
		} else {
			if ('__no_cloud_sync' in obj) return undefined
			if ('__no_sync' in obj) return undefined

			const filtered: typeof obj = {}
			for (const [key, value] of Object.entries(obj)) {
				const rep = stripNoCloudSync(value)
				if (rep !== undefined) filtered[key] = rep
			}

			return filtered
		}
	} else return obj
}

export async function grabEverything(debug?: boolean): Promise<UserData> {
	const sync: UserData = {
		version: 3,
		plugins: {},
		repos: [],
		settings: {},
		experiments: {},
		themes: {},
		fonts: {
			installed: {},
			custom: [],
		},
	}

	// 1. REPOSITORIES
	const reposApi = (globalThis as any).revenge?.hidden?.plugins?.repositories
	if (typeof reposApi?.listRepos === 'function') {
		try {
			const repoList = await reposApi.listRepos()
			if (Array.isArray(repoList)) {
				sync.repos = repoList
					.filter((r: any) => !r.internal && r.url && r.url.startsWith('http'))
					.map((r: any) => ({
						url: r.url,
						enabled: r.enabled !== false,
						name: r.name,
						description: r.description,
					}))
			}
		} catch (err) {
			logger.error('Failed to list repos:', err)
		}
	}

	// 2. PLUGINS & STORAGE
	const internalApi = (globalThis as any).revenge?.hidden?.plugins?.internal
	const pList: Map<string, any> | undefined = internalApi?.pList
	const isPluginEnabled = internalApi?.isPluginEnabled ?? (() => false)
	const getInternalPluginMeta = internalApi?.getInternalPluginMeta

	if (pList instanceof Map) {
		for (const [id, plugin] of pList) {
			if (!debug && vstorage?.config?.ignoredPlugins?.includes(id)) continue
			if (id.includes('cloud-sync')) continue

			const meta = getInternalPluginMeta ? getInternalPluginMeta(plugin) : null
			if (meta?.iflags && meta.iflags > 0 && !meta?.source) continue
			if (
				id.startsWith('revenge.api') ||
				id === 'revenge.settings' ||
				id === 'revenge.recovery' ||
				id === 'discord'
			)
				continue

			const enabled = Boolean(isPluginEnabled(plugin))
			let storage = '{}'
			try {
				const rawStorage = await (globalThis as any).revenge?.jsonStorage
					?.getJsonStorage(id)
					?.get()
				if (rawStorage) {
					storage = JSON.stringify(stripNoCloudSync(rawStorage))
				}
			} catch {}

			sync.plugins[id] = {
				enabled,
				storage,
				repo: meta?.source?.repo,
				version: plugin?.manifest?.version
					? typeof plugin.manifest.version === 'string'
						? plugin.manifest.version
						: plugin.manifest.version?.nums?.join('.')
					: undefined,
			}
		}
	} else {
		for (const item of Object.values(plugins as any) as any[]) {
			if (!debug && vstorage?.config?.ignoredPlugins?.includes(item.id)) continue
			if (item.id?.includes('cloud-sync')) continue

			const storage = await createMMKVBackend(item.id).get()
			sync.plugins[item.id] = {
				enabled: item.enabled,
				storage: JSON.stringify(stripNoCloudSync(storage)),
			}
		}
	}

	// 3. SETTINGS
	const internalSettingsKeys = [
		'revenge.settings',
		'revenge.no-track',
		'revenge.api.hidden',
		'revenge.discord.prevent-ota-updates',
	]
	for (const key of internalSettingsKeys) {
		try {
			const data = await (globalThis as any).revenge?.jsonStorage
				?.getJsonStorage(key)
				?.get()
			if (data && Object.keys(data).length > 0) {
				sync.settings![key] = stripNoCloudSync(data)
			}
		} catch {}
	}

	// 4. EXPERIMENTS
	try {
		const expStore = (globalThis as any).revenge?.discord?.flux?.Stores?.ExperimentStore
		if (typeof expStore?.getAllExperimentOverrideDescriptors === 'function') {
			const overrides = expStore.getAllExperimentOverrideDescriptors()
			if (overrides && typeof overrides === 'object') {
				for (const [expId, desc] of Object.entries(overrides)) {
					sync.experiments![expId] = desc
				}
			}
		}
	} catch (err) {
		logger.error('Failed to get experiment overrides:', err)
	}

	// 5. THEMES
	for (const item of Object.values(themes as any) as any[]) {
		sync.themes[item.id] = {
			enabled: item.selected,
		}
	}

	// 6. FONTS
	const selFont = getSelectedFont()
	const fonts = getFonts()

	for (const item of Object.values(fonts).filter(item => item.__source)) {
		sync.fonts.installed[item.__source!] = {
			enabled: selFont === item.name,
		}
	}
	for (const item of Object.values(fonts).filter(item => !item.__source)) {
		sync.fonts.custom.push({
			...item,
			enabled: selFont === item.name,
		})
	}

	return sync
}

let importCallback: ((x: boolean) => void) | undefined
export function setImportCallback(fnc: typeof importCallback) {
	importCallback = fnc
}

export type SyncImportOptions = {
	plugins: boolean
	repos?: boolean
	settings?: boolean
	experiments?: boolean
	unproxiedPlugins?: boolean
	themes?: boolean
	fonts?: boolean
}

export async function importData(data: UserData, options: SyncImportOptions) {
	if (!data) return
	importCallback?.(true)

	clearLogs()
	addLog('importer', 'Starting CloudSync import...')

	const status = {
		repos: 0,
		plugins: 0,
		settings: 0,
		experiments: 0,
		themes: 0,
		fonts: 0,
	}
	let failedAny = false

	const reposApi = (globalThis as any).revenge?.hidden?.plugins?.repositories
	const internalApi = (globalThis as any).revenge?.hidden?.plugins?.internal

	// 1. REPOSITORIES (Import first so that plugins can be discovered from newly added repos)
	if (options.repos !== false && data.repos && Array.isArray(data.repos) && data.repos.length > 0) {
		try {
			addLog('repos', `Importing ${data.repos.length} plugin repositories...`)
			const currentRepos = (await reposApi?.listRepos?.()) ?? []
			const existingUrls = new Set(currentRepos.map((r: any) => r.url))
			const combined = [...currentRepos.filter((r: any) => !r.internal && r.url?.startsWith('http'))]

			for (const r of data.repos) {
				if (!r.url || !r.url.startsWith('http')) continue
				if (!existingUrls.has(r.url)) {
					combined.push({
						url: r.url,
						enabled: r.enabled !== false,
					})
					existingUrls.add(r.url)
					status.repos++
					addLog('repos', `Added repo: ${r.name || r.url}`)
				}
			}

			if (status.repos > 0 && typeof reposApi?.setRepos === 'function') {
				await reposApi.setRepos(combined)
				if (typeof reposApi?.refreshAllRepos === 'function') {
					await reposApi.refreshAllRepos()
				}
			}
		} catch (err: any) {
			failedAny = true
			addLog('repos', `Failed to import repos: ${err?.message || err}`)
		}
	}

	// 2. PLUGINS & STORAGE
	if (options.plugins !== false && data.plugins) {
		const pluginEntries = Object.entries(data.plugins).filter(([id]) => canImport(id))
		addLog('plugins', `Importing ${pluginEntries.length} plugins...`)

		for (const [id, item] of pluginEntries) {
			try {
				const existingPlugin = internalApi?.pList?.get(id)
				if (!existingPlugin) {
					let plan: any
					if (typeof reposApi?.planInstall === 'function') {
						const repoUrls = item.repo ? [item.repo] : null
						plan = await reposApi.planInstall(id, item.version ?? null, null, repoUrls)
					}
					if (plan && typeof reposApi?.installFromRepo === 'function') {
						await reposApi.installFromRepo(plan)
					} else {
						await installPlugin(id, item.enabled, item.repo)
					}
				}

				if (item.storage) {
					try {
						const parsedStorage = JSON.parse(item.storage)
						if (parsedStorage && typeof parsedStorage === 'object') {
							await (globalThis as any).revenge?.jsonStorage?.getJsonStorage(id)?.set(parsedStorage)
						}
					} catch {}
				}

				const p = internalApi?.pList?.get(id)
				if (p && internalApi?.isPluginEnabled) {
					const isEnabled = internalApi.isPluginEnabled(p)
					if (item.enabled && !isEnabled && internalApi.enablePlugin) {
						await internalApi.enablePlugin(p)
					} else if (!item.enabled && isEnabled && internalApi.disablePlugin) {
						await internalApi.disablePlugin(p)
					}
				}

				status.plugins++
				addLog('plugins', `Restored plugin: ${id}`)
			} catch (err: any) {
				failedAny = true
				addLog('plugins', `Failed to restore ${id}: ${err?.message || err}`)
			}
		}
	}

	// 3. SETTINGS
	if (options.settings !== false && data.settings) {
		const settingsEntries = Object.entries(data.settings)
		addLog('settings', `Importing ${settingsEntries.length} settings...`)

		for (const [key, val] of settingsEntries) {
			try {
				if (val && typeof val === 'object') {
					await (globalThis as any).revenge?.jsonStorage?.getJsonStorage(key)?.set(val)
					status.settings++
					addLog('settings', `Restored settings: ${key}`)
				}
			} catch (err: any) {
				failedAny = true
				addLog('settings', `Failed to restore ${key}: ${err?.message || err}`)
			}
		}
	}

	// 4. EXPERIMENTS
	if (options.experiments !== false && data.experiments) {
		const expEntries = Object.entries(data.experiments)
		addLog('experiments', `Importing ${expEntries.length} experiment overrides...`)

		const dispatcher =
			(globalThis as any).revenge?.discord?.flux?.Stores?.ExperimentStore?._dispatcher ??
			(globalThis as any).revenge?.discord?.flux?.Dispatcher
		for (const [expId, desc] of expEntries) {
			try {
				if (dispatcher?.dispatch) {
					dispatcher.dispatch({
						type: 'EXPERIMENT_OVERRIDE_BUCKET',
						experimentId: expId,
						experimentBucket: desc?.bucket ?? 1,
					})
					status.experiments++
					addLog('experiments', `Overrode experiment: ${expId} (bucket ${desc?.bucket ?? 1})`)
				}
			} catch (err: any) {
				failedAny = true
				addLog('experiments', `Failed to override ${expId}: ${err?.message || err}`)
			}
		}
	}

	// 5. THEMES
	if (options.themes && data.themes) {
		for (const [id] of Object.entries(data.themes)) {
			try {
				await installTheme(id)
				status.themes++
			} catch {}
		}
	}

	// 6. FONTS
	if (options.fonts && data.fonts) {
		for (const [id, item] of Object.entries(data.fonts.installed ?? {})) {
			try {
				await installFont(id, item.enabled)
				status.fonts++
			} catch {}
		}
		for (const item of data.fonts.custom ?? []) {
			try {
				await addFont(without(item, 'enabled'), item.enabled)
				status.fonts++
			} catch {}
		}
	}

	const summaryMsg = `Sync complete: ${status.plugins} plugins, ${status.repos} repos, ${status.experiments} experiments, ${status.settings} settings`
	showToast(summaryMsg, getAssetIDByName('CircleCheckIcon-primary'))
	addLog('importer', summaryMsg)
	importCallback?.(false)
}
