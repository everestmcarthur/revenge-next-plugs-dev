import { find, findByName, findByProps } from '../vendetta'

const nmp = (window as any).nativeModuleProxy ?? {}

function getNativeModule<T = any>(...names: string[]): T | undefined {
	for (const name of names) {
		if ((globalThis as any).__turboModuleProxy) {
			const mod = (globalThis as any).__turboModuleProxy(name)
			if (mod) return mod as T
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
