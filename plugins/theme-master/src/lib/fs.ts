interface FileManager {
	getConstants(): { DocumentsDirPath: string }
	fileExists(path: string): Promise<boolean>
	writeFile(
		storageDir: 'cache' | 'documents',
		path: string,
		data: string,
		encoding: 'utf8' | 'base64',
	): Promise<string>
	readFile(path: string, encoding: 'utf8' | 'base64'): Promise<string>
	removeFile(storageDir: 'cache' | 'documents', path: string): Promise<boolean>
	clearFolder(storageDir: 'cache' | 'documents', path: string): Promise<boolean>
}

let fileManager: FileManager | undefined

function getFileManager(): FileManager | undefined {
	if (fileManager) return fileManager
	try {
		const gm = (globalThis as any).revenge?.modules?.native?.getNativeModule
		if (typeof gm !== 'function') return undefined
		for (const name of [
			'NativeFileModule',
			'RTNFileManager',
			'DCDFileManager',
			'FileManager',
		]) {
			const mod = gm(name) as FileManager | undefined
			if (mod && typeof mod.writeFile === 'function') {
				fileManager = mod
				break
			}
		}
	} catch {
		return undefined
	}
	return fileManager
}

function callNative<T>(method: string, args: unknown[]): Promise<T> {
	return (globalThis as any).revenge?.modules?.native?.callNativeMethod?.(
		method,
		args,
	)
}

const PREFIX = 'pyoncord/'

export async function fsWrite(path: string, data: string): Promise<void> {
	await callNative('revenge.fs.write', [path, data])
}

export async function fsRead(path: string): Promise<string> {
	return await callNative('revenge.fs.read', [path])
}

export async function fsDelete(path: string): Promise<boolean> {
	return await callNative('revenge.fs.delete', [path])
}

export async function writeFile(path: string, data: string): Promise<void> {
	const fm = getFileManager()
	if (!fm) throw new Error('FileManager is not available')
	await fm.writeFile('documents', `${PREFIX}${path}`, data, 'utf8')
}

export async function readFile(path: string): Promise<string> {
	const fm = getFileManager()
	if (!fm) throw new Error('FileManager is not available')
	const constants = fm.getConstants()
	return await fm.readFile(
		`${constants.DocumentsDirPath}/${PREFIX}${path}`,
		'utf8',
	)
}

export async function fileExists(path: string): Promise<boolean> {
	const fm = getFileManager()
	if (!fm) return false
	const constants = fm.getConstants()
	return await fm.fileExists(`${constants.DocumentsDirPath}/${PREFIX}${path}`)
}

export async function removeFile(path: string): Promise<boolean> {
	const fm = getFileManager()
	if (!fm) throw new Error('FileManager is not available')
	return await fm.removeFile('documents', `${PREFIX}${path}`)
}

export async function clearFolder(path: string): Promise<boolean> {
	const fm = getFileManager()
	if (!fm) throw new Error('FileManager is not available')
	return await fm.clearFolder('documents', `${PREFIX}${path}`)
}

export async function downloadFile(url: string, path: string): Promise<void> {
	const fm = getFileManager()
	if (!fm) throw new Error('FileManager is not available')
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
	const buffer = await res.arrayBuffer()
	const base64 = arrayBufferToBase64(buffer)
	await fm.writeFile('documents', `${PREFIX}${path}`, base64, 'base64')
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.byteLength; i++)
		binary += String.fromCharCode(bytes[i])
	return (globalThis as any).btoa?.(binary) ?? ''
}
