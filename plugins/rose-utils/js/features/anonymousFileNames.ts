import { getModule, getFilters } from '../shared'
import type { RoseUtilsSettings } from '../types'

function randomString(length: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let res = ''
	for (let i = 0; i < length; i++) {
		res += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return res
}

function randomizeFile(file: any, length: number): void {
	const target = file?.file ?? file
	if (!target) return

	const oldName = target.filename ?? target.name
	if (typeof oldName !== 'string') return

	const dotIdx = oldName.lastIndexOf('.')
	const ext = dotIdx !== -1 ? oldName.slice(dotIdx) : ''
	const newName = `${randomString(length)}${ext}`

	if (typeof target.filename !== 'undefined') target.filename = newName
	if (typeof target.name !== 'undefined') target.name = newName
}

export function initAnonymousFileNames(settings: RoseUtilsSettings): () => void {
	if (!settings.anonymousFileNames) return () => {}

	const cleanups: (() => void)[] = []
	const len = settings.anonymousFileLength || 8

	const uploadMod = getModule(getFilters().withProps('uploadLocalFiles'))
	if (uploadMod?.uploadLocalFiles) {
		const unpatch = revenge.patcher.before(uploadMod, 'uploadLocalFiles', (args: any) => {
			const files = args[0]?.items ?? args[0]?.files ?? args[0]?.uploads
			if (Array.isArray(files)) {
				for (const f of files) {
					randomizeFile(f, len)
				}
			}
			return args
		})
		cleanups.push(unpatch)
	}

	const cloudUploadMod = getModule(getFilters().withProps('CloudUpload'))
	if (cloudUploadMod?.CloudUpload) {
		const unpatch = revenge.patcher.before(cloudUploadMod, 'CloudUpload', (args: any) => {
			if (args[0]) {
				randomizeFile(args[0], len)
			}
			return args
		})
		cleanups.push(unpatch)
	}

	return () => {
		for (const fn of cleanups) fn()
	}
}
