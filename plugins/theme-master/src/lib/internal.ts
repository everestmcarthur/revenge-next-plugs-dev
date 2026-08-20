import { Platform, processColor } from 'react-native'
import type {
	BunnyColorManifest,
	ColorManifest,
	VendettaThemeManifest,
} from '../types'

export interface InternalColorDefinition {
	spec: 2 | 3
	reference: 'darker' | 'light'
	semantic: Record<string, { value: string; opacity: number }>
	raw: Record<string, string>
	background?: { url: string; blur?: number; opacity?: number }
}

export interface ColorModuleShape {
	RawColor: Record<string, string>
	SemanticColor: Record<string, any>
	Theme?: Record<string, string>
	Shadow?: Record<string, Record<string, any>>
	default?: {
		meta?: { resolveSemanticColor?: (...args: any[]) => any }
		internal?: { resolveSemanticColor?: (...args: any[]) => any }
	}
	internal?: {
		isSemanticColor?(token: unknown): boolean
		getSemanticColorName?(token: unknown): string
		resolveSemanticColor?(
			theme: string,
			token: unknown,
			...rest: unknown[]
		): string
	}
}

export const colorRef: {
	current: InternalColorDefinition | null
	origRaw: Record<string, string> | null
	lastReference: 'darker' | 'light'
} = {
	current: null,
	origRaw: null,
	lastReference: 'darker',
}

export function isLightTheme(theme: string) {
	return theme === 'light' || theme.endsWith('light')
}

export function resolveReference(
	type: string | undefined,
	override?: 'auto' | 'dark' | 'light',
): 'darker' | 'light' {
	if (override === 'light') return 'light'
	if (override === 'dark') return 'darker'
	return type === 'light' ? 'light' : 'darker'
}

export function normalizeToHex(
	colorString: string | undefined,
): string | undefined {
	if (colorString === undefined || colorString === '') return undefined
	let processed: number
	try {
		processed = Number(processColor(colorString))
	} catch {
		return undefined
	}
	if (Number.isNaN(processed)) return undefined

	const a = (processed >>> 24) & 0xff
	const r = (processed >>> 16) & 0xff
	const g = (processed >>> 8) & 0xff
	const b = processed & 0xff
	const toHex = (n: number) => n.toString(16).padStart(2, '0')

	if (a === 255) return `#${toHex(r)}${toHex(g)}${toHex(b)}`
	return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`
}

export function applyOpacity(color: string, opacity: number): string {
	const match = color.match(/rgba?\(([^)]+)\)/i)
	if (match) {
		const nums = match[1].split(',').map(s => Number.parseFloat(s.trim()))
		const [r, g, b] = nums
		const a = nums.length > 3 ? nums[3] : 1
		return `rgba(${r}, ${g}, ${b}, ${a * opacity})`
	}

	const hex = color.replace('#', '')
	const r = Number.parseInt(hex.slice(0, 2), 16)
	const g = Number.parseInt(hex.slice(2, 4), 16)
	const b = Number.parseInt(hex.slice(4, 6), 16)
	const a = hex.length >= 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1
	return `rgba(${r}, ${g}, ${b}, ${a * opacity})`
}

function applyAndroidAlphaKeys(rawColors: Record<string, string>) {
	const alphaMap: Record<string, [string, number]> = {
		BLACK_ALPHA_60: ['BLACK', 0.6],
		BRAND_NEW_360_ALPHA_20: ['BRAND_360', 0.2],
		BRAND_NEW_360_ALPHA_25: ['BRAND_360', 0.25],
		BRAND_NEW_500_ALPHA_20: ['BRAND_500', 0.2],
		PRIMARY_DARK_500_ALPHA_20: ['PRIMARY_500', 0.2],
		PRIMARY_DARK_700_ALPHA_60: ['PRIMARY_700', 0.6],
		STATUS_GREEN_500_ALPHA_20: ['GREEN_500', 0.2],
		STATUS_RED_500_ALPHA_20: ['RED_500', 0.2],
	}

	for (const key in alphaMap) {
		const [colorKey, alpha] = alphaMap[key]
		if (!rawColors[colorKey]) continue
		const base = normalizeToHex(rawColors[colorKey])
		if (!base) continue
		rawColors[key] = applyOpacity(base, alpha)
	}
}

function resolveColorValue(
	value: unknown,
	origRaw: Record<string, string>,
): string | undefined {
	const str = typeof value === 'string' ? value : String(value)
	if (!str) return undefined
	if (str.startsWith('#')) return normalizeToHex(str)
	const resolved = origRaw[str]
	if (resolved) return resolved
	return normalizeToHex(str)
}

export function parseColorManifest(
	manifest: ColorManifest,
	origRaw: Record<string, string>,
	overrideThemeType?: 'auto' | 'dark' | 'light',
): InternalColorDefinition {
	const type =
		manifest.spec === 3
			? (manifest as BunnyColorManifest).main?.type
			: undefined
	const reference = resolveReference(type, overrideThemeType)

	if (manifest.spec === 2) {
		const vendetta = manifest as VendettaThemeManifest
		const semantic: InternalColorDefinition['semantic'] = {}

		if (vendetta.semanticColors) {
			for (const key in vendetta.semanticColors) {
				const values = vendetta.semanticColors[key]
					.map(c => c || undefined)
					.slice(0, 2)
				if (!values[0]) continue
				const value = normalizeToHex(values[reference === 'light' ? 1 : 0])
				if (value) semantic[key] = { value, opacity: 1 }
			}
		}

		const raw: Record<string, string> = {}
		if (vendetta.rawColors) {
			for (const key in vendetta.rawColors) {
				const value = normalizeToHex(String(vendetta.rawColors[key]))
				if (value) raw[key] = value
			}
			if (Platform.OS === 'android') applyAndroidAlphaKeys(raw)
		}

		const background = vendetta.background
			? { ...vendetta.background, opacity: vendetta.background.alpha ?? 1 }
			: undefined

		return { spec: 2, reference, semantic, raw, background }
	}

	if (manifest.spec === 3) {
		const bunny = manifest as BunnyColorManifest
		const semantic: InternalColorDefinition['semantic'] = {}

		if (bunny.main?.semantic) {
			for (const [key, rawValue] of Object.entries(bunny.main.semantic)) {
				if (typeof rawValue === 'string') {
					const value = resolveColorValue(rawValue, origRaw)
					if (value) semantic[key] = { value, opacity: 1 }
				} else if (rawValue && typeof rawValue === 'object') {
					const {
						type,
						value: colorValue,
						opacity,
					} = rawValue as {
						type: 'color' | 'raw'
						value: string
						opacity?: number
					}
					let resolved: string | undefined
					if (type === 'color')
						resolved = resolveColorValue(colorValue, origRaw)
					else resolved = resolveColorValue(colorValue, origRaw)
					if (resolved)
						semantic[key] = { value: resolved, opacity: opacity ?? 1 }
				}
			}
		}

		const raw: Record<string, string> = {}
		if (bunny.main?.raw) {
			for (const key in bunny.main.raw) {
				const value = normalizeToHex(String(bunny.main.raw[key]))
				if (value) raw[key] = value
			}
			if (Platform.OS === 'android') applyAndroidAlphaKeys(raw)
		}

		return {
			spec: 3,
			reference,
			semantic,
			raw,
			background: bunny.main?.background,
		}
	}

	throw new Error('Invalid theme spec')
}
