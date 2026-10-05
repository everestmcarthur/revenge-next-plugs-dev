import { findByProps, getCurrentUserId, showToast } from './components'
import { getStoredSettings } from './storage'
import type { GuildEmojiSlotInfo, VaultItem } from './types'

export const DEFAULT_WORKER_URL =
	'https://imagestealer-backend.allyapp.workers.dev'

function getRevenge(): any {
	try {
		if (typeof revenge !== 'undefined') return revenge
	} catch {}
	return (globalThis as any).revenge
}

export function getHTTPUtils(): any {
	try {
		const rev = getRevenge()
		if (typeof rev?.kmmiio?.getHTTPUtils === 'function') {
			const u = rev.kmmiio.getHTTPUtils()
			if (u?.post) return u
		}
		const finders = rev?.modules?.finders
		const filters = finders?.filters
		if (finders?.lookupModule && filters?.withProps) {
			const mods = finders.lookupModule(
				filters.withProps('getAPIBaseURL', 'get', 'post'),
			)
			if (mods?.[0]?.post) return mods[0]
			const httpMods = finders.lookupModule(filters.withProps('HTTP'))
			if (httpMods?.[0]?.HTTP?.post) return httpMods[0].HTTP
		}
	} catch {}
	return findByProps('getAPIBaseURL', 'post')
}

/**
 * Fetches user's vault items from Cloudflare KV backend.
 */
export async function fetchCloudflareVault(
	userId: string,
): Promise<VaultItem[]> {
	if (!userId) return []
	try {
		const settings = getStoredSettings()
		const baseUrl = settings.apiUrl || DEFAULT_WORKER_URL
		const res = await fetch(`${baseUrl}/api/vault/${userId}`)
		if (!res.ok) return []
		const data = await res.json()
		return Array.isArray(data?.items) ? data.items : []
	} catch (e) {
		console.warn('[ImageStealer] Failed to fetch vault from Cloudflare:', e)
		return []
	}
}

/**
 * Syncs/saves full vault list to Cloudflare KV.
 */
export async function saveCloudflareVault(
	userId: string,
	items: VaultItem[],
): Promise<boolean> {
	if (!userId) return false
	try {
		const settings = getStoredSettings()
		const baseUrl = settings.apiUrl || DEFAULT_WORKER_URL
		const res = await fetch(`${baseUrl}/api/vault/${userId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ items }),
		})
		return res.ok
	} catch (e) {
		console.warn('[ImageStealer] Failed to sync vault to Cloudflare:', e)
		return false
	}
}

/**
 * Converts an image URL to a base64 Data URI compatible with Discord Emoji Upload API.
 * Uses Discord's CDN ?size=128 param as fallback if original image exceeds 256KB.
 */
export async function urlToDataUri(
	url: string,
	autoCompress = true,
): Promise<string> {
	let fetchUrl = url
	let res = await fetch(fetchUrl)
	let blob = await res.blob()

	// If asset exceeds Discord's 256KB limit and auto-compression is on, request smaller CDN size
	if (autoCompress && blob.size > 256 * 1024) {
		if (
			fetchUrl.includes('cdn.discordapp.com') ||
			fetchUrl.includes('media.discordapp.net')
		) {
			fetchUrl =
				fetchUrl.replace(/\?size=\d+/, '') +
				(fetchUrl.includes('?') ? '&' : '?') +
				'size=128'
			res = await fetch(fetchUrl)
			blob = await res.blob()
		}
	}

	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => {
			if (typeof reader.result === 'string') {
				let dataUri = reader.result
				if (
					dataUri.startsWith('data:application/octet-stream;') ||
					!dataUri.startsWith('data:image/')
				) {
					const mime = url.includes('.gif')
						? 'image/gif'
						: url.includes('.webp')
							? 'image/webp'
							: 'image/png'
					dataUri = dataUri.replace(/^data:[^;]+;/, `data:${mime};`)
				}
				resolve(dataUri)
			} else {
				reject(new Error('Failed to convert image to Data URI'))
			}
		}
		reader.onerror = reject
		reader.readAsDataURL(blob)
	})
}

/**
 * Uploads an emoji to a guild using Discord's REST API.
 */
export async function uploadEmojiToGuild(
	guildId: string,
	name: string,
	imageUrl: string,
	autoCompress = true,
): Promise<{ success: boolean; error?: string; emoji?: any }> {
	try {
		const cleanName = name.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32)
		if (cleanName.length < 2) {
			return {
				success: false,
				error: 'Emoji name must be at least 2 characters long',
			}
		}

		const dataUri = await urlToDataUri(imageUrl, autoCompress)
		const http = getHTTPUtils()

		if (!http?.post) {
			return { success: false, error: 'Discord HTTP module not found' }
		}

		const result = await http.post({
			url: `/guilds/${guildId}/emojis`,
			body: {
				name: cleanName,
				image: dataUri,
				roles: [],
			},
		})

		const emoji = result?.body || result
		if (emoji?.id) {
			return { success: true, emoji }
		}

		return { success: true, emoji }
	} catch (e: any) {
		console.error('[ImageStealer] Error uploading emoji to guild:', e)
		const msg = e?.body?.message || e?.message || 'Upload failed'
		return { success: false, error: msg }
	}
}

/**
 * Retrieves all guilds where user has MANAGE_GUILD_EXPRESSIONS permissions,
 * and calculates static and animated slot usage.
 */
export function getManageableGuilds(): GuildEmojiSlotInfo[] {
	try {
		const rev = getRevenge()
		const GuildStore =
			rev?.everest?.getGuildStore?.() || findByProps('getGuild', 'getGuilds')
		const PermissionStore =
			rev?.everest?.getPermissionStore?.() || findByProps('getGuildPermissions')
		const GuildEmojiStore = findByProps('getEmojis', 'getUsableCustomEmoji')
		const myId = getCurrentUserId()

		const guildsMap = GuildStore?.getGuilds?.() || {}
		const guilds = Object.values(guildsMap) as any[]
		const results: GuildEmojiSlotInfo[] = []

		for (const g of guilds) {
			if (!g?.id) continue

			let canManage = false
			if (g.ownerId === myId) {
				canManage = true
			} else if (PermissionStore?.getGuildPermissions) {
				try {
					const perms = PermissionStore.getGuildPermissions(g)
					const pBig = BigInt(perms ?? 0)
					const MANAGE_EXPRESSIONS = 1n << 30n
					const ADMINISTRATOR = 1n << 3n
					if (
						(pBig & MANAGE_EXPRESSIONS) !== 0n ||
						(pBig & ADMINISTRATOR) !== 0n
					) {
						canManage = true
					}
				} catch {}
			}

			if (!canManage) continue

			// Calculate max slots based on premium tier
			const tier = Number(g.premiumTier || 0)
			const maxStatic =
				tier === 3 ? 250 : tier === 2 ? 150 : tier === 1 ? 100 : 50
			const maxAnimated = maxStatic

			// Count current emojis
			let emojis: any[] = []
			if (GuildEmojiStore?.getEmojis) {
				const raw = GuildEmojiStore.getEmojis(g.id)
				emojis = Array.isArray(raw) ? raw : Object.values(raw || {})
			} else if (Array.isArray(g.emojis)) {
				emojis = g.emojis
			}

			let staticCount = 0
			let animatedCount = 0
			for (const em of emojis) {
				if (em?.animated) animatedCount++
				else staticCount++
			}

			const iconUrl = g.icon
				? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`
				: undefined

			results.push({
				guildId: g.id,
				guildName: g.name || 'Unnamed Server',
				iconUrl,
				staticCount,
				animatedCount,
				maxStatic,
				maxAnimated,
				canUpload: true,
				isStaticFull: staticCount >= maxStatic,
				isAnimatedFull: animatedCount >= maxAnimated,
			})
		}

		// Sort: servers with most free slots first
		return results.sort((a, b) => {
			const freeA =
				a.maxStatic - a.staticCount + (a.maxAnimated - a.animatedCount)
			const freeB =
				b.maxStatic - b.staticCount + (b.maxAnimated - b.animatedCount)
			return freeB - freeA
		})
	} catch (e) {
		console.error('[ImageStealer] Error fetching manageable guilds:', e)
		return []
	}
}

/**
 * Uploads an image to self-hosted Zipline.
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
			name: `steal-${Date.now()}.png`,
			type: 'image/png',
		} as any)

		const res = await fetch(`https://${host}/api/upload`, {
			method: 'POST',
			headers: { authorization: token.trim() },
			body: form,
		})

		if (!res.ok) {
			console.warn(
				'[ImageStealer] Zipline upload responded with status:',
				res.status,
			)
			return null
		}

		const data = await res.json()
		const fileUrl = data?.files?.[0]?.url || data?.files?.[0]
		return typeof fileUrl === 'string' ? fileUrl : null
	} catch (e) {
		console.warn('[ImageStealer] Failed to upload to Zipline:', e)
		return null
	}
}

/**
 * Resolves configured Zipline credentials from quote or zipline plugin storage.
 */
export function resolveZiplineCredentials(): {
	token: string
	host: string
} | null {
	try {
		const settings = getStoredSettings()
		if (settings?.zipline?.enabled && settings.zipline.token?.trim()) {
			return {
				token: settings.zipline.token.trim(),
				host: settings.zipline.host || 'i.allyapp.cc',
			}
		}

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
 * Downloads image directly to device gallery using Discord's NativeFileModule.
 */
export async function downloadAsset(
	url: string,
	name: string,
	isAnimated = false,
): Promise<boolean> {
	try {
		const rev = getRevenge()
		const tmr =
			rev?.react?.ReactNative?.TurboModuleRegistry ||
			rev?.modules?.finders?.lookupModule?.(
				rev.modules.finders.filters.withProps('TurboModuleRegistry'),
			)?.[0]?.TurboModuleRegistry
		const fileMod = tmr?.get?.('NativeFileModule')

		if (fileMod?.writeFile && fileMod?.saveFileToGallery) {
			try {
				const ext = isAnimated ? 'gif' : url.includes('.webp') ? 'webp' : 'png'
				const mime = isAnimated
					? 'image/gif'
					: url.includes('.webp')
						? 'image/webp'
						: 'image/png'
				const cleanName =
					name.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'download'
				const filename = `${cleanName}_${Date.now()}.${ext}`

				const res = await fetch(url)
				const blob = await res.blob()
				const base64 = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader()
					reader.onloadend = () => {
						const data = reader.result as string
						const b64 = data.includes(',') ? data.split(',')[1] : data
						resolve(b64)
					}
					reader.onerror = reject
					reader.readAsDataURL(blob)
				})

				const cachedPath = await fileMod.writeFile(
					'cache',
					filename,
					base64,
					'base64',
				)
				const fileUri =
					'file://' +
					(cachedPath.startsWith('/') ? cachedPath : `/${cachedPath}`)
				await fileMod.saveFileToGallery(fileUri, filename, mime)

				try {
					await fileMod.removeFile('cache', filename)
				} catch {}

				showToast({
					content: `Saved :${name}: to gallery!`,
					variant: 'success',
				})
				return true
			} catch (err) {
				console.warn('[ImageStealer] NativeFileModule download failed:', err)
			}
		}

		// Fallback: Copy link to clipboard
		const { copyToClipboard } = await import('./components')
		copyToClipboard(url, `Copied link for :${name}:!`)
		return true
	} catch (e) {
		console.warn('[ImageStealer] Download error:', e)
		showToast({
			content: `Failed to download :${name}:`,
			variant: 'critical',
		})
		return false
	}
}
