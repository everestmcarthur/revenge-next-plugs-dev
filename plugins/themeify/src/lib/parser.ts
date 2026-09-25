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

export const SEMANTIC_FALLBACKS: Record<string, string[]> = {
	TEXT_DEFAULT: ['TEXT_NORMAL', 'TEXT_PRIMARY', 'HEADER_PRIMARY'],
	TEXT_MUTED: ['TEXT_MUTED', 'TEXT_SECONDARY', 'HEADER_SECONDARY', 'INTERACTIVE_MUTED'],
	BACKGROUND_BASE_LOWEST: [
		'BACKGROUND_BASE_LOWEST',
		'BG_BASE_TERTIARY',
		'BACKGROUND_SECONDARY_ALT',
		'BACKGROUND_TERTIARY',
		'BACKGROUND_MOBILE_SECONDARY',
		'BACKGROUND_PRIMARY',
		'BACKGROUND_MOBILE_PRIMARY',
		'CHAT_BACKGROUND',
	],
	BACKGROUND_BASE_LOWER: [
		'BACKGROUND_BASE_LOWER',
		'BG_BASE_SECONDARY',
		'BACKGROUND_SECONDARY',
		'BACKGROUND_MOBILE_PRIMARY',
		'BACKGROUND_PRIMARY',
	],
	BACKGROUND_BASE_LOW: [
		'BACKGROUND_BASE_LOW',
		'BG_BASE_PRIMARY',
		'BACKGROUND_PRIMARY',
		'BACKGROUND_MOBILE_PRIMARY',
	],
	BACKGROUND_SURFACE_HIGH: [
		'BACKGROUND_SURFACE_HIGH',
		'BACKGROUND_FLOATING',
		'CARD_PRIMARY_BG',
		'BACKGROUND_SECONDARY',
	],
	BACKGROUND_SURFACE_HIGHEST: [
		'BACKGROUND_SURFACE_HIGHEST',
		'BACKGROUND_FLOATING',
		'CARD_SECONDARY_BG',
		'BACKGROUND_SECONDARY_ALT',
	],
	BACKGROUND_MOD_NORMAL: ['BACKGROUND_MODIFIER_ACTIVE', 'BACKGROUND_MODIFIER_HOVER'],
	BACKGROUND_MOD_SUBTLE: ['BACKGROUND_MODIFIER_ACCENT', 'BACKGROUND_MODIFIER_SELECTED'],
	BACKGROUND_MOD_STRONG: ['BACKGROUND_MODIFIER_ACTIVE'],
	CHAT_BACKGROUND: ['CHAT_BACKGROUND', 'BACKGROUND_PRIMARY', 'BACKGROUND_MOBILE_PRIMARY', 'BG_BASE_PRIMARY'],
	CHANNELTEXTAREA_BACKGROUND: ['CHANNELTEXTAREA_BACKGROUND', 'REDESIGN_CHAT_INPUT_BACKGROUND', 'BACKGROUND_TERTIARY'],
	HEADER_PRIMARY: ['HEADER_PRIMARY', 'TEXT_DEFAULT', 'TEXT_NORMAL', 'TEXT_PRIMARY'],
	HEADER_SECONDARY: ['HEADER_SECONDARY', 'TEXT_MUTED', 'TEXT_SECONDARY'],
	INTERACTIVE_NORMAL: ['INTERACTIVE_NORMAL', 'TEXT_DEFAULT', 'TEXT_NORMAL', 'HEADER_PRIMARY'],
	INTERACTIVE_ACTIVE: ['INTERACTIVE_ACTIVE', 'TEXT_DEFAULT', 'TEXT_NORMAL', 'HEADER_PRIMARY'],
	INTERACTIVE_HOVER: ['INTERACTIVE_HOVER', 'INTERACTIVE_NORMAL'],
	INTERACTIVE_MUTED: ['INTERACTIVE_MUTED', 'TEXT_MUTED'],
}

export const RAW_COLOR_ALIASES: Record<string, string[]> = {
	NEUTRAL_1: ['PRIMARY_100', 'WHITE_500'],
	NEUTRAL_2: ['PRIMARY_200', 'WHITE_500'],
	NEUTRAL_4: ['PRIMARY_300', 'PRIMARY_330'],
	NEUTRAL_5: ['PRIMARY_300', 'PRIMARY_360', 'TEXT_NORMAL'],
	NEUTRAL_10: ['PRIMARY_400'],
	NEUTRAL_20: ['PRIMARY_500'],
	NEUTRAL_30: ['PRIMARY_530'],
	NEUTRAL_40: ['PRIMARY_560'],
	NEUTRAL_50: ['PRIMARY_600'],
	NEUTRAL_60: ['PRIMARY_630'],
	NEUTRAL_70: ['PRIMARY_660'],
	NEUTRAL_73: ['PRIMARY_660', 'PLUM_21'],
	NEUTRAL_80: ['PRIMARY_700', 'PRIMARY_730'],
	NEUTRAL_86: ['PRIMARY_800', 'PLUM_24'],
	NEUTRAL_90: ['PRIMARY_800', 'PLUM_24'],
	NEUTRAL_92: ['PRIMARY_800', 'PLUM_18', 'PLUM_25'],
	NEUTRAL_95: ['PRIMARY_800', 'PLUM_22', 'PLUM_25'],
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

	// Fill modern token fallbacks if not explicitly provided
	for (const [modernToken, fallbacks] of Object.entries(SEMANTIC_FALLBACKS)) {
		if (!semantic[modernToken]) {
			for (const fb of fallbacks) {
				if (semantic[fb]) {
					semantic[modernToken] = semantic[fb]
					break
				}
			}
		}
	}

	// Fill modern raw color aliases (NEUTRAL_xxx) if not explicitly provided
	for (const [neutralKey, aliases] of Object.entries(RAW_COLOR_ALIASES)) {
		if (!normalizedRaw[neutralKey]) {
			for (const alias of aliases) {
				if (normalizedRaw[alias]) {
					normalizedRaw[neutralKey] = normalizedRaw[alias]
					break
				}
			}
		}
	}

	return {
		semantic,
		raw: normalizedRaw,
		reference,
	}
}

