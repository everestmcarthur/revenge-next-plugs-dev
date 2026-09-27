import {
	applyOpacity,
	parseTheme,
	SEMANTIC_FALLBACKS,
	toScreamingSnake,
	type ParsedTheme,
} from './parser'
import type { ThemeData, ThemeifyStorage } from '../types'

interface ColorTokens {
	themes: Record<string, string>
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

interface TokensModuleInfo {
	tokens: ColorTokens
	rawColorsTarget: Record<string, string> | null
	semanticDefsTarget: Record<string, any> | null
}

let activeParsedTheme: ParsedTheme | null = null
let origRawColors: Record<string, string> | null = null
let unpatches: Array<() => void> = []

function getTokensModule(): TokensModuleInfo | null {
	const g = globalThis as any

	// 1. kmmiio helper
	try {
		const kmmiio = g.revenge?.kmmiio
		if (typeof kmmiio?.getTokens === 'function') {
			const tok = kmmiio.getTokens()
			if (tok?.internal?.resolveSemanticColor) {
				return {
					tokens: tok,
					rawColorsTarget: tok.unsafe_rawColors ?? null,
					semanticDefsTarget: (tok as any).SemanticColor ?? null,
				}
			}
		}
	} catch {}

	const metro = g.revenge?.modules?.metro ?? g.vendetta?.metro
	const finders = g.revenge?.modules?.finders

	const checkCandidate = (mod: any): TokensModuleInfo | null => {
		if (!mod) return null
		const tok = mod.default?.internal?.resolveSemanticColor
			? mod.default
			: mod.internal?.resolveSemanticColor
				? mod
				: null

		if (tok?.internal?.resolveSemanticColor) {
			const raw = mod.RawColor ?? tok.unsafe_rawColors ?? null
			const sem = mod.SemanticColor ?? null
			return {
				tokens: tok,
				rawColorsTarget: raw,
				semanticDefsTarget: sem,
			}
		}
		return null
	}

	// 2. Metro findByProps / finders
	if (typeof metro?.findByProps === 'function') {
		try {
			const mod = metro.findByProps('colors', 'unsafe_rawColors')
			const res = checkCandidate(mod)
			if (res) return res
		} catch {}
	}

	if (finders?.lookupModule && finders?.filters?.withProps) {
		try {
			const mod = finders.lookupModule(finders.filters.withProps('colors', 'unsafe_rawColors'))
			const target = Array.isArray(mod) ? mod[0] : mod
			const res = checkCandidate(target)
			if (res) return res
		} catch {}
	}

	if (typeof g.revenge?.discord?.utils?.modules?.finders?.findByProps === 'function') {
		try {
			const mod = g.revenge.discord.utils.modules.finders.findByProps('colors', 'unsafe_rawColors')
			const res = checkCandidate(mod)
			if (res) return res
		} catch {}
	}

	// 3. Fallback: scan initialized modules in metro
	try {
		const initialized = metro?.getInitializedModules?.() ?? metro?.modules
		if (initialized && typeof initialized === 'object') {
			for (const id of Object.keys(initialized)) {
				try {
					const exp =
						metro.getInitializedModuleExports?.(Number(id)) ??
						initialized[id]?.publicModule?.exports
					const res = checkCandidate(exp)
					if (res) return res
				} catch {}
			}
		}
	} catch {}

	// 4. Fallback known module ID 576
	try {
		const mod576 = metro?.getInitializedModuleExports?.(576)
		const res = checkCandidate(mod576)
		if (res) return res
	} catch {}

	return null
}

function getSemanticDefs(fallback?: Record<string, any> | null): Record<string, any> | null {
	if (fallback && typeof fallback === 'object' && Object.keys(fallback).length > 0) {
		return fallback
	}
	const g = globalThis as any
	const metro = g.revenge?.modules?.metro ?? g.vendetta?.metro
	if (typeof metro?.findByProps === 'function') {
		try {
			const mod = metro.findByProps('SemanticColors')
			const sem = mod?._private?.SemanticColors ?? mod?.SemanticColors
			if (sem && typeof sem === 'object') return sem
		} catch {}
	}
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

function getDispatcher(): any {
	const g = globalThis as any
	if (g.revenge?.discord?.flux?.dispatcher) return g.revenge.discord.flux.dispatcher
	if (g.revenge?.discord?.dispatcher) return g.revenge.discord.dispatcher

	const metro = g.revenge?.modules?.metro ?? g.vendetta?.metro
	if (typeof metro?.findByProps === 'function') {
		const d = metro.findByProps('dispatch', 'subscribe')
		if (d?.dispatch) return d
	}

	const finders = g.revenge?.modules?.finders
	if (finders?.lookupModule && finders?.filters?.withProps) {
		try {
			const mod = finders.lookupModule(finders.filters.withProps('dispatch', 'subscribe'))
			const target = Array.isArray(mod) ? mod[0] : mod
			if (target?.dispatch) return target
		} catch {}
	}

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
			}, 35)
		}
	} catch (e) {
		console.warn('[Themeify] Failed to trigger NativeThemeModule.updateTheme', e)
	}

	try {
		const dispatcher = getDispatcher()
		if (dispatcher?.dispatch) {
			dispatcher.dispatch({ type: 'SELECT_THEME', theme: reference })
			dispatcher.dispatch({ type: 'THEME_CHANGE', theme: reference })
		}
	} catch {}

	try {
		const everest = (globalThis as any).revenge?.everest
		const ts = everest?.getThemeStore?.()
		ts?.emitChange?.()
	} catch {}
}

function patchRawColors(rawMap: Record<string, string>, targets: any[]) {
	try {
		for (const target of targets) {
			if (!target || typeof target !== 'object') continue
			for (const [key, val] of Object.entries(rawMap)) {
				try {
					Object.defineProperty(target, key, {
						configurable: true,
						enumerable: true,
						get() {
							return (
								activeParsedTheme?.raw?.[key] ||
								activeParsedTheme?.raw?.[key.toUpperCase()] ||
								val ||
								origRawColors?.[key]
							)
						},
					})
				} catch {}
			}
		}
	} catch (e) {
		console.error('[Themeify] Failed to patch RawColor', e)
	}
}

export function installThemeHooks(modInfo: TokensModuleInfo) {
	if (unpatches.length > 0) return

	const { tokens, rawColorsTarget, semanticDefsTarget } = modInfo
	const semanticDefs = getSemanticDefs(semanticDefsTarget)

	if (!origRawColors) {
		origRawColors = { ...(rawColorsTarget ?? tokens.unsafe_rawColors ?? {}) }
	}

	if (tokens.internal?.resolveSemanticColor) {
		const patcher = (globalThis as any).revenge?.patcher
		if (typeof patcher?.instead === 'function') {
			const unpatch = patcher.instead(
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
								const name = toScreamingSnake(rawName)

								// 1. Direct match in parsed theme semantic colors
								let override = activeParsedTheme.semantic[name]

								// 2. Semantic fallbacks (e.g. TEXT_DEFAULT <-> TEXT_NORMAL, BACKGROUND_BASE_LOWEST <-> BG_BASE_TERTIARY)
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
									return finalOpacity >= 0.999
										? override.value
										: applyOpacity(override.value, finalOpacity)
								}

								// 3. Raw color dereference from Discord's SemanticColor definitions
								if (semanticDefs?.[name]) {
									const def = semanticDefs[name]
									const targetDef =
										def[theme] ??
										def.darker ??
										def.dark ??
										def.midnight ??
										def.light
									if (targetDef?.raw) {
										const rawVal =
											activeParsedTheme.raw[targetDef.raw] ??
											activeParsedTheme.raw[targetDef.raw.toUpperCase()]
										if (rawVal) {
											const mult =
												typeof extraOpacity === 'number' ? extraOpacity : 1
											const finalOpacity = (targetDef.opacity ?? 1) * mult
											return finalOpacity >= 0.999
												? rawVal
												: applyOpacity(rawVal, finalOpacity)
										}
									}
								}
							}
						}
					} catch (e) {
						console.error('[Themeify] Error in resolveSemanticColor patch', e)
					}

					return orig.apply(tokens.internal, args)
				},
			)
			unpatches.push(unpatch)
		}
	}
}

export function applyTheme(
	themeData: ThemeData,
	overrideThemeType?: 'auto' | 'dark' | 'darker' | 'midnight' | 'light',
) {
	const modInfo = getTokensModule()
	if (!modInfo) return

	installThemeHooks(modInfo)

	try {
		activeParsedTheme = parseTheme(
			themeData,
			origRawColors ?? modInfo.tokens.unsafe_rawColors ?? {},
			overrideThemeType,
		)
		if (activeParsedTheme.raw) {
			const targets = [modInfo.rawColorsTarget, modInfo.tokens.unsafe_rawColors].filter(Boolean)
			patchRawColors(activeParsedTheme.raw, targets)
		}
		triggerThemeRerender(activeParsedTheme.reference)
	} catch (e) {
		console.error('[Themeify] Failed to parse and apply theme', e)
	}
}

export function clearTheme() {
	activeParsedTheme = null
	if (origRawColors) {
		const modInfo = getTokensModule()
		const targets = [modInfo?.rawColorsTarget, modInfo?.tokens?.unsafe_rawColors].filter(Boolean)
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
	const modInfo = getTokensModule()
	if (modInfo) {
		installThemeHooks(modInfo)
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
