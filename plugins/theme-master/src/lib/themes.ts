import { DEFAULTS } from '../defaults'
import { removeFile, writeFile } from './fs'
import { processData, validateTheme } from './parser'
import type { JsonStorage } from '@revenge-mod/json-storage'
import type { ColorManifest, ThemeMasterStorage, VdThemeInfo } from '../types'

function isPyonLoader(): boolean {
	return (globalThis as any).__PYON_LOADER__ != null
}

function getThemeFilePath(): string {
	return isPyonLoader() ? 'current-theme.json' : 'vendetta_theme.json'
}

function getCache(
	storage: JsonStorage<ThemeMasterStorage>,
): ThemeMasterStorage {
	return {
		...DEFAULTS,
		...(storage.cache as ThemeMasterStorage | undefined),
	} as ThemeMasterStorage
}

export async function writeThemeToNative(
	theme: VdThemeInfo | Record<string, never>,
): Promise<void> {
	if (typeof theme !== 'object') throw new Error('Theme must be an object')
	const data = Object.keys(theme).length ? JSON.stringify(theme) : '{}'
	await writeFile(getThemeFilePath(), data)
}

export async function fetchTheme(
	url: string,
	selected = false,
): Promise<VdThemeInfo> {
	let themeJSON: any
	try {
		themeJSON = await (await fetch(url)).json()
	} catch {
		throw new Error(`Failed to fetch theme at ${url}`)
	}

	if (!validateTheme(themeJSON)) throw new Error(`Invalid theme at ${url}`)

	const info: VdThemeInfo = {
		id: url,
		selected,
		data: processData(themeJSON as ColorManifest),
	}

	if (selected) await writeThemeToNative(info)
	return info
}

export async function installTheme(
	storage: JsonStorage<ThemeMasterStorage>,
	url: string,
): Promise<void> {
	const cache = getCache(storage)
	if (url in cache.themes) throw new Error('Theme already installed')
	await fetchTheme(url)
}

export async function selectTheme(
	storage: JsonStorage<ThemeMasterStorage>,
	id: string | null,
	write = true,
): Promise<void> {
	const selectedId = id || null
	const cache = getCache(storage)
	const themes = { ...cache.themes }
	for (const key of Object.keys(themes)) {
		themes[key] = { ...themes[key], selected: key === selectedId }
	}
	cache.themes = themes
	cache.selectedThemeId = selectedId
	storage.set({ ...cache })

	if (!write) return
	if (selectedId) {
		const current = themes[selectedId]
		if (current) await writeThemeToNative(current)
	} else {
		await writeThemeToNative({})
	}
}

export async function removeTheme(
	storage: JsonStorage<ThemeMasterStorage>,
	id: string,
): Promise<boolean> {
	const cache = getCache(storage)
	const themes = { ...cache.themes }
	const theme = themes[id]
	if (!theme) return false
	if (theme.selected) await selectTheme(storage, null)
	delete themes[id]
	cache.themes = themes
	storage.set({ ...cache })
	return theme.selected
}

export async function updateThemes(
	storage: JsonStorage<ThemeMasterStorage>,
): Promise<void> {
	const cache = getCache(storage)
	const currentId = cache.selectedThemeId
	await Promise.allSettled(
		Object.keys(cache.themes).map(id =>
			fetchTheme(id, id === currentId).then(info => {
				cache.themes[id] = info
			}),
		),
	)
	storage.set({ ...cache })
}

export function getCurrentTheme(
	storage: JsonStorage<ThemeMasterStorage>,
): VdThemeInfo | null {
	const cache = getCache(storage)
	return Object.values(cache.themes).find(t => t.selected) ?? null
}

export async function clearNativeTheme(): Promise<void> {
	try {
		await removeFile(getThemeFilePath())
	} catch {
		// ignore
	}
}
