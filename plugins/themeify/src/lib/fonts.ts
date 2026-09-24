import { writeFontToNative } from './fs'
import type { FontDefinition, InstalledFont, ThemeifyStorage } from '../types'

export function validateFont(font: any): FontDefinition {
	if (!font || typeof font !== 'object') {
		throw new Error('Font manifest must be an object')
	}
	if (font.spec !== 1) {
		throw new Error(`Unsupported font spec: ${font.spec}. Only spec: 1 is supported.`)
	}
	if (!font.name || typeof font.name !== 'string') {
		throw new Error('Font manifest is missing a valid "name" field.')
	}
	if (!font.main || typeof font.main !== 'object' || Object.keys(font.main).length === 0) {
		throw new Error('Font manifest must specify at least one font mapping in "main".')
	}
	return font as FontDefinition
}

export async function fetchFontFromUrl(url: string): Promise<FontDefinition> {
	let cleanUrl = url.trim()
	if (cleanUrl.includes('github.com') && cleanUrl.includes('/blob/')) {
		cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
	}

	const res = await fetch(cleanUrl)
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}: Failed to fetch font from ${cleanUrl}`)
	}
	const json = await res.json()
	const validated = validateFont(json)
	validated.source = cleanUrl
	return validated
}

export function saveFont(
	storageApi: any,
	fontDef: FontDefinition,
	select = false,
): InstalledFont {
	const validated = validateFont(fontDef)
	const cache = { ...(storageApi.cache ?? {}) } as ThemeifyStorage
	const fonts = { ...(cache.fonts ?? {}) }

	const installed: InstalledFont = {
		id: validated.name,
		name: validated.name,
		selected: select,
		data: validated,
		installedAt: Date.now(),
	}

	fonts[validated.name] = installed
	cache.fonts = fonts

	if (select) {
		cache.selectedFontName = validated.name
		writeFontToNative(validated)
	}

	storageApi.set(cache)
	return installed
}

export function selectFont(storageApi: any, name: string | null): void {
	const cache = { ...(storageApi.cache ?? {}) } as ThemeifyStorage
	cache.selectedFontName = name

	const fonts = { ...(cache.fonts ?? {}) }
	for (const key of Object.keys(fonts)) {
		fonts[key] = {
			...fonts[key],
			selected: key === name,
		}
	}
	cache.fonts = fonts

	if (name && fonts[name]) {
		writeFontToNative(fonts[name].data)
	} else {
		writeFontToNative(null)
	}

	storageApi.set(cache)
}

export function deleteFont(storageApi: any, name: string): void {
	const cache = { ...(storageApi.cache ?? {}) } as ThemeifyStorage
	const fonts = { ...(cache.fonts ?? {}) }

	const wasSelected = cache.selectedFontName === name
	delete fonts[name]
	cache.fonts = fonts

	if (wasSelected) {
		cache.selectedFontName = null
		writeFontToNative(null)
	}

	storageApi.set(cache)
}
