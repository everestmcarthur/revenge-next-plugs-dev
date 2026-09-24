import type { ThemeData, SemanticColorValue } from '../types'

export interface ParsedSemanticColor {
	value: string
	opacity: number
}

export interface ParsedTheme {
	semantic: Record<string, ParsedSemanticColor>
	raw: Record<string, string>
	reference: 'dark' | 'darker' | 'midnight' | 'light'
}

export function parseHexColor(input: string): { hex: string; alpha: number } | null {
	if (!input || typeof input !== 'string') return null
	const str = input.trim()

	if (str === 'transparent') {
		return { hex: '#000000', alpha: 0 }
	}

	if (str.startsWith('#')) {
		const raw = str.slice(1)
		if (raw.length === 3) {
			const r = raw[0] + raw[0]
			const g = raw[1] + raw[1]
			const b = raw[2] + raw[2]
			return { hex: `#${r}${g}${b}`, alpha: 1 }
		}
		if (raw.length === 4) {
			const r = raw[0] + raw[0]
			const g = raw[1] + raw[1]
			const b = raw[2] + raw[2]
			const a = Number.parseInt(raw[3] + raw[3], 16) / 255
			return { hex: `#${r}${g}${b}`, alpha: a }
		}
		if (raw.length === 6) {
			return { hex: `#${raw}`, alpha: 1 }
		}
		if (raw.length === 8) {
			const hex = `#${raw.slice(0, 6)}`
			const a = Number.parseInt(raw.slice(6, 8), 16) / 255
			return { hex, alpha: a }
		}
	}

	const rgbaMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i)
	if (rgbaMatch) {
		const r = Number.parseInt(rgbaMatch[1], 10).toString(16).padStart(2, '0')
		const g = Number.parseInt(rgbaMatch[2], 10).toString(16).padStart(2, '0')
		const b = Number.parseInt(rgbaMatch[3], 10).toString(16).padStart(2, '0')
		const a = rgbaMatch[4] !== undefined ? Number.parseFloat(rgbaMatch[4]) : 1
		return { hex: `#${r}${g}${b}`, alpha: Math.max(0, Math.min(1, a)) }
	}

	return null
}

export function applyOpacity(hex: string, opacity: number): string {
	const clamped = Math.max(0, Math.min(1, opacity))
	const parsed = parseHexColor(hex)
	if (!parsed) return hex

	const finalAlpha = Math.round(parsed.alpha * clamped * 255)
	if (finalAlpha >= 255) return parsed.hex
	const alphaHex = finalAlpha.toString(16).padStart(2, '0')
	return `${parsed.hex}${alphaHex}`
}

function resolveColorString(
	val: string,
	rawColors: Record<string, string>,
	origRawColors: Record<string, string>,
): { hex: string; alpha: number } | null {
	if (!val || typeof val !== 'string') return null
	const trimmed = val.trim()

	const direct = parseHexColor(trimmed)
	if (direct) return direct

	const upper = trimmed.toUpperCase()
	const rawVal = rawColors[upper] ?? origRawColors[upper]
	if (rawVal) {
		return parseHexColor(rawVal)
	}

	return null
}

export function extractColorForTheme(
	val: SemanticColorValue,
	themeType: 'dark' | 'darker' | 'midnight' | 'light',
	rawColors: Record<string, string>,
	origRawColors: Record<string, string>,
): ParsedSemanticColor | null {
	if (!val) return null

	if (typeof val === 'string') {
		const resolved = resolveColorString(val, rawColors, origRawColors)
		if (resolved) return { value: resolved.hex, opacity: resolved.alpha }
		return null
	}

	if (Array.isArray(val)) {
		let chosen: string | undefined
		if (themeType === 'light') {
			chosen = val[1] ?? val[0]
		} else if (themeType === 'darker') {
			chosen = val[2] ?? val[0]
		} else if (themeType === 'midnight') {
			chosen = val[3] ?? val[2] ?? val[0]
		} else {
			chosen = val[0]
		}
		if (chosen) {
			const resolved = resolveColorString(chosen, rawColors, origRawColors)
			if (resolved) return { value: resolved.hex, opacity: resolved.alpha }
		}
		return null
	}

	if (typeof val === 'object') {
		const targetVal = val[themeType] ?? (themeType !== 'light' ? (val.darker ?? val.dark ?? val.midnight) : val.light)
		if (targetVal) {
			const resolved = resolveColorString(targetVal, rawColors, origRawColors)
			if (resolved) return { value: resolved.hex, opacity: resolved.alpha }
		}
	}

	return null
}

export function parseTheme(
	data: ThemeData,
	origRawColors: Record<string, string> = {},
	overrideThemeType?: 'auto' | 'dark' | 'darker' | 'midnight' | 'light',
): ParsedTheme {
	const normalizedRaw: Record<string, string> = {}
	if (data.rawColors) {
		for (const [k, v] of Object.entries(data.rawColors)) {
			if (typeof v === 'string') {
				const parsed = parseHexColor(v)
				if (parsed) {
					normalizedRaw[k.toUpperCase()] = v
				}
			}
		}
	}

	let reference: 'dark' | 'darker' | 'midnight' | 'light' = 'darker'
	if (overrideThemeType && overrideThemeType !== 'auto') {
		reference = overrideThemeType
	}

	const semantic: Record<string, ParsedSemanticColor> = {}

	if (data.semanticColors) {
		for (const [tokenName, tokenValue] of Object.entries(data.semanticColors)) {
			const upperKey = tokenName.toUpperCase()
			const parsed = extractColorForTheme(tokenValue, reference, normalizedRaw, origRawColors)
			if (parsed) {
				semantic[upperKey] = parsed
			}
		}
	}

	return {
		semantic,
		raw: normalizedRaw,
		reference,
	}
}
