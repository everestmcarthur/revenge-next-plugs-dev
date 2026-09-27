import { find, findByName, findByProps } from '../vendetta'

function getNativeModule<T = any>(...names: string[]): T | undefined {
	const g = globalThis as any
	const nmp =
		g.nativeModuleProxy ??
		g.window?.nativeModuleProxy ??
		g.revenge?.react?.ReactNative?.NativeModules ??
		{}
	for (const name of names) {
		if (typeof g.__turboModuleProxy === 'function') {
			try {
				const mod = g.__turboModuleProxy(name)
				if (mod) return mod as T
			} catch {}
		}
		if (nmp[name]) return nmp[name] as T
	}
	return undefined
}

export const RNCacheModule = getNativeModule<any>(
	'NativeCacheModule',
	'MMKVManager',
)

export const RNFileModule = getNativeModule<any>(
	'NativeFileModule',
	'DCDFileManager',
)

export const DocumentPicker = findByProps('pickSingle', 'isCancel')

export const DocumentsNew = findByProps('pick', 'saveDocuments')

export const WebView = find((x: any) => x?.WebView && !x.default)?.WebView
export const Svg = findByProps('SvgXml')
