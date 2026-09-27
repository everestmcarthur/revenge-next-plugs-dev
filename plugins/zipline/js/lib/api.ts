export const DEFAULT_HOST = 'i.allyapp.cc'
export const DEFAULT_DIRECT_HOST = 'direct-i.allyapp.cc'
export const DEFAULT_CHUNK_SIZE_MB = 50
export const CHUNK_THRESHOLD_BYTES = 90 * 1024 * 1024 // 90 MB (Cloudflare free proxy limit is 100 MB)
const BASE_UPLOAD_TIMEOUT_MS = 60000
const CHUNK_TIMEOUT_MS = 180000

export function formatHost(rawHost?: string): string {
	const h = rawHost?.trim()
	return (h || DEFAULT_HOST).replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export function getBaseUrl(rawHost?: string): string {
	return `https://${formatHost(rawHost)}`
}

const EXCLUDED_DOMAINS = [
	'discord.com',
	'discordapp.com',
	'cdn.discordapp.com',
	'media.discordapp.net',
	'discord.gg',
	// GIF & sticker platforms (embedded by Discord)
	'klipy.com',
	'tenor.com',
	'giphy.com',
	'gfycat.com',
	'imgur.com',
	// Rich media / video platforms
	'youtube.com',
	'youtu.be',
	'streamable.com',
	'tiktok.com',
	'twitch.tv',
	'spotify.com',
	'reddit.com',
	'redd.it',
	'twitter.com',
	'x.com',
]

const MEDIA_EXTENSION_REGEX =
	/\.(gif|gifv|webp|png|jpe?g|svg|avif|mp4|webm|mov|mkv|mp3|wav|ogg|flac|m4a)(\?.*)?$/i

export function isExcludedDomain(
	url: string,
	rawHost?: string,
	excludeMedia = true,
): boolean {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return true
	}

	const host = formatHost(rawHost).toLowerCase()
	const hostname = parsed.hostname.toLowerCase()

	// Exclude configured host & direct variants
	if (
		hostname === host ||
		hostname.endsWith(`.${host}`) ||
		hostname === `direct-${host}` ||
		hostname.endsWith(`.direct-${host}`)
	) {
		return true
	}

	// Exclude known platform domains
	const isExcludedHost = EXCLUDED_DOMAINS.some(
		d => hostname === d || hostname.endsWith(`.${d}`),
	)
	if (isExcludedHost) return true

	if (excludeMedia) {
		// Exclude direct media files (GIFs, images, videos)
		if (MEDIA_EXTENSION_REGEX.test(parsed.pathname)) {
			return true
		}

		// Exclude GIF search/viewer paths (e.g. klipy.com/gifs/..., tenor.com/view/...)
		if (/\/(gifs?|view)\//i.test(parsed.pathname)) {
			return true
		}
	}

	return false
}

export interface UploadedFile {
	url: string
	name: string
}

export interface UploadProgress {
	currentChunk: number
	totalChunks: number
	percent: number
}

export type ProgressCallback = (progress: UploadProgress) => void

function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	message: string,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), ms)
		promise.then(
			v => {
				clearTimeout(timer)
				resolve(v)
			},
			e => {
				clearTimeout(timer)
				reject(e)
			},
		)
	})
}

/**
 * Uploads a file in chunks using Zipline's `/api/upload/partial` endpoint.
 * This bypasses Cloudflare's 100 MB payload limit and improves reliability on mobile.
 */
export async function uploadChunked(
	blob: Blob,
	name: string,
	type: string,
	token: string,
	rawHost?: string,
	chunkSizeBytes: number = DEFAULT_CHUNK_SIZE_MB * 1024 * 1024,
	onProgress?: ProgressCallback,
): Promise<UploadedFile> {
	if (!token?.trim()) throw new Error('No Zipline token configured')

	const totalSize = blob.size
	// Clamp chunk size between 1 MB and 95 MB (Zipline instance maximum)
	const chunkSize = Math.max(
		1024 * 1024,
		Math.min(chunkSizeBytes, 95 * 1024 * 1024),
	)
	const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize))
	const mimeType = type || 'application/octet-stream'
	const fileName = name || 'file.bin'
	const safeHeaderFileName = fileName.replace(/[^\x20-\x7E]/g, '_')
	const baseUrl = getBaseUrl(rawHost)

	let partialIdentifier: string | undefined

	for (let i = 0; i < totalChunks; i++) {
		const start = i * chunkSize
		const end = Math.min(start + chunkSize, totalSize)
		const isLast = i === totalChunks - 1 || end >= totalSize
		const chunkBlob = blob.slice(start, end, mimeType)

		const form = new FormData()
		form.append('file', chunkBlob, fileName)

		const headers: Record<string, string> = {
			authorization: token.trim(),
			'content-range': `bytes ${start}-${end}/${totalSize}`,
			'x-zipline-p-filename': safeHeaderFileName,
			'x-zipline-p-content-type': mimeType,
			'x-zipline-p-content-length': `${totalSize}`,
			'x-zipline-p-lastchunk': isLast ? 'true' : 'false',
		}

		if (partialIdentifier) {
			headers['x-zipline-p-identifier'] = partialIdentifier
		}

		onProgress?.({
			currentChunk: i + 1,
			totalChunks,
			percent: Math.round(((i + 1) / totalChunks) * 100),
		})

		const res = await withTimeout(
			fetch(`${baseUrl}/api/upload/partial`, {
				method: 'POST',
				headers,
				body: form,
			}),
			CHUNK_TIMEOUT_MS,
			`Chunk ${i + 1}/${totalChunks} upload timed out`,
		)

		if (!res.ok) {
			const errorText = await res.text().catch(() => '')
			throw new Error(
				`Zipline chunk upload failed (${res.status}) on chunk ${i + 1}/${totalChunks}: ${errorText}`,
			)
		}

		const json = await res.json()
		if (!json?.partialSuccess) {
			throw new Error(
				`Zipline chunk upload failed on chunk ${i + 1}/${totalChunks}`,
			)
		}

		if (i === 0) {
			if (!json.partialIdentifier) {
				throw new Error(
					'Zipline did not return a partialIdentifier for chunk 0',
				)
			}
			partialIdentifier = json.partialIdentifier
		}

		if (isLast) {
			const uploaded = json?.files?.[0]
			if (!uploaded?.url) {
				throw new Error(
					'Zipline chunk upload completed but response was missing a file URL',
				)
			}
			return { url: uploaded.url, name: uploaded.name || fileName }
		}
	}

	throw new Error('Unexpected end of chunked upload without file response')
}

/**
 * Uploads a file to Zipline.
 * - Slices and chunks uploads > 90 MB when a Blob is available.
 * - Automatically routes files > 90 MB to direct unproxied endpoints (e.g. direct-i.allyapp.cc)
 *   to bypass Cloudflare's 100 MB proxy payload limit (413 Payload Too Large).
 * - Dynamically scales timeout for large files (up to 10 minutes).
 * - Automatically retries via direct host if Cloudflare returns 413.
 */
export async function uploadFile(
	fileUri: string,
	name: string,
	type: string,
	token: string,
	rawHost?: string,
	knownSize?: number,
	options?: {
		directHost?: string
		chunkUpload?: boolean
		chunkSizeMb?: number
		onProgress?: ProgressCallback
	},
): Promise<UploadedFile> {
	if (!token?.trim()) throw new Error('No Zipline token configured')

	const shouldChunk = options?.chunkUpload !== false
	const chunkSizeMb = options?.chunkSizeMb ?? DEFAULT_CHUNK_SIZE_MB
	const configuredHost = formatHost(rawHost)
	const directHost = options?.directHost?.trim()
		? formatHost(options?.directHost)
		: configuredHost === DEFAULT_HOST
			? DEFAULT_DIRECT_HOST
			: `direct-${configuredHost}`

	let blob: Blob | null = null

	// If chunking is enabled and either the known size exceeds threshold or size is unverified,
	// attempt to resolve the file Blob to check actual size.
	if (shouldChunk && (!knownSize || knownSize > CHUNK_THRESHOLD_BYTES)) {
		try {
			const res = await fetch(fileUri)
			blob = await res.blob()
		} catch {
			// Blob fetch from local URI is not supported on this platform runtime
		}
	}

	const totalSize = blob?.size ?? knownSize ?? 0

	// If blob is available and exceeds threshold, chunk upload via /api/upload/partial
	if (shouldChunk && blob && totalSize > CHUNK_THRESHOLD_BYTES) {
		return uploadChunked(
			blob,
			name,
			type,
			token,
			configuredHost,
			chunkSizeMb * 1024 * 1024,
			options?.onProgress,
		)
	}

	// Calculate dynamic timeout: 3 seconds per MB, minimum 60s, maximum 10 minutes
	const timeoutMs = Math.max(
		BASE_UPLOAD_TIMEOUT_MS,
		Math.min(600000, Math.ceil((totalSize / (1024 * 1024)) * 3000)),
	)

	// If the file is known to exceed 90 MB, upload directly through the unproxied direct host
	// to avoid Cloudflare's 100 MB proxy payload limit (413 Payload Too Large).
	const targetHost =
		totalSize > CHUNK_THRESHOLD_BYTES ? directHost : configuredHost

	const doUpload = async (uploadHost: string): Promise<Response> => {
		const form = new FormData()
		form.append('file', {
			uri: fileUri,
			name: name || 'file.bin',
			type: type || 'application/octet-stream',
		} as any)

		return withTimeout(
			fetch(`https://${uploadHost}/api/upload`, {
				method: 'POST',
				headers: { authorization: token.trim() },
				body: form,
			}),
			timeoutMs,
			`Upload timed out after ${Math.round(timeoutMs / 1000)}s`,
		)
	}

	let res: Response
	try {
		res = await doUpload(targetHost)
	} catch (err: any) {
		// If initial upload to standard host failed and direct host is different, retry via direct host
		if (targetHost !== directHost) {
			res = await doUpload(directHost)
		} else {
			throw err
		}
	}

	// If Cloudflare returned 413 Payload Too Large on the standard host, automatically retry via direct host
	if (res.status === 413 && targetHost !== directHost) {
		res = await doUpload(directHost)
	}

	if (!res.ok) {
		throw new Error(
			`Zipline upload failed (${res.status}): ${await res.text().catch(() => '')}`,
		)
	}

	const json = await res.json()
	const uploaded = json?.files?.[0]
	if (!uploaded?.url) {
		throw new Error('Zipline upload response was missing a file URL')
	}

	return { url: uploaded.url, name: uploaded.name }
}

export async function shortenUrl(
	destination: string,
	token: string,
	rawHost?: string,
): Promise<string> {
	if (!token?.trim()) throw new Error('No Zipline token configured')

	const res = await withTimeout(
		fetch(`${getBaseUrl(rawHost)}/api/user/urls`, {
			method: 'POST',
			headers: {
				authorization: token.trim(),
				'content-type': 'application/json',
			},
			body: JSON.stringify({ destination }),
		}),
		15000,
		'Shorten timed out',
	)

	if (!res.ok) {
		throw new Error(
			`Zipline shorten failed (${res.status}): ${await res.text().catch(() => '')}`,
		)
	}

	const json = await res.json()
	if (!json?.url) throw new Error('Zipline shorten response was missing a URL')

	return json.url
}
