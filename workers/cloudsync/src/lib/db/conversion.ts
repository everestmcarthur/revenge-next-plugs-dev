import { promisify } from 'node:util'
import {
	brotliCompress as _brotliCompress,
	brotliDecompress as _brotliDecompress,
} from 'node:zlib'

import { UserData, validateUserData } from '.'

export const latestDataVersion = 3

const brotliCompress = promisify(_brotliCompress)
const brotliDecompress = promisify(_brotliDecompress)

const noInvalidChars = /[\n\x00\x01]/g

export function reconstruct(data: string): UserData | undefined {
	if (data.startsWith('3\n')) {
		try {
			return JSON.parse(data.slice(2))
		} catch {
			return undefined
		}
	}
	if (data.startsWith('{')) {
		try {
			return JSON.parse(data)
		} catch {
			return undefined
		}
	}

	const [version, plugins, themes, installedFonts, customFonts, ...incorrect] =
		data.split('\n')
	if (incorrect.length > 1 || (version !== '2' && version !== '3')) return

	const dataObj: UserData = {
		plugins: {},
		repos: [],
		settings: {},
		experiments: {},
		themes: {},
		fonts: {
			installed: {},
			custom: [],
		},
	}

	if (plugins) {
		for (const plugin of plugins.split('\x01')) {
			const stuff = plugin.split('\x00')
			const url = stuff[0]
			if (!url) continue
			let [enabled, storage] = stuff.slice(1)

			if (enabled && enabled !== '1') {
				storage = enabled
				enabled = ''
			}

			if (storage) {
				try {
					JSON.parse(storage)
				} catch {
					// retain storage if non-empty or default to empty
				}
			}

			dataObj.plugins[url] = {
				enabled: Boolean(enabled),
				storage: storage || '{}',
			}
		}
	}

	if (customFonts) {
		for (const font of customFonts.split('\x01')) {
			const [spec, src, enabled] = font.split('\x00')
			if (Number.isNaN(Number(spec)) || !src) continue

			let raw: object
			try {
				raw = JSON.parse(src) as object
			} catch {
				continue
			}

			dataObj.fonts!.custom.push({
				spec: Number(spec),
				enabled: enabled === '1',
				...raw,
			})
		}
	}

	if (themes) {
		for (const theme of themes.split('\x01')) {
			const [url, enabled] = theme.split('\x00')
			if (!url) continue

			dataObj.themes![url] = {
				enabled: enabled === '1',
			}
		}
	}

	if (installedFonts) {
		for (const font of installedFonts.split('\x01')) {
			const [url, enabled] = font.split('\x00')
			if (!url) continue

			dataObj.fonts!.installed[url] = {
				enabled: enabled === '1',
			}
		}
	}

	return dataObj
}

export function deconstruct(data: UserData) {
	if (!validateUserData(data)) throw new Error('Invalid UserData')
	return `3\n${JSON.stringify(data)}`
}

export async function compressData(data: UserData) {
	return (await brotliCompress(deconstruct(data))).toString('base64')
}

export function decompressData(data: string, decompOnly: true): Promise<string>
export function decompressData(
	data: string,
	decompOnly?: false,
): Promise<UserData>

export async function decompressData(
	data: string,
	decompOnly: boolean = false,
) {
	const decomp = (
		await brotliDecompress(Buffer.from(data, 'base64'))
	).toString()

	if (decompOnly === true) return decomp
	else return reconstruct(decomp)
}
