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

export function toScreamingSnake(str: string): string {
	if (!str || typeof str !== 'string') return ''
	return str
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[-\s.]+/g, '_')
		.toUpperCase()
}

export function parseHexColor(input: string): { hex: string; alpha: number } | null {
	if (!input || typeof input !== 'string') return null
	const str = input.trim()

	if (str.toLowerCase() === 'transparent') {
		return { hex: '#000000', alpha: 0 }
	}

	if (str.startsWith('#')) {
		const raw = str.slice(1)
		if (raw.length === 3) {
			const r = raw[0] + raw[0]
			const g = raw[1] + raw[1]
			const b = raw[2] + raw[2]
			return { hex: `#${r}${g}${b}`.toLowerCase(), alpha: 1 }
		}
		if (raw.length === 4) {
			const r = raw[0] + raw[0]
			const g = raw[1] + raw[1]
			const b = raw[2] + raw[2]
			const a = Number.parseInt(raw[3] + raw[3], 16) / 255
			return { hex: `#${r}${g}${b}`.toLowerCase(), alpha: a }
		}
		if (raw.length === 6) {
			return { hex: `#${raw}`.toLowerCase(), alpha: 1 }
		}
		if (raw.length === 8) {
			const hex = `#${raw.slice(0, 6)}`.toLowerCase()
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
		return { hex: `#${r}${g}${b}`.toLowerCase(), alpha: Math.max(0, Math.min(1, a)) }
	}

	return null
}

export function formatHexForNative(
	val: string,
	rawColors: Record<string, string> = {},
): string | null {
	if (!val || typeof val !== 'string') return null
	const trimmed = val.trim()
	if (trimmed.toLowerCase() === 'transparent') return '#00000000'

	let candidate = trimmed
	if (!trimmed.startsWith('#') && !trimmed.startsWith('rgb')) {
		const upper = trimmed.toUpperCase()
		const lower = trimmed.toLowerCase()
		const resolved = rawColors[upper] ?? rawColors[lower]
		if (resolved) candidate = resolved
		else return null
	}

	const parsed = parseHexColor(candidate)
	if (!parsed) return null

	if (parsed.alpha >= 0.999) {
		return parsed.hex.toLowerCase()
	}
	const alphaHex = Math.round(parsed.alpha * 255)
		.toString(16)
		.padStart(2, '0')
		.toLowerCase()
	return `${parsed.hex}${alphaHex}`.toLowerCase()
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
		const targetVal =
			val[themeType] ??
			(themeType !== 'light'
				? val.darker ?? val.dark ?? val.midnight
				: val.light)
		if (targetVal) {
			const resolved = resolveColorString(targetVal, rawColors, origRawColors)
			if (resolved) return { value: resolved.hex, opacity: resolved.alpha }
		}
	}

	return null
}

export const SEMANTIC_FALLBACKS: Record<string, string[]> = {
	// Text
	TEXT_DEFAULT: ['TEXT_NORMAL', 'TEXT_PRIMARY', 'HEADER_PRIMARY'],
	TEXT_NORMAL: ['TEXT_DEFAULT', 'TEXT_PRIMARY', 'HEADER_PRIMARY'],
	TEXT_MUTED: ['TEXT_MUTED', 'TEXT_SECONDARY', 'HEADER_SECONDARY', 'INTERACTIVE_MUTED'],
	TEXT_SECONDARY: ['TEXT_MUTED', 'TEXT_SECONDARY', 'HEADER_SECONDARY'],
	TEXT_STRONG: ['HEADER_PRIMARY', 'TEXT_DEFAULT', 'TEXT_NORMAL'],
	TEXT_SUBTLE: ['TEXT_MUTED', 'TEXT_SECONDARY'],
	TEXT_BRAND: ['BRAND_500', 'BLURPLE_50', 'TEXT_LINK'],
	TEXT_LINK: ['TEXT_LINK', 'TEXT_BRAND', 'BRAND_500'],
	HEADER_PRIMARY: ['HEADER_PRIMARY', 'TEXT_DEFAULT', 'TEXT_NORMAL'],
	HEADER_SECONDARY: ['HEADER_SECONDARY', 'TEXT_MUTED', 'TEXT_SECONDARY'],

	// Backgrounds
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
		'CHAT_BACKGROUND',
	],
	BACKGROUND_SURFACE_HIGH: [
		'BACKGROUND_SURFACE_HIGH',
		'BG_SURFACE_OVERLAY',
		'CARD_PRIMARY_BG',
		'BACKGROUND_FLOATING',
		'BACKGROUND_SECONDARY',
	],
	BACKGROUND_SURFACE_HIGHEST: [
		'BACKGROUND_SURFACE_HIGHEST',
		'CARD_SECONDARY_BG',
		'BACKGROUND_FLOATING',
		'BACKGROUND_SECONDARY_ALT',
	],
	BACKGROUND_PRIMARY: [
		'BACKGROUND_PRIMARY',
		'BACKGROUND_BASE_LOW',
		'BG_BASE_PRIMARY',
		'BACKGROUND_BASE_LOWEST',
		'CHAT_BACKGROUND',
	],
	BACKGROUND_SECONDARY: [
		'BACKGROUND_SECONDARY',
		'BACKGROUND_BASE_LOWER',
		'BG_BASE_SECONDARY',
		'BACKGROUND_BASE_LOW',
		'CARD_PRIMARY_BG',
	],
	BACKGROUND_SECONDARY_ALT: [
		'BACKGROUND_SECONDARY_ALT',
		'BACKGROUND_BASE_LOWEST',
		'BG_BASE_TERTIARY',
		'CARD_SECONDARY_BG',
	],
	BACKGROUND_TERTIARY: [
		'BACKGROUND_TERTIARY',
		'BACKGROUND_BASE_LOWEST',
		'BG_BASE_TERTIARY',
		'BACKGROUND_SECONDARY_ALT',
	],
	BACKGROUND_FLOATING: [
		'BACKGROUND_FLOATING',
		'BACKGROUND_SURFACE_HIGH',
		'BACKGROUND_SURFACE_HIGHEST',
		'BACKGROUND_SECONDARY',
	],
	BACKGROUND_MOBILE_PRIMARY: [
		'BACKGROUND_MOBILE_PRIMARY',
		'BACKGROUND_BASE_LOW',
		'BACKGROUND_PRIMARY',
		'CHAT_BACKGROUND',
	],
	BACKGROUND_MOBILE_SECONDARY: [
		'BACKGROUND_MOBILE_SECONDARY',
		'BACKGROUND_BASE_LOWER',
		'BACKGROUND_SECONDARY',
	],
	BACKGROUND_ACCENT: [
		'BACKGROUND_ACCENT',
		'BACKGROUND_MOD_NORMAL',
		'BACKGROUND_MODIFIER_ACTIVE',
	],

	// Cards & Panels
	CARD_PRIMARY_BG: [
		'CARD_PRIMARY_BG',
		'CARD_BACKGROUND_DEFAULT',
		'BACKGROUND_SURFACE_HIGH',
		'BACKGROUND_SECONDARY',
	],
	CARD_SECONDARY_BG: [
		'CARD_SECONDARY_BG',
		'CARD_SECONDARY_BACKGROUND_DEFAULT',
		'BACKGROUND_SURFACE_HIGHEST',
		'BACKGROUND_SECONDARY_ALT',
	],
	CARD_MUTED_BG: ['CARD_MUTED_BG', 'BACKGROUND_BASE_LOWEST', 'BACKGROUND_TERTIARY'],
	PANEL_BG: ['PANEL_BG', 'BACKGROUND_BASE_LOW', 'BACKGROUND_SECONDARY', 'BACKGROUND_PRIMARY'],

	// Chat & Input
	CHAT_BACKGROUND: [
		'CHAT_BACKGROUND',
		'BACKGROUND_BASE_LOW',
		'BG_BASE_PRIMARY',
		'BACKGROUND_PRIMARY',
		'BACKGROUND_MOBILE_PRIMARY',
	],
	CHANNELTEXTAREA_BACKGROUND: [
		'CHANNELTEXTAREA_BACKGROUND',
		'REDESIGN_CHAT_INPUT_BACKGROUND',
		'CHAT_INPUT_BACKGROUND',
		'MOBILE_CHATINPUT_BACKGROUND_DEFAULT',
		'BACKGROUND_TERTIARY',
		'BACKGROUND_BASE_LOWEST',
	],
	REDESIGN_CHAT_INPUT_BACKGROUND: [
		'REDESIGN_CHAT_INPUT_BACKGROUND',
		'CHANNELTEXTAREA_BACKGROUND',
		'CHAT_INPUT_BACKGROUND',
		'MOBILE_CHATINPUT_BACKGROUND_DEFAULT',
		'BACKGROUND_TERTIARY',
	],
	CHAT_INPUT_BACKGROUND: [
		'CHAT_INPUT_BACKGROUND',
		'REDESIGN_CHAT_INPUT_BACKGROUND',
		'CHANNELTEXTAREA_BACKGROUND',
		'MOBILE_CHATINPUT_BACKGROUND_DEFAULT',
		'BACKGROUND_TERTIARY',
	],
	MOBILE_CHATINPUT_BACKGROUND_DEFAULT: [
		'MOBILE_CHATINPUT_BACKGROUND_DEFAULT',
		'REDESIGN_CHAT_INPUT_BACKGROUND',
		'CHANNELTEXTAREA_BACKGROUND',
		'CHAT_INPUT_BACKGROUND',
	],

	// Modifiers
	BACKGROUND_MOD_NORMAL: ['BACKGROUND_MODIFIER_ACTIVE', 'BACKGROUND_MODIFIER_HOVER'],
	BACKGROUND_MOD_SUBTLE: ['BACKGROUND_MODIFIER_ACCENT', 'BACKGROUND_MODIFIER_SELECTED'],
	BACKGROUND_MOD_STRONG: ['BACKGROUND_MODIFIER_ACTIVE'],
	BACKGROUND_MOD_MUTED: ['BACKGROUND_MODIFIER_ACCENT', 'BACKGROUND_MOD_SUBTLE'],
	BACKGROUND_MODIFIER_HOVER: ['BACKGROUND_MODIFIER_HOVER', 'BACKGROUND_MOD_NORMAL'],
	BACKGROUND_MODIFIER_ACTIVE: ['BACKGROUND_MODIFIER_ACTIVE', 'BACKGROUND_MOD_STRONG', 'BACKGROUND_MOD_NORMAL'],
	BACKGROUND_MODIFIER_SELECTED: ['BACKGROUND_MODIFIER_SELECTED', 'BACKGROUND_MOD_SUBTLE'],
	BACKGROUND_MODIFIER_ACCENT: ['BACKGROUND_MODIFIER_ACCENT', 'BACKGROUND_MOD_SUBTLE'],

	// Interactive
	INTERACTIVE_NORMAL: [
		'INTERACTIVE_NORMAL',
		'INTERACTIVE_TEXT_DEFAULT',
		'INTERACTIVE_ICON_DEFAULT',
		'TEXT_DEFAULT',
		'TEXT_NORMAL',
	],
	INTERACTIVE_HOVER: [
		'INTERACTIVE_HOVER',
		'INTERACTIVE_TEXT_HOVER',
		'INTERACTIVE_ICON_HOVER',
		'INTERACTIVE_NORMAL',
		'TEXT_DEFAULT',
	],
	INTERACTIVE_ACTIVE: [
		'INTERACTIVE_ACTIVE',
		'INTERACTIVE_TEXT_ACTIVE',
		'INTERACTIVE_ICON_ACTIVE',
		'HEADER_PRIMARY',
		'TEXT_DEFAULT',
	],
	INTERACTIVE_MUTED: ['INTERACTIVE_MUTED', 'TEXT_MUTED', 'TEXT_SECONDARY'],
	INTERACTIVE_TEXT_DEFAULT: ['INTERACTIVE_TEXT_DEFAULT', 'INTERACTIVE_NORMAL', 'TEXT_DEFAULT', 'TEXT_NORMAL'],
	INTERACTIVE_TEXT_HOVER: ['INTERACTIVE_TEXT_HOVER', 'INTERACTIVE_HOVER', 'INTERACTIVE_ACTIVE'],
	INTERACTIVE_TEXT_ACTIVE: ['INTERACTIVE_TEXT_ACTIVE', 'INTERACTIVE_ACTIVE', 'HEADER_PRIMARY'],
	INTERACTIVE_ICON_DEFAULT: ['INTERACTIVE_ICON_DEFAULT', 'ICON_DEFAULT', 'INTERACTIVE_NORMAL'],
	INTERACTIVE_ICON_HOVER: ['INTERACTIVE_ICON_HOVER', 'ICON_DEFAULT', 'INTERACTIVE_HOVER'],
	INTERACTIVE_ICON_ACTIVE: ['INTERACTIVE_ICON_ACTIVE', 'ICON_STRONG', 'INTERACTIVE_ACTIVE'],

	// Channels & Navigation
	CHANNELS_DEFAULT: ['CHANNELS_DEFAULT', 'INTERACTIVE_NORMAL', 'TEXT_MUTED', 'TEXT_DEFAULT'],
	REDESIGN_CHANNEL_NAME_TEXT: ['REDESIGN_CHANNEL_NAME_TEXT', 'CHANNELS_DEFAULT', 'INTERACTIVE_NORMAL', 'TEXT_DEFAULT'],
	REDESIGN_CHANNEL_NAME_MUTED_TEXT: ['REDESIGN_CHANNEL_NAME_MUTED_TEXT', 'TEXT_MUTED', 'INTERACTIVE_MUTED'],
	TAB_BAR_BACKGROUND: ['TAB_BAR_BACKGROUND', 'BACKGROUND_BASE_LOWEST', 'BACKGROUND_TERTIARY', 'BACKGROUND_PRIMARY'],
	ANDROID_NAVIGATION_BAR_BACKGROUND: ['ANDROID_NAVIGATION_BAR_BACKGROUND', 'TAB_BAR_BACKGROUND', 'BACKGROUND_BASE_LOWEST'],
}

export const RAW_COLOR_ALIASES: Record<string, string[]> = {
	// NEUTRAL -> PRIMARY / PLUM / WHITE / BLACK
	NEUTRAL_1: ['PRIMARY_100', 'WHITE_500', 'WHITE'],
	NEUTRAL_2: ['PRIMARY_200', 'WHITE_500'],
	NEUTRAL_3: ['PRIMARY_200'],
	NEUTRAL_4: ['PRIMARY_300', 'PRIMARY_330'],
	NEUTRAL_5: ['PRIMARY_300', 'PRIMARY_360'],
	NEUTRAL_10: ['PRIMARY_400'],
	NEUTRAL_20: ['PRIMARY_500'],
	NEUTRAL_30: ['PRIMARY_530'],
	NEUTRAL_40: ['PRIMARY_560'],
	NEUTRAL_50: ['PRIMARY_600'],
	NEUTRAL_60: ['PRIMARY_630'],
	NEUTRAL_66: ['PRIMARY_630', 'PRIMARY_660'],
	NEUTRAL_69: ['PRIMARY_660'],
	NEUTRAL_70: ['PRIMARY_660'],
	NEUTRAL_72: ['PRIMARY_660'],
	NEUTRAL_73: ['PRIMARY_660', 'PLUM_21'],
	NEUTRAL_74: ['PRIMARY_630', 'PLUM_17'],
	NEUTRAL_80: ['PRIMARY_700', 'PRIMARY_730'],
	NEUTRAL_82: ['PRIMARY_700', 'PLUM_20'],
	NEUTRAL_83: ['PRIMARY_700', 'PLUM_20'],
	NEUTRAL_86: ['PRIMARY_730', 'PRIMARY_800', 'PLUM_24'],
	NEUTRAL_90: ['PRIMARY_800', 'PLUM_24'],
	NEUTRAL_92: ['PRIMARY_800', 'PLUM_18', 'PLUM_24', 'PLUM_25'],
	NEUTRAL_95: ['PRIMARY_830', 'PLUM_22', 'PLUM_25'],
	NEUTRAL_97: ['PRIMARY_860', 'PLUM_26'],
	NEUTRAL_99: ['PRIMARY_900'],
	NEUTRAL_100: ['BLACK_500', 'BLACK'],

	// PRIMARY -> NEUTRAL / PLUM
	PRIMARY_100: ['NEUTRAL_1', 'NEUTRAL_2', 'WHITE_500'],
	PRIMARY_200: ['NEUTRAL_2', 'NEUTRAL_3'],
	PRIMARY_300: ['NEUTRAL_4', 'NEUTRAL_5'],
	PRIMARY_330: ['NEUTRAL_4'],
	PRIMARY_360: ['NEUTRAL_5', 'NEUTRAL_10'],
	PRIMARY_400: ['NEUTRAL_10'],
	PRIMARY_500: ['NEUTRAL_20'],
	PRIMARY_530: ['NEUTRAL_30'],
	PRIMARY_560: ['NEUTRAL_40'],
	PRIMARY_600: ['NEUTRAL_66', 'NEUTRAL_70', 'NEUTRAL_72', 'PLUM_16'],
	PRIMARY_630: ['NEUTRAL_74', 'NEUTRAL_60', 'PLUM_17'],
	PRIMARY_660: ['NEUTRAL_70', 'NEUTRAL_73', 'PLUM_19', 'PLUM_21'],
	PRIMARY_700: ['NEUTRAL_82', 'NEUTRAL_83', 'NEUTRAL_80', 'PLUM_20'],
	PRIMARY_730: ['NEUTRAL_86', 'PLUM_21'],
	PRIMARY_800: ['NEUTRAL_90', 'NEUTRAL_92', 'PLUM_24'],
	PRIMARY_830: ['NEUTRAL_95', 'PLUM_25'],
	PRIMARY_860: ['NEUTRAL_97', 'PLUM_26'],
	PRIMARY_900: ['NEUTRAL_99', 'NEUTRAL_100', 'BLACK_500'],

	// PLUM -> NEUTRAL / PRIMARY
	PLUM_16: ['PRIMARY_600', 'NEUTRAL_66'],
	PLUM_17: ['PRIMARY_630', 'NEUTRAL_74'],
	PLUM_18: ['PRIMARY_700', 'NEUTRAL_82'],
	PLUM_19: ['PRIMARY_660', 'NEUTRAL_70'],
	PLUM_20: ['PRIMARY_700', 'NEUTRAL_83'],
	PLUM_21: ['PRIMARY_730', 'NEUTRAL_86'],
	PLUM_22: ['PRIMARY_800', 'NEUTRAL_90'],
	PLUM_23: ['PRIMARY_800', 'NEUTRAL_92'],
	PLUM_24: ['PRIMARY_800', 'NEUTRAL_92', 'NEUTRAL_86'],
	PLUM_25: ['PRIMARY_830', 'NEUTRAL_95'],
	PLUM_26: ['PRIMARY_860', 'NEUTRAL_97'],

	// WHITE & BLACK
	WHITE: ['WHITE_500', 'NEUTRAL_1'],
	WHITE_500: ['WHITE', 'NEUTRAL_1'],
	BLACK: ['BLACK_500', 'NEUTRAL_100'],
	BLACK_500: ['BLACK', 'NEUTRAL_100'],
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
			const upperKey = toScreamingSnake(tokenName)
			const parsed = extractColorForTheme(tokenValue, reference, normalizedRaw, origRawColors)
			if (parsed) {
				semantic[upperKey] = parsed
			}
		}
	}

	// Fill semantic fallbacks bidirectionally if not explicitly provided
	for (const [token, fallbacks] of Object.entries(SEMANTIC_FALLBACKS)) {
		if (!semantic[token]) {
			for (const fb of fallbacks) {
				if (semantic[fb]) {
					semantic[token] = semantic[fb]
					break
				}
			}
		}
	}

	// Fill raw color aliases bidirectionally if not explicitly provided
	for (const [key, aliases] of Object.entries(RAW_COLOR_ALIASES)) {
		if (!normalizedRaw[key]) {
			for (const alias of aliases) {
				if (normalizedRaw[alias]) {
					normalizedRaw[key] = normalizedRaw[alias]
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
