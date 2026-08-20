import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { instead } from '@revenge-mod/patcher'
import { DEFAULTS } from '../defaults'
import { applyOpacity, colorRef, parseColorManifest } from './internal'
import type { JsonStorage } from '@revenge-mod/json-storage'
import type { ColorManifest, ThemeMasterStorage } from '../types'
import type { ColorModuleShape } from './internal'

function getCache(
	storage: JsonStorage<ThemeMasterStorage>,
): ThemeMasterStorage {
	return {
		...DEFAULTS,
		...(storage.cache as ThemeMasterStorage | undefined),
	} as ThemeMasterStorage
}

function getCurrentTheme(
	storage: JsonStorage<ThemeMasterStorage>,
): ColorManifest | null {
	const cache = getCache(storage)
	const id = cache.selectedThemeId
	if (!id) return null
	return cache.themes[id]?.data ?? null
}

let colorModule: ColorModuleShape | undefined
let unpatches: Array<() => void> = []
let applyUnsubscribe: (() => void) | undefined
let nativeThemeModule: { updateTheme(theme: string): void } | undefined

function unwrap(mod: any): any {
	return mod?.default ?? mod
}

function safeFindColorModule(
	callback: (mod: ColorModuleShape) => void,
): () => void {
	const filters = [
		withProps('colors', 'unsafe_rawColors', 'internal'),
		withProps('SemanticColor', 'RawColor'),
	]

	const unsubs: Array<() => void> = []
	const once = (mod: any) => {
		if (colorModule) return
		callback(unwrap(mod))
	}

	for (const filter of filters) {
		try {
			const found = (
				globalThis as any
			).revenge?.modules?.finders?.lookupModule?.(filter)
			if (found) {
				const [mod] = found
				if (mod) once(mod)
			}
		} catch {
			// ignored
		}

		try {
			unsubs.push(
				getModules(filter, mod => once(mod), { returnNamespace: true }),
			)
		} catch {
			// ignored
		}
	}

	return () => unsubs.forEach(u => u?.())
}

function installColorModule(mod: ColorModuleShape) {
	if (colorModule) return
	colorModule = mod

	try {
		const rawColors = mod.RawColor
		colorRef.origRaw = { ...rawColors }
		mod.RawColor = new Proxy(colorRef.origRaw, {
			get(target, prop) {
				if (typeof prop !== 'string') return (target as any)[prop]
				return colorRef.current?.raw[prop] ?? (target as any)[prop]
			},
		})
	} catch (e) {
		console.error('[Theme Master] Failed to patch RawColor', e)
		return
	}

	try {
		const resolverTarget = (mod.internal ??
			mod.default?.meta ??
			mod.default?.internal) as
			| { resolveSemanticColor: (...args: any[]) => any }
			| undefined

		if (resolverTarget?.resolveSemanticColor) {
			const unpatch = instead(
				resolverTarget,
				'resolveSemanticColor',
				(args, orig) => {
					if (!colorRef.current) return orig(...args)

					const [_theme, token, ...rest] = args as [
						string,
						unknown,
						...unknown[],
					]

					if (
						mod.internal?.isSemanticColor &&
						mod.internal.getSemanticColorName
					) {
						try {
							if (mod.internal.isSemanticColor(token)) {
								const name = mod.internal.getSemanticColorName(token)
								const semanticDef = colorRef.current.semantic[name]
								if (semanticDef?.value) {
									const extraOpacity =
										typeof rest[0] === 'number' ? (rest[0] as number) : 1
									const opacity = semanticDef.opacity * extraOpacity
									return opacity === 1
										? semanticDef.value
										: applyOpacity(semanticDef.value, opacity)
								}
							}
						} catch {
							// fall through
						}
					}

					return orig(...args)
				},
			)
			unpatches.push(unpatch)
		}
	} catch (e) {
		console.error('[Theme Master] Failed to patch resolveSemanticColor', e)
	}

	nativeThemeModule = getNativeThemeModule()
}

function getNativeThemeModule():
	| { updateTheme(theme: string): void }
	| undefined {
	try {
		return (
			(globalThis as any).revenge?.modules?.native?.getNativeModule?.(
				'NativeThemeModule',
			) ??
			(globalThis as any).revenge?.modules?.native?.getNativeModule?.(
				'ThemeModule',
			)
		)
	} catch {
		return undefined
	}
}

function updateNativeTheme(reference: 'darker' | 'light') {
	if (nativeThemeModule?.updateTheme) {
		try {
			nativeThemeModule.updateTheme(reference)
		} catch {
			// ignored
		}
	}
}

export function applyTheme(
	manifest: ColorManifest,
	overrideThemeType?: 'auto' | 'dark' | 'light',
) {
	if (!colorModule) return
	if (!colorRef.origRaw) colorRef.origRaw = { ...colorModule.RawColor }

	try {
		colorRef.current = parseColorManifest(
			manifest,
			colorRef.origRaw,
			overrideThemeType,
		)
		colorRef.lastReference = colorRef.current.reference
		updateNativeTheme(colorRef.current.reference)
	} catch (e) {
		console.error('[Theme Master] Failed to apply theme', e)
	}
}

export function clearTheme() {
	colorRef.current = null
	updateNativeTheme(colorRef.lastReference)
}

export function applyCurrentTheme(storage: JsonStorage<ThemeMasterStorage>) {
	try {
		const theme = getCurrentTheme(storage)
		if (theme) {
			const cache = getCache(storage)
			applyTheme(theme, cache.overrideThemeType)
		} else {
			clearTheme()
		}
	} catch (e) {
		console.error('[Theme Master] Failed to apply current theme', e)
	}
}

export function initLoader(
	storage: JsonStorage<ThemeMasterStorage>,
): () => void {
	const colorUnsub = safeFindColorModule(mod => {
		installColorModule(mod)
		applyCurrentTheme(storage)
	})

	try {
		applyUnsubscribe = storage.subscribe(() => applyCurrentTheme(storage))
	} catch {
		// ignored
	}

	if (storage.loaded) applyCurrentTheme(storage)
	void storage
		.get()
		.then(() => applyCurrentTheme(storage))
		.catch(() => {})

	return () => {
		colorUnsub?.()
		applyUnsubscribe?.()
		clearTheme()
		for (const unpatch of unpatches) unpatch()
		unpatches = []
	}
}
