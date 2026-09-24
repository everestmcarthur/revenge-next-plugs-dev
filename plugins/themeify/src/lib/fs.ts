import type { FontDefinition, InstalledTheme } from '../types'

function getNativeFs() {
	return (globalThis as any).revenge?.modules?.native?.fs
}

export function getPyoncordDir(): string {
	const nfs = getNativeFs()
	if (!nfs) throw new Error('Native filesystem module is unavailable')
	const filesDir = nfs.getConstants().files
	return `${filesDir}/pyoncord`
}

export function getCurrentThemePath(): string {
	return `${getPyoncordDir()}/current-theme.json`
}

export function getFontsJsonPath(): string {
	return `${getPyoncordDir()}/fonts.json`
}

export function getFontsDownloadDir(): string {
	return `${getPyoncordDir()}/downloads/fonts`
}

export function writeCurrentThemeToNative(theme: InstalledTheme | null): void {
	const nfs = getNativeFs()
	if (!nfs) return
	const path = getCurrentThemePath()
	try {
		if (theme) {
			const payload = {
				id: theme.id,
				selected: true,
				data: {
					name: theme.data.name,
					description: theme.data.description,
					version: theme.data.version,
					authors: theme.data.authors,
					spec: theme.data.spec ?? 2,
					semanticColors: theme.data.semanticColors ?? {},
					rawColors: theme.data.rawColors ?? {},
					background: theme.data.background,
					fonts: theme.data.fonts,
				},
			}
			nfs.writeFileSync(path, JSON.stringify(payload, null, 2))
		} else {
			if (nfs.existsSync(path)) {
				nfs.deleteFileSync(path)
			}
		}
	} catch (e) {
		console.error('[Themeify] Failed to write current-theme.json', e)
	}
}

export function writeFontToNative(font: FontDefinition | null): void {
	const nfs = getNativeFs()
	if (!nfs) return
	const path = getFontsJsonPath()
	try {
		if (font) {
			const payload = {
				name: font.name,
				spec: 1,
				description: font.description,
				previewText: font.previewText,
				source: font.source,
				main: font.main,
			}
			nfs.writeFileSync(path, JSON.stringify(payload, null, 2))
		} else {
			if (nfs.existsSync(path)) {
				nfs.deleteFileSync(path)
			}
		}
	} catch (e) {
		console.error('[Themeify] Failed to write fonts.json', e)
	}
}

export function readNativeCurrentTheme(): any | null {
	const nfs = getNativeFs()
	if (!nfs) return null
	const path = getCurrentThemePath()
	try {
		if (nfs.existsSync(path)) {
			const content = nfs.readFileSync(path)
			return JSON.parse(content)
		}
	} catch {}
	return null
}

export function readNativeFont(): FontDefinition | null {
	const nfs = getNativeFs()
	if (!nfs) return null
	const path = getFontsJsonPath()
	try {
		if (nfs.existsSync(path)) {
			const content = nfs.readFileSync(path)
			return JSON.parse(content)
		}
	} catch {}
	return null
}
