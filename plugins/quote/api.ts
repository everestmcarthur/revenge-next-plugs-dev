import { renderDiscordMarkdownToUnicode } from './markdown'
import { getCurrentUserId } from './quotes'
import { getStoredSettings } from './storage'
import type { MIQUserConfig, QuoteRequestOptions } from './types'

export const CLOUDFLARE_WORKER_URL = 'https://miq-backend.allyapp.workers.dev'
export const DEFAULT_MIQ_API_URL = 'http://127.0.0.1:8081/fakequote'
export const FALLBACK_MIQ_API_URL = 'https://api.voids.top/fakequote'

export interface CheckQuoteResult {
	allowed: boolean
	reason?: string
	setting?: string
}

export interface GenerateQuoteResponse {
	success: boolean
	url?: string
	ziplineUrl?: string
	error?: string
}

interface CachedCheck {
	result: CheckQuoteResult
	expiry: number
}

const checkCache = new Map<string, CachedCheck>()
const CHECK_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getRevenge(): any {
	try {
		if (typeof revenge !== 'undefined') return revenge
	} catch {}
	return (globalThis as any).revenge
}

/**
 * Checks Cloudflare KV backend if creating a quote from the target user is permitted
 * based on their privacy preferences (all, spoilers, or custom quote block).
 * Includes fast-path for self-quotes, in-memory TTL caching, and a 1.2s timeout fallback.
 */
export async function checkQuoteAllowed(
	targetUserId: string,
	hasSpoilers: boolean,
	isCustom: boolean,
): Promise<CheckQuoteResult> {
	if (!targetUserId) return { allowed: true }

	// Fast-path: Quoting yourself is always allowed (0ms latency)
	try {
		const myId = getCurrentUserId()
		if (myId && targetUserId === myId) {
			return { allowed: true }
		}
	} catch {}

	// In-memory cache check
	const cacheKey = `${targetUserId}:${hasSpoilers}:${isCustom}`
	const cached = checkCache.get(cacheKey)
	if (cached && Date.now() < cached.expiry) {
		return cached.result
	}

	try {
		// Timeout race: never let slow Cloudflare worker delay quote generation past 1.2s
		const fetchPromise = fetch(`${CLOUDFLARE_WORKER_URL}/api/check`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				userId: targetUserId,
				hasSpoilers,
				isCustom,
			}),
		})

		let timerId: any
		const timeoutPromise = new Promise<null>(resolve => {
			timerId = setTimeout(() => resolve(null), 1200)
		})

		const res = await Promise.race([fetchPromise, timeoutPromise])
		if (timerId) clearTimeout(timerId)

		if (!res?.ok) {
			// Default to allowed if backend check times out or network fails
			return { allowed: true }
		}

		const data = (await res.json()) as CheckQuoteResult
		checkCache.set(cacheKey, {
			result: data,
			expiry: Date.now() + CHECK_CACHE_TTL,
		})
		return data
	} catch (e) {
		console.warn('[Quote] Failed to check block status from Cloudflare:', e)
		return { allowed: true }
	}
}

/**
 * Fetches user configuration from Cloudflare KV backend.
 */
export async function fetchUserConfig(
	userId: string,
): Promise<MIQUserConfig | null> {
	try {
		const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/config/${userId}`)
		if (!res.ok) return null
		return (await res.json()) as MIQUserConfig
	} catch (e) {
		console.warn('[Quote] Failed to fetch user config:', e)
		return null
	}
}

/**
 * Saves user configuration to Cloudflare KV backend.
 */
export async function saveUserConfig(
	userId: string,
	config: Partial<MIQUserConfig>,
): Promise<boolean> {
	try {
		const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/config/${userId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(config),
		})
		return res.ok
	} catch (e) {
		console.warn('[Quote] Failed to save user config:', e)
		return false
	}
}

/**
 * Uploads an image URL to a self-hosted Zipline instance.
 */
export async function uploadToZipline(
	imageUrl: string,
	token: string,
	rawHost?: string,
): Promise<string | null> {
	if (!token?.trim()) return null
	try {
		const host = (rawHost || 'i.allyapp.cc')
			.replace(/^https?:\/\//, '')
			.replace(/\/$/, '')

		const form = new FormData()
		form.append('file', {
			uri: imageUrl,
			name: `quote-${Date.now()}.png`,
			type: 'image/png',
		} as any)

		const res = await fetch(`https://${host}/api/upload`, {
			method: 'POST',
			headers: { authorization: token.trim() },
			body: form,
		})

		if (!res.ok) {
			console.warn('[Quote] Zipline upload responded with status:', res.status)
			return null
		}

		const data = await res.json()
		const fileUrl = data?.files?.[0]?.url || data?.files?.[0]
		return typeof fileUrl === 'string' ? fileUrl : null
	} catch (e) {
		console.warn('[Quote] Failed to upload quote to Zipline:', e)
		return null
	}
}

/**
 * Resolves configured Zipline credentials from quote settings or Zipline plugin storage.
 */
export function resolveZiplineCredentials(): {
	token: string
	host: string
} | null {
	try {
		// 1. Check Quote plugin's explicit zipline configuration
		const settings = getStoredSettings()
		if (settings?.zipline?.enabled && settings.zipline.token?.trim()) {
			return {
				token: settings.zipline.token.trim(),
				host: settings.zipline.host || 'i.allyapp.cc',
			}
		}

		// 2. Check Zipline plugin's installed storage
		const rev = getRevenge()
		const ziplineStorage = rev?.jsonStorage?.getJsonStorage?.(
			'dev.everestmcarthur.zipline',
		)
		const zCache = ziplineStorage?.cache
		if (zCache?.token?.trim()) {
			return {
				token: zCache.token.trim(),
				host: zCache.host || 'i.allyapp.cc',
			}
		}
	} catch {}
	return null
}

/**
 * Calls MIQ API to generate a quote card PNG image URL and optionally saves to Zipline.
 */
export async function generateQuoteCard(
	payload: QuoteRequestOptions,
): Promise<GenerateQuoteResponse> {
	try {
		const text = renderDiscordMarkdownToUnicode(
			payload.text || '...',
			Boolean(payload.bold),
		)

		const apiBody: Record<string, any> = {
			text,
			avatar: payload.avatar,
			username: payload.username,
			display_name: payload.display_name,
			color: Boolean(payload.color),
		}

		if (payload.watermark?.trim()) {
			apiBody.watermark = payload.watermark.trim()
		}
		if (payload.light) apiBody.light = true
		if (payload.flip) apiBody.flip = true
		if (payload.new) apiBody.new = true
		if (payload.gif) apiBody.gif = true
		const settings = getStoredSettings()
		const targetUrl = settings?.apiUrl?.trim() || DEFAULT_MIQ_API_URL

		let res: Response | null = null
		try {
			res = await fetch(targetUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(apiBody),
			})
		} catch (fetchErr) {
			if (targetUrl !== FALLBACK_MIQ_API_URL) {
				console.warn('[Quote] Primary API failed, trying fallback:', fetchErr)
				try {
					res = await fetch(FALLBACK_MIQ_API_URL, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(apiBody),
					})
				} catch {}
			}
		}

		if (!res?.ok) {
			const errText = await res?.text().catch(() => 'Unknown API error')
			return {
				success: false,
				error: errText || 'Failed to connect to Quote API',
			}
		}

		const data = await res.json()
		if (!data?.success || !data?.url) {
			return {
				success: false,
				error: data?.error || 'Quote generation failed',
			}
		}

		const response: GenerateQuoteResponse = {
			success: true,
			url: data.url,
		}

		// Attempt optional Zipline upload if credentials are provided/available
		const ziplineCreds = resolveZiplineCredentials()
		if (ziplineCreds) {
			const zUrl = await uploadToZipline(
				data.url,
				ziplineCreds.token,
				ziplineCreds.host,
			)
			if (zUrl) {
				response.ziplineUrl = zUrl
			}
		}

		return response
	} catch (e) {
		return { success: false, error: String(e) }
	}
}
