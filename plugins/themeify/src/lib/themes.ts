import { applyTheme, clearTheme } from './loader'
import { writeCurrentThemeToNative } from './fs'
import type { FontDefinition, InstalledTheme, ThemeData, ThemeifyStorage } from '../types'

export function validateTheme(data: any): ThemeData {
	if (!data || typeof data !== 'object') {
		throw new Error('Theme manifest must be an object')
	}
	if (!data.name || typeof data.name !== 'string') {
		throw new Error('Theme is missing a valid "name" field.')
	}
	return data as ThemeData
}

export async function fetchThemeFromUrl(url: string): Promise<ThemeData> {
	let cleanUrl = url.trim()
	if (cleanUrl.includes('github.com') && cleanUrl.includes('/blob/')) {
		cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
	}

	const res = await fetch(cleanUrl)
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}: Failed to fetch theme from ${cleanUrl}`)
	}
	const json = await res.json()
	const targetData = json.data ?? json
	return validateTheme(targetData)
}

export async function saveTheme(
	storageApi: any,
	id: string,
	data: ThemeData,
	select = false,
	currentStorage?: ThemeifyStorage,
): Promise<InstalledTheme> {
	const validated = validateTheme(data)
	const current = currentStorage ?? (await storageApi.get()) ?? {}
	const cache: ThemeifyStorage = { ...current }
	const themes = { ...(cache.themes ?? {}) }

	const installed: InstalledTheme = {
		id,
		selected: select,
		data: validated,
		installedAt: Date.now(),
	}

	themes[id] = installed
	cache.themes = themes

	if (select) {
		cache.selectedThemeId = id
		applyTheme(validated, cache.overrideThemeType)
		writeCurrentThemeToNative(installed)
	}

	await storageApi.set(cache)
	return installed
}

export async function selectTheme(
	storageApi: any,
	id: string | null,
	currentStorage?: ThemeifyStorage,
): Promise<void> {
	const current = currentStorage ?? (await storageApi.get()) ?? {}
	const cache: ThemeifyStorage = { ...current }
	cache.selectedThemeId = id

	const themes = { ...(cache.themes ?? {}) }
	for (const key of Object.keys(themes)) {
		themes[key] = {
			...themes[key],
			selected: key === id,
		}
	}
	cache.themes = themes

	if (id && themes[id]) {
		applyTheme(themes[id].data, cache.overrideThemeType)
		writeCurrentThemeToNative(themes[id])
	} else {
		clearTheme()
		writeCurrentThemeToNative(null)
	}

	await storageApi.set(cache)
}

export async function deleteTheme(
	storageApi: any,
	id: string,
	currentStorage?: ThemeifyStorage,
): Promise<void> {
	const current = currentStorage ?? (await storageApi.get()) ?? {}
	const cache: ThemeifyStorage = { ...current }
	const themes = { ...(cache.themes ?? {}) }

	const wasSelected = cache.selectedThemeId === id
	delete themes[id]
	cache.themes = themes

	if (wasSelected) {
		cache.selectedThemeId = null
		clearTheme()
		writeCurrentThemeToNative(null)
	}

	await storageApi.set(cache)
}

export function extractFontFromTheme(theme: ThemeData): FontDefinition | null {
	if (!theme.fonts || typeof theme.fonts !== 'object' || Object.keys(theme.fonts).length === 0) {
		return null
	}
	return {
		spec: 1,
		name: `${theme.name} Font`,
		description: `Font pack extracted from ${theme.name}`,
		main: theme.fonts,
	}
}
