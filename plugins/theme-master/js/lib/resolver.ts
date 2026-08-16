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

		mod.internal.resolveSemanticColor = function patchedResolve(
			this: unknown,
			theme: string,
			token: unknown,
			...rest: unknown[]
		) {
			if (tokenMap.size) {
				try {
					if (mod.internal.isSemanticColor(token)) {
						const name = mod.internal.getSemanticColorName(token)
						const override = tokenMap.get(name)
						if (override) return override
					}
				} catch {}
			}
			return orig.call(this, theme, token, ...rest)
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
