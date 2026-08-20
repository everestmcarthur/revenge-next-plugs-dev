import { getModules } from '@revenge-mod/modules/finders'
import { or, withProps } from '@revenge-mod/modules/finders/filters'
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

const colorModuleFilter = or(
	withProps('SemanticColor', 'RawColor'),
	withProps('colors', 'unsafe_rawColors', 'internal'),
)

function findColorModule(
	callback: (mod: ColorModuleShape) => void,
): () => void {
	try {
		const found = (globalThis as any).revenge?.modules?.finders?.lookupModule?.(
			colorModuleFilter,
		)
		if (found) {
			const [mod] = found
			if (mod) callback(unwrap(mod))
		}
	} catch {
		// ignored
	}

	return getModules(colorModuleFilter, mod => callback(unwrap(mod)), {
		returnNamespace: true,
	})
}

function installColorModule(mod: ColorModuleShape) {
	if (colorModule) return
	colorModule = mod

	colorRef.origRaw = { ...mod.RawColor }

	for (const key of Object.keys(mod.RawColor)) {
		Object.defineProperty(mod.RawColor, key, {
			configurable: true,
			enumerable: true,
			get: () => colorRef.current?.raw[key] || colorRef.origRaw?.[key],
		})
	}

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

				const [_theme, token, ...rest] = args as [string, unknown, ...unknown[]]

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

	colorRef.current = parseColorManifest(
		manifest,
		colorRef.origRaw,
		overrideThemeType,
	)
	colorRef.lastReference = colorRef.current.reference

	for (const key of Object.keys(colorRef.current.raw)) {
		if (!(key in colorModule.RawColor)) {
			Object.defineProperty(colorModule.RawColor, key, {
				configurable: true,
				enumerable: true,
				get: () => colorRef.current?.raw[key] || colorRef.origRaw?.[key],
			})
		}
	}

	updateNativeTheme(colorRef.current.reference)
}

export function clearTheme() {
	colorRef.current = null
	updateNativeTheme(colorRef.lastReference)
}

export function applyCurrentTheme(storage: JsonStorage<ThemeMasterStorage>) {
	const theme = getCurrentTheme(storage)
	if (theme) {
		const cache = getCache(storage)
		applyTheme(theme, cache.overrideThemeType)
	} else {
		clearTheme()
	}
}

export function initLoader(
	storage: JsonStorage<ThemeMasterStorage>,
): () => void {
	const colorUnsub = findColorModule(mod => {
		installColorModule(mod)
		applyCurrentTheme(storage)
	})

	applyUnsubscribe = storage.subscribe(() => applyCurrentTheme(storage))
	if (storage.loaded) applyCurrentTheme(storage)
	void storage.get().then(() => applyCurrentTheme(storage))

	return () => {
		colorUnsub?.()
		applyUnsubscribe?.()
		clearTheme()
		for (const unpatch of unpatches) unpatch()
		unpatches = []
	}
}
