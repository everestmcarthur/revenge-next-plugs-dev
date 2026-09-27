import type { FontDefinition, InstalledTheme } from '../types'
import {
	formatHexForNative,
	RAW_COLOR_ALIASES,
	SEMANTIC_FALLBACKS,
	toScreamingSnake,
} from './parser'

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

export function normalizeSemanticColorsForNative(
	semanticColors?: Record<string, any>,
	rawColors: Record<string, string> = {},
): Record<string, string[]> {
	if (!semanticColors) return {}
	const res: Record<string, string[]> = {}

	for (const [key, val] of Object.entries(semanticColors)) {
		const upperKey = toScreamingSnake(key)
		let darkHex = '#ffffff'
		let lightHex = '#000000'

		if (typeof val === 'string') {
			const resolved = formatHexForNative(val, rawColors) ?? val
			darkHex = resolved
			lightHex = resolved
		} else if (Array.isArray(val)) {
			darkHex = formatHexForNative(val[0], rawColors) ?? val[0] ?? '#ffffff'
			lightHex =
				formatHexForNative(val[1] ?? val[0], rawColors) ??
				val[1] ??
				val[0] ??
				'#000000'
		} else if (typeof val === 'object' && val !== null) {
			const darkVal =
				val.darker ?? val.dark ?? val.midnight ?? '#ffffff'
			const lightVal = val.light ?? '#000000'
			darkHex = formatHexForNative(darkVal, rawColors) ?? darkVal
			lightHex = formatHexForNative(lightVal, rawColors) ?? lightVal
		}

		// Ensure strictly valid hex string (#RRGGBB or #RRGGBBAA)
		darkHex = formatHexForNative(darkHex, rawColors) ?? '#ffffff'
		lightHex = formatHexForNative(lightHex, rawColors) ?? '#000000'

		res[upperKey] = [darkHex, lightHex]
	}

	// Apply bidirectional fallbacks
	for (const [token, fallbacks] of Object.entries(SEMANTIC_FALLBACKS)) {
		if (!res[token]) {
			for (const fb of fallbacks) {
				if (res[fb]) {
					res[token] = res[fb]
					break
				}
			}
		}
	}

	return res
}

export function normalizeRawColorsForNative(
	rawColors?: Record<string, string>,
): Record<string, string> {
	if (!rawColors) return {}
	const res: Record<string, string> = {}

	for (const [k, v] of Object.entries(rawColors)) {
		if (typeof v === 'string') {
			const formatted = formatHexForNative(v) ?? v
			res[k.toLowerCase()] = formatted
			res[k.toUpperCase()] = formatted
		}
	}

	// Expand RAW_COLOR_ALIASES
	for (const [key, aliases] of Object.entries(RAW_COLOR_ALIASES)) {
		if (!res[key]) {
			for (const alias of aliases) {
				if (res[alias]) {
					const val = res[alias]
					res[key] = val
					res[key.toLowerCase()] = val
					break
				}
			}
		}
	}

	return res
}

export function expandFontMappingsForNative(
	main: Record<string, string>,
): Record<string, string> {
	if (!main || typeof main !== 'object') return {}
	const expanded: Record<string, string> = { ...main }

	// Determine fallback font URLs
	const regular =
		main['ggsans-Normal'] ??
		main['ggsans'] ??
		main['normal'] ??
		main['Normal'] ??
		main['regular'] ??
		main['Regular'] ??
		main['default'] ??
		Object.values(main)[0]

	const medium =
		main['ggsans-Medium'] ??
		main['medium'] ??
		main['Medium'] ??
		regular

	const semiBold =
		main['ggsans-SemiBold'] ??
		main['ggsans-Semibold'] ??
		main['semibold'] ??
		main['SemiBold'] ??
		main['Semibold'] ??
		medium

	const bold =
		main['ggsans-Bold'] ??
		main['bold'] ??
		main['Bold'] ??
		main['headline'] ??
		semiBold

	const extraBold =
		main['ggsans-ExtraBold'] ??
		main['extrabold'] ??
		main['ExtraBold'] ??
		bold

	const italic =
		main['ggsans-NormalItalic'] ??
		main['italic'] ??
		main['Italic'] ??
		main['normalItalic'] ??
		regular

	const mediumItalic =
		main['ggsans-MediumItalic'] ??
		main['mediumItalic'] ??
		main['MediumItalic'] ??
		italic

	const semiBoldItalic =
		main['ggsans-SemiBoldItalic'] ??
		main['semiboldItalic'] ??
		main['SemiBoldItalic'] ??
		mediumItalic

	const boldItalic =
		main['ggsans-BoldItalic'] ??
		main['boldItalic'] ??
		main['BoldItalic'] ??
		semiBoldItalic

	const code =
		main['ggmono-Normal'] ??
		main['SourceCodePro-Normal'] ??
		main['code'] ??
		main['mono'] ??
		main['monospace'] ??
		regular

	const codeBold =
		main['ggmono-Bold'] ??
		main['SourceCodePro-Bold'] ??
		main['codeBold'] ??
		code ??
		bold

	if (regular) {
		expanded['ggsans-Normal'] ??= regular
		expanded['ggsans'] ??= regular
		expanded['NotoSans-Normal'] ??= regular
		expanded['sans-serif'] ??= regular
	}
	if (italic) {
		expanded['ggsans-NormalItalic'] ??= italic
		expanded['NotoSans-NormalItalic'] ??= italic
	}
	if (medium) {
		expanded['ggsans-Medium'] ??= medium
		expanded['NotoSans-Medium'] ??= medium
		expanded['sans-serif-medium'] ??= medium
	}
	if (mediumItalic) {
		expanded['ggsans-MediumItalic'] ??= mediumItalic
		expanded['NotoSans-MediumItalic'] ??= mediumItalic
	}
	if (semiBold) {
		expanded['ggsans-SemiBold'] ??= semiBold
		expanded['ggsans-Semibold'] ??= semiBold
		expanded['NotoSans-Semibold'] ??= semiBold
	}
	if (semiBoldItalic) {
		expanded['ggsans-SemiBoldItalic'] ??= semiBoldItalic
	}
	if (bold) {
		expanded['ggsans-Bold'] ??= bold
		expanded['ggsans_bold'] ??= bold
		expanded['NotoSans-Bold'] ??= bold
		expanded['headline'] ??= bold
		expanded['ABCGintoDiscordNord-Bold'] ??= bold
	}
	if (boldItalic) {
		expanded['ggsans-BoldItalic'] ??= boldItalic
		expanded['ABCGintoDiscordNord-BoldItalic'] ??= boldItalic
		expanded['ABCGintoDiscordNord-BlackItalic'] ??= boldItalic
	}
	if (extraBold) {
		expanded['ggsans-ExtraBold'] ??= extraBold
		expanded['NotoSans-ExtraBold'] ??= extraBold
		expanded['ABCGintoNord-ExtraBold'] ??= extraBold
	}
	if (code) {
		expanded['ggmono-Normal'] ??= code
		expanded['SourceCodePro-Normal'] ??= code
		expanded['code'] ??= code
	}
	if (codeBold) {
		expanded['ggmono-Bold'] ??= codeBold
		expanded['SourceCodePro-Bold'] ??= codeBold
	}

	return expanded
}

export function writeCurrentThemeToNative(theme: InstalledTheme | null): void {
	const nfs = getNativeFs()
	if (!nfs) return
	const path = getCurrentThemePath()
	try {
		if (theme) {
			const rawColors = theme.data.rawColors ?? {}
			const normalizedSemantic = normalizeSemanticColorsForNative(
				theme.data.semanticColors,
				rawColors,
			)
			const normalizedRaw = normalizeRawColorsForNative(rawColors)

			const payload = {
				id: theme.id,
				selected: true,
				data: {
					name: theme.data.name,
					description: theme.data.description ?? '',
					version: theme.data.version,
					authors: theme.data.authors ?? [{ name: 'Unknown' }],
					spec: Number(theme.data.spec ?? 2),
					semanticColors: normalizedSemantic,
					rawColors: normalizedRaw,
					background: theme.data.background,
					fonts: theme.data.fonts,
				},
			}
			nfs.writeFileSync(path, JSON.stringify(payload, null, 2))
		} else {
			try {
				nfs.unlinkSync(path)
			} catch {}
		}
	} catch (e) {
		console.error('[Themeify] Failed to write current-theme.json to native fs', e)
	}
}

export function writeFontToNative(font: FontDefinition | null): void {
	const nfs = getNativeFs()
	if (!nfs) return
	const path = getFontsJsonPath()
	try {
		if (font) {
			const expandedMain = expandFontMappingsForNative(font.main)
			const payload = {
				name: font.name,
				spec: 1,
				description: font.description ?? '',
				previewText: font.previewText ?? '',
				source: font.source ?? '',
				main: expandedMain,
			}
			nfs.writeFileSync(path, JSON.stringify(payload, null, 2))
		} else {
			try {
				nfs.unlinkSync(path)
			} catch {}
		}
	} catch (e) {
		console.error('[Themeify] Failed to write fonts.json to native fs', e)
	}
}
