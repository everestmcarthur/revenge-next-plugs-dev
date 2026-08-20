import { Platform, processColor } from 'react-native'
import type {
	BunnyColorManifest,
	ColorManifest,
	VendettaThemeManifest,
} from '../types'

export function normalizeToHex(
	colorString: string | undefined,
): string | undefined {
	if (colorString === undefined) return undefined
	const processed = Number(processColor(colorString))
	if (Number.isNaN(processed)) return undefined

	const a = (processed >>> 24) & 0xff
	const r = (processed >>> 16) & 0xff
	const g = (processed >>> 8) & 0xff
	const b = processed & 0xff
	const toHex = (n: number) => n.toString(16).padStart(2, '0')

	if (a === 255) return `#${toHex(r)}${toHex(g)}${toHex(b)}`
	return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`
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
		const clean = base.replace('#', '')
		const r = Number.parseInt(clean.slice(0, 2), 16)
		const g = Number.parseInt(clean.slice(2, 4), 16)
		const b = Number.parseInt(clean.slice(4, 6), 16)
		const a = Math.round(alpha * 255)
		const toHex = (n: number) => n.toString(16).padStart(2, '0')
		rawColors[key] = `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`
	}
}

export function processData(data: ColorManifest): ColorManifest {
	if (data.spec === 2) {
		const vendetta = data as VendettaThemeManifest
		if (vendetta.semanticColors) {
			for (const key in vendetta.semanticColors) {
				for (const index in vendetta.semanticColors[key]) {
					const value = vendetta.semanticColors[key][index]
					if (value)
						vendetta.semanticColors[key][index] = normalizeToHex(value) || false
				}
			}
		}
		if (vendetta.rawColors) {
			for (const key in vendetta.rawColors) {
				const normalized = normalizeToHex(vendetta.rawColors[key])
				if (normalized) vendetta.rawColors[key] = normalized
			}
			if (Platform.OS === 'android') applyAndroidAlphaKeys(vendetta.rawColors)
		}
		data.spec ??= 2
		return data
	}

	if (data.spec === 3) {
		const bunny = data as BunnyColorManifest
		if (bunny.main?.raw) {
			for (const key in bunny.main.raw) {
				const normalized = normalizeToHex(bunny.main.raw[key])
				if (normalized) bunny.main.raw[key] = normalized
			}
			if (Platform.OS === 'android') applyAndroidAlphaKeys(bunny.main.raw)
		}
		return data
	}

	throw new Error('Invalid theme spec')
}

export function validateTheme(themeJSON: any): boolean {
	if (typeof themeJSON !== 'object' || themeJSON === null) return false
	if (themeJSON.spec !== 2 && themeJSON.spec !== 3) return false
	if (themeJSON.spec === 3 && !themeJSON.main) return false
	return true
}
