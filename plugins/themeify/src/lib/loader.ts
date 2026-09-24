import { applyOpacity, parseTheme, type ParsedTheme } from './parser'
import type { ThemeData, ThemeifyStorage } from '../types'

interface ColorTokens {
	themes: string[]
	colors: Record<string, any>
	unsafe_rawColors: Record<string, string>
	internal: {
		isSemanticColor(token: any): boolean
		getSemanticColorName(token: any): string
		resolveSemanticColor(theme: string, token: any, opacity?: number): string
		adjustColorSaturation?(color: string, saturation: number): string
		adjustColorContrast?(color: string, contrast: number): string
	}
}

let activeParsedTheme: ParsedTheme | null = null
let origRawColors: Record<string, string> | null = null
let unpatches: Array<() => void> = []

function getTokens(): ColorTokens | null {
	try {
		const kmmiio = (globalThis as any).revenge?.kmmiio
		if (typeof kmmiio?.getTokens === 'function') {
			const tokens = kmmiio.getTokens()
			if (tokens?.internal?.resolveSemanticColor) return tokens
		}
	} catch {}

	try {
		const metro = (globalThis as any).revenge?.modules?.metro
		const mod576 = metro?.getInitializedModuleExports?.(576)
		const candidate = mod576?.default ?? mod576
		if (candidate?.internal?.resolveSemanticColor) return candidate
	} catch {}

	return null
}

function getNativeThemeModule(): { updateTheme(theme: string): void } | null {
	try {
		const gm = (globalThis as any).revenge?.modules?.native?.getNativeModule
		if (typeof gm === 'function') {
			return gm('NativeThemeModule') ?? gm('ThemeModule')
		}
	} catch {}
	return null
}

export function triggerThemeRerender(reference: 'dark' | 'darker' | 'midnight' | 'light' = 'darker') {
	try {
		const ntm = getNativeThemeModule()
		if (ntm?.updateTheme) {
			ntm.updateTheme(reference)
		}
	} catch (e) {
		console.warn('[Themeify] Failed to trigger NativeThemeModule.updateTheme', e)
	}
}

export function installThemeHooks(tokens: ColorTokens) {
	if (unpatches.length > 0) return

	if (!origRawColors && tokens.unsafe_rawColors) {
		origRawColors = { ...tokens.unsafe_rawColors }
		try {
			tokens.unsafe_rawColors = new Proxy(origRawColors, {
				get(target, prop) {
					if (typeof prop === 'string' && activeParsedTheme?.raw) {
						const override = activeParsedTheme.raw[prop.toUpperCase()]
						if (override) return override
					}
					return (target as any)[prop]
				},
			})
		} catch (e) {
			console.error('[Themeify] Failed to proxy unsafe_rawColors', e)
		}
	}

	if (tokens.internal?.resolveSemanticColor) {
		const unpatch = (globalThis as any).revenge.patcher.instead(
			tokens.internal,
			'resolveSemanticColor',
			(args: any[], orig: any) => {
				if (!activeParsedTheme) {
					return orig.apply(tokens.internal, args)
				}

				const [theme, token, extraOpacity] = args
				try {
					if (tokens.internal.isSemanticColor?.(token)) {
						const name = tokens.internal.getSemanticColorName(token)
						if (name) {
							const override = activeParsedTheme.semantic[name.toUpperCase()]
							if (override) {
								const mult = typeof extraOpacity === 'number' ? extraOpacity : 1
								const finalOpacity = override.opacity * mult
								return finalOpacity === 1
									? override.value
									: applyOpacity(override.value, finalOpacity)
							}
						}
					}
				} catch {}

				return orig.apply(tokens.internal, args)
			},
		)
		unpatches.push(unpatch)
	}
}

export function applyTheme(
	themeData: ThemeData,
	overrideThemeType?: 'auto' | 'dark' | 'darker' | 'midnight' | 'light',
) {
	const tokens = getTokens()
	if (!tokens) return

	installThemeHooks(tokens)

	try {
		activeParsedTheme = parseTheme(themeData, origRawColors ?? tokens.unsafe_rawColors ?? {}, overrideThemeType)
		triggerThemeRerender(activeParsedTheme.reference)
	} catch (e) {
		console.error('[Themeify] Failed to parse and apply theme', e)
	}
}

export function clearTheme() {
	activeParsedTheme = null
	triggerThemeRerender('darker')
}

export function applyFromStorage(storage: ThemeifyStorage) {
	const activeId = storage.selectedThemeId
	if (activeId && storage.themes[activeId]) {
		applyTheme(storage.themes[activeId].data, storage.overrideThemeType)
	} else {
		clearTheme()
	}
}

export function initLoader(storageApi: any): () => void {
	const tokens = getTokens()
	if (tokens) {
		installThemeHooks(tokens)
	}

	const onStorage = () => {
		try {
			const cache = storageApi.cache ?? {}
			applyFromStorage(cache)
		} catch (e) {
			console.error('[Themeify] Error in storage listener', e)
		}
	}

	let unsub: (() => void) | undefined
	if (typeof storageApi.subscribe === 'function') {
		unsub = storageApi.subscribe(onStorage)
	}

	if (storageApi.loaded) {
		onStorage()
	} else if (typeof storageApi.get === 'function') {
		storageApi.get().then(onStorage).catch(() => {})
	}

	return () => {
		unsub?.()
		clearTheme()
		for (const u of unpatches) {
			try {
				u()
			} catch {}
		}
		unpatches = []
	}
}
