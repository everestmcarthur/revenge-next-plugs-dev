import { DEFAULTS } from '../defaults'
import {
	clearFolder,
	downloadFile,
	fileExists,
	removeFile,
	writeFile,
} from './fs'
import type { JsonStorage } from '@revenge-mod/json-storage'
import type { FontDefinition, ThemeMasterStorage } from '../types'

function getCache(
	storage: JsonStorage<ThemeMasterStorage>,
): ThemeMasterStorage {
	return {
		...DEFAULTS,
		...(storage.cache as ThemeMasterStorage | undefined),
	} as ThemeMasterStorage
}

export function validateFont(font: FontDefinition): void {
	if (!font || typeof font !== 'object')
		throw new Error('Font must be a valid object')
	if (typeof font.spec !== 'number')
		throw new Error("Invalid font 'spec' number")
	if (font.spec !== 1)
		throw new Error('Only fonts which follow spec:1 are supported')
	if (!font.name) throw new Error('Font is missing the "name" field')
	if (!font.main || typeof font.main !== 'object')
		throw new Error('Font is missing the "main" field')
	if (font.name.startsWith('__'))
		throw new Error('Font names cannot start with __')
}

export async function writeFontToNative(
	font: FontDefinition | null,
): Promise<void> {
	if (font) {
		await writeFile('fonts.json', JSON.stringify(font))
	} else {
		await removeFile('fonts.json')
	}
}

export async function saveFont(
	storage: JsonStorage<ThemeMasterStorage>,
	data: string | FontDefinition,
	selected = false,
): Promise<FontDefinition> {
	let fontDefJson: FontDefinition

	if (typeof data === 'string') {
		try {
			fontDefJson = await (await fetch(data)).json()
		} catch (e) {
			throw new Error(`Failed to fetch font at ${data}`, { cause: e })
		}
	} else {
		fontDefJson = data
	}

	validateFont(fontDefJson)

	const cache = getCache(storage)
	if (fontDefJson.name in cache.fonts)
		throw new Error(
			`There is already a font named '${fontDefJson.name}' installed`,
		)

	const errors = await Promise.allSettled(
		Object.entries(fontDefJson.main).map(async ([font, url]) => {
			let ext = url.split('.').pop()
			if (ext !== 'ttf' && ext !== 'otf') ext = 'ttf'
			const path = `downloads/fonts/${fontDefJson.name}/${font}.${ext}`
			if (!(await fileExists(path))) await downloadFile(url, path)
		}),
	).then(results =>
		results.map(r => (r.status === 'fulfilled' ? undefined : r.reason)),
	)

	if (errors.some(Boolean)) throw errors

	cache.fonts = { ...cache.fonts, [fontDefJson.name]: fontDefJson }
	storage.set({ ...cache })

	if (selected) await selectFont(storage, fontDefJson.name)
	return fontDefJson
}

export async function installFont(
	storage: JsonStorage<ThemeMasterStorage>,
	url: string,
): Promise<FontDefinition> {
	const font = await saveFont(storage, url)
	return font
}

export async function selectFont(
	storage: JsonStorage<ThemeMasterStorage>,
	name: string | null,
): Promise<void> {
	const cache = getCache(storage)
	cache.selectedFontName = name
	storage.set({ ...cache })

	if (name) {
		const font = cache.fonts[name]
		if (font) await writeFontToNative(font)
	} else {
		await writeFontToNative(null)
	}
}

export async function removeFont(
	storage: JsonStorage<ThemeMasterStorage>,
	name: string,
): Promise<void> {
	const cache = getCache(storage)
	const fonts = { ...cache.fonts }
	const selected = cache.selectedFontName === name
	if (selected) await selectFont(storage, null)
	delete fonts[name]
	cache.fonts = fonts
	storage.set({ ...cache })
	try {
		await clearFolder(`downloads/fonts/${name}`)
	} catch {
		// ignore
	}
}

export async function updateFont(
	storage: JsonStorage<ThemeMasterStorage>,
	fontDef: FontDefinition,
): Promise<void> {
	let fontDefCopy: FontDefinition = { ...fontDef }
	if (fontDefCopy.source) {
		const fromSource = await fetch(fontDefCopy.source).then(r => r.json())
		fontDefCopy = { ...fromSource, name: fontDef.name, source: fontDef.source }
	}

	const cache = getCache(storage)
	const selected = cache.selectedFontName === fontDef.name
	await removeFont(storage, fontDef.name)
	await saveFont(storage, fontDefCopy, selected)
}

export async function updateFonts(
	storage: JsonStorage<ThemeMasterStorage>,
): Promise<void> {
	const cache = getCache(storage)
	await Promise.allSettled(
		Object.values(cache.fonts).map(font =>
			saveFont(storage, font, font.name === cache.selectedFontName),
		),
	)
}
