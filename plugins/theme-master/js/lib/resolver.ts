import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'

interface ColorModuleShape {
	colors: Record<string, unknown>
	unsafe_rawColors: Record<string, unknown>
	internal: {
		isSemanticColor(token: unknown): boolean
		getSemanticColorName(token: unknown): string
		resolveSemanticColor(theme: string, token: unknown, ...rest: unknown[]): string
	}
}

let colorModule: ColorModuleShape | undefined
let originalResolve: ColorModuleShape['internal']['resolveSemanticColor'] | undefined
const tokenMap = new Map<string, string>()

function unwrap(mod: any): ColorModuleShape {
	return mod?.default ?? mod
}

function applyOpacity(color: string, opacity: number): string {
	let r: number
	let g: number
	let b: number
	let a = 1
	const match = color.match(/rgba?\(([^)]+)\)/i)
	if (match) {
		const nums = match[1].split(',').map(s => Number.parseFloat(s.trim()))
		;[r, g, b] = nums
		if (nums.length > 3) a = nums[3]
	} else {
		const hex = color.replace('#', '')
		r = Number.parseInt(hex.slice(0, 2), 16)
		g = Number.parseInt(hex.slice(2, 4), 16)
		b = Number.parseInt(hex.slice(4, 6), 16)
		if (hex.length >= 8) a = Number.parseInt(hex.slice(6, 8), 16) / 255
	}
	if ([r, g, b].some(Number.isNaN)) return color
	return `rgba(${r}, ${g}, ${b}, ${a * opacity})`
}

export function setTokenOverrides(overrides: Record<string, string>) {
	tokenMap.clear()
	for (const [name, hex] of Object.entries(overrides)) tokenMap.set(name, hex)
}

export function allTokenNames(): string[] {
	return colorModule ? Object.keys(colorModule.colors) : []
}

export function installResolver(onReady?: () => void) {
	getModules(withProps<any>('colors', 'unsafe_rawColors', 'internal'), raw => {
		const mod = unwrap(raw)
		if (!mod?.internal?.resolveSemanticColor || originalResolve) return
		colorModule = mod

		const orig = mod.internal.resolveSemanticColor
		originalResolve = orig
		const internalThis = mod.internal

		mod.internal.resolveSemanticColor = function patchedResolve(
			theme: string,
			token: unknown,
			...rest: unknown[]
		) {
			if (tokenMap.size) {
				try {
					if (mod.internal.isSemanticColor(token)) {
						const name = mod.internal.getSemanticColorName(token)
						const override = tokenMap.get(name)
						if (override) {
							const opacity = rest[0]
							return typeof opacity === 'number' ? applyOpacity(override, opacity) : override
						}
					}
				} catch {}
			}
			return orig.call(internalThis, theme, token, ...rest)
		}

		onReady?.()
	})
}

export function uninstallResolver() {
	if (colorModule && originalResolve) colorModule.internal.resolveSemanticColor = originalResolve
	originalResolve = undefined
	colorModule = undefined
	tokenMap.clear()
}
