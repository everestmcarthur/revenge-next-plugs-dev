import { applyOpacity, parseTheme, SEMANTIC_FALLBACKS, type ParsedTheme } from './parser'
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
			const opposite = reference === 'light' ? 'midnight' : 'light'
			ntm.updateTheme(opposite)
			setTimeout(() => {
				try {
					ntm.updateTheme(reference)
				} catch {}
			}, 25)
		}
	} catch (e) {
		console.warn('[Themeify] Failed to trigger NativeThemeModule.updateTheme', e)
	}

	try {
		const everest = (globalThis as any).revenge?.everest
		const ts = everest?.getThemeStore?.()
		ts?.emitChange?.()
	} catch {}
}

function patchRawColors(rawMap: Record<string, string>) {
	try {
		const metro = (globalThis as any).revenge?.modules?.metro
		const mod576 = metro?.getInitializedModuleExports?.(576)
		const targets = [mod576?.RawColor, getTokens()?.unsafe_rawColors].filter(Boolean)

		if (!origRawColors && mod576?.RawColor) {
			origRawColors = { ...mod576.RawColor }
		}

		for (const target of targets) {
			for (const [key, val] of Object.entries(rawMap)) {
				try {
					Object.defineProperty(target, key, {
						configurable: true,
						enumerable: true,
						get() {
							return activeParsedTheme?.raw?.[key] || val || origRawColors?.[key]
						},
					})
				} catch {}
			}
		}
	} catch (e) {
		console.error('[Themeify] Failed to patch RawColor', e)
	}
}

export function installThemeHooks(tokens: ColorTokens) {
	if (unpatches.length > 0) return

	const metro = (globalThis as any).revenge?.modules?.metro
	const mod576 = metro?.getInitializedModuleExports?.(576)
	if (!origRawColors) {
		origRawColors = { ...(mod576?.RawColor ?? tokens.unsafe_rawColors ?? {}) }
	}

	if (tokens.internal?.resolveSemanticColor) {
		const semanticDefMap = mod576?.SemanticColor

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
						const rawName = tokens.internal.getSemanticColorName(token)
						if (rawName) {
							const name = rawName.toUpperCase()

							// 1. Direct match in parsed theme semantic colors
							let override = activeParsedTheme.semantic[name]

							// 2. Semantic fallbacks (e.g. TEXT_DEFAULT -> TEXT_NORMAL, BACKGROUND_BASE_LOWEST -> BG_BASE_TERTIARY)
							if (!override && SEMANTIC_FALLBACKS[name]) {
								for (const fb of SEMANTIC_FALLBACKS[name]) {
									if (activeParsedTheme.semantic[fb]) {
										override = activeParsedTheme.semantic[fb]
										break
									}
								}
							}

							if (override) {
								const mult = typeof extraOpacity === 'number' ? extraOpacity : 1
								const finalOpacity = override.opacity * mult
								return finalOpacity === 1
									? override.value
									: applyOpacity(override.value, finalOpacity)
							}

							// 3. Raw color dereference from Discord's SemanticColor definition
							if (semanticDefMap?.[name]) {
								const def = semanticDefMap[name]
								const targetDef = def[theme] ?? def.darker ?? def.dark ?? def.midnight
								if (targetDef?.raw) {
									const rawVal = activeParsedTheme.raw[targetDef.raw]
									if (rawVal) {
										const mult = typeof extraOpacity === 'number' ? extraOpacity : 1
										const finalOpacity = (targetDef.opacity ?? 1) * mult
										return finalOpacity === 1 ? rawVal : applyOpacity(rawVal, finalOpacity)
									}
								}
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
		if (activeParsedTheme.raw) {
			patchRawColors(activeParsedTheme.raw)
		}
		triggerThemeRerender(activeParsedTheme.reference)
	} catch (e) {
		console.error('[Themeify] Failed to parse and apply theme', e)
	}
}

export function clearTheme() {
	activeParsedTheme = null
	if (origRawColors) {
		try {
			const metro = (globalThis as any).revenge?.modules?.metro
			const mod576 = metro?.getInitializedModuleExports?.(576)
			const targets = [mod576?.RawColor, getTokens()?.unsafe_rawColors].filter(Boolean)
			for (const target of targets) {
				for (const [key, val] of Object.entries(origRawColors)) {
					try {
						Object.defineProperty(target, key, {
							configurable: true,
							enumerable: true,
							writable: true,
							value: val,
						})
					} catch {}
				}
			}
		} catch {}
	}
	triggerThemeRerender('darker')
}

export function applyFromStorage(storage: ThemeifyStorage) {
	const activeId = storage?.selectedThemeId
	if (activeId && storage?.themes?.[activeId]) {
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

	const loadAndApply = (data: ThemeifyStorage) => {
		try {
			if (data && typeof data === 'object') {
				applyFromStorage(data)
			}
		} catch (e) {
			console.error('[Themeify] Error applying theme from storage', e)
		}
	}

	let unsub: (() => void) | undefined
	if (typeof storageApi.subscribe === 'function') {
		unsub = storageApi.subscribe(() => {
			if (typeof storageApi.get === 'function') {
				storageApi.get().then(loadAndApply).catch(() => {})
			}
		})
	}

	if (typeof storageApi.get === 'function') {
		storageApi.get().then(loadAndApply).catch(() => {})
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

