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
		plugins: {},
		themes: {},
		fonts: {
			installed: {},
			custom: [],
		},
	}

	for (const item of Object.values(plugins as any) as any[]) {
		if (!debug && vstorage.config.ignoredPlugins.includes(item.id)) continue

		const storage = await createMMKVBackend(item.id).get()
		sync.plugins[item.id] = {
			enabled: item.enabled,
			storage: JSON.stringify(stripNoCloudSync(storage)),
		}
	}

	for (const item of Object.values(themes as any) as any[]) {
		sync.themes[item.id] = {
			enabled: item.selected,
		}
	}

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

export type SyncImportOptions = Record<
	'unproxiedPlugins' | 'plugins' | 'themes' | 'fonts',
	boolean
>

export async function importData(data: UserData, options: SyncImportOptions) {
	if (!data) return
	importCallback?.(true)

	const iplugins = [
		...Object.entries(data.plugins).filter(
			([id]) =>
				!(plugins as any)[id] &&
				!isPluginProxied(id) &&
				canImport(id) &&
				options.unproxiedPlugins,
		),
		...Object.entries(data.plugins).filter(
			([id]) =>
				!(plugins as any)[id] &&
				isPluginProxied(id) &&
				canImport(id) &&
				options.plugins,
		),
	]
	const ithemes = Object.entries(data.themes).filter(
		([id]) => !(themes as any)[id] && options.themes,
	)

	const fonts = getFonts()
	const ifonts = Object.entries(data.fonts.installed).filter(
		([id]) => !hasFontBySource(id, fonts) && options.fonts,
	)
	const icustomFonts = data.fonts.custom.filter(
		({ name }) => !hasFontByName(name, fonts) && options.fonts,
	)

	if (!iplugins[0] && !ithemes[0] && !ifonts[0] && !icustomFonts[0]) {
		importCallback?.(false)
		showToast(
			lang.format('toast.sync.no_import', {}),
			getAssetIDByName('CircleXIcon-primary'),
		)
		return
	}

	clearLogs()
	addLog(
		'importer',
		lang.format('log.import.start.combo', {
			plugins: lang.format('plugins', { plugins: iplugins.length }),
			themes: lang.format('themes', { themes: ithemes.length }),
			fonts: lang.format('fonts', {
				fonts: ifonts.length + icustomFonts.length,
			}),
		}),
	)

	if (!isInPage) {
		showToast(
			lang.format('log.import.start.combo', {
				plugins: lang.format('plugins', { plugins: iplugins.length }),
				themes: lang.format('themes', { themes: ithemes.length }),
				fonts: lang.format('fonts', {
					fonts: ifonts.length + icustomFonts.length,
				}),
			}),
			getAssetIDByName('DownloadIcon'),
		)
	}

	const status = { plugins: 0, themes: 0, fonts: 0 }
	let failedAny = false
	let selFont: FontDefinition | undefined

	const { bunny } = window as any

	await Promise.all([
		...iplugins.map(
			([id, { enabled, storage }]) =>
				new Promise<void>(res => {
					if (storage && RNCacheModule?.setItem)
						RNCacheModule.setItem(id, storage)
					installPlugin(id, enabled)
						.then(() => {
							status.plugins++
							addLog(
								'plugins',
								lang.format('log.import.plugin.success', {
									name: id,
								}),
							)
						})
						.catch((e: any) => {
							failedAny = true
							addLog(
								'plugins',
								lang.format('log.import.plugin.fail', {
									name: id,
									error: e,
								}),
							)
						})
						.finally(res)
				}),
		),
		...ithemes.map(
			([id]) =>
				new Promise<void>(res =>
					installTheme(id)
						.then(() => {
							status.themes++
							addLog(
								'themes',
								lang.format('log.import.theme.success', {
									name: id,
								}),
							)
						})
						.catch((e: any) => {
							failedAny = true
							addLog(
								'themes',
								lang.format('log.import.theme.fail', {
									name: id,
									error: e,
								}),
							)
						})
						.finally(res),
				),
		),
		...ifonts.map(
			([id, item]) =>
				new Promise<void>(res =>
					installFont(id, item.enabled)
						.then(() => {
							status.fonts++
							if (item.enabled) selFont = fonts[id]

							addLog(
								'fonts',
								lang.format('log.import.font.success', {
									name: id,
								}),
							)
						})
						.catch((e: any) => {
							failedAny = true
							addLog(
								'fonts',
								lang.format('log.import.font.fail', {
									name: id,
									error: e,
								}),
							)
						})
						.finally(res),
				),
		),
		...icustomFonts.map(
			item =>
				new Promise<void>(res =>
					addFont(without(item, 'enabled'), item.enabled)
						.then(() => {
							status.fonts++
							if (item.enabled) selFont = fonts[item.name]

							addLog(
								'fonts',
								lang.format('log.import.font.success', {
									name: item.name,
								}),
							)
						})
						.catch((e: any) => {
							failedAny = true
							addLog(
								'fonts',
								lang.format('log.import.font.fail', {
									name: item.name,
									error: e,
								}),
							)
						})
						.finally(res),
				),
		),
	])

	if (!isInPage) {
		showToast(
			lang.format('log.import.total', {
				plugins: lang.format('plugins', { plugins: status.plugins }),
				themes: lang.format('themes', { themes: status.themes }),
				fonts: lang.format('fonts', { fonts: status.fonts }),
			}),
			getAssetIDByName('CircleCheckIcon-primary'),
		)
	}

	const didSelectTheme = ithemes.find(([_, { enabled }]) => enabled)?.[0]
	const selectTheme = didSelectTheme && (themes as any)[didSelectTheme]
	if (selectTheme && bunny?.themes) {
		try {
			bunny.themes.selectTheme(selectTheme)
			bunny.themes.applyTheme(selectTheme)

			addLog(
				'themes',
				lang.format('log.import.select_theme.success', {
					theme: selectTheme.id,
				}),
			)
		} catch (_e: any) {
			addLog(
				'themes',
				lang.format('log.import.select_theme.fail', {
					theme: selectTheme.id,
				}),
			)
		}
	}

	addLog(
		'importer',
		lang.format('log.import.result', {
			plugins: lang.format('plugins', { plugins: status.plugins }),
			themes: lang.format('themes', { themes: status.themes }),
			fonts: lang.format('fonts', { fonts: status.fonts }),
			success: failedAny
				? lang.format('log.import.result.some_fail', {})
				: lang.format('log.import.result.all_success', {}),
		}),
	)

	if (selFont) {
		addLog(
			'fonts',
			lang.format('log.import.reload_for_font', {
				name: (selFont as any).name,
			}),
		)
	}

	importCallback?.(false)
}
