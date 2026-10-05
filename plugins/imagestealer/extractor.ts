import type { StealableAsset } from './types'

const CUSTOM_EMOJI_REGEX = /<(a)?:([a-zA-Z0-9_]+):([0-9]{15,22})>/g
const DISCORD_EMOJI_URL_REGEX =
	/https?:\/\/cdn\.discordapp\.com\/emojis\/([0-9]{15,22})\.(png|webp|gif)/gi
const DISCORD_ATTACHMENT_URL_REGEX =
	/https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/attachments\/[^\s"')]+\.(png|jpe?g|webp|gif)/gi

/**
 * Parses all stealable assets (emojis, stickers, image attachments, media) from a Discord message or media item.
 */
export function extractStealableAssets(target: any): StealableAsset[] {
	if (!target) return []
	const assets: StealableAsset[] = []
	const seenIds = new Set<string>()

	const addAsset = (asset: StealableAsset) => {
		const key = asset.id || asset.url
		if (!seenIds.has(key)) {
			seenIds.add(key)
			assets.push(asset)
		}
	}

	// Direct media/attachment item check
	const directUrl =
		target.url ||
		target.proxy_url ||
		target.proxyUrl ||
		target.uri ||
		target.sourceURI ||
		target.mediaUrl ||
		target.item?.url ||
		target.item?.proxy_url ||
		target.item?.uri
	if (typeof directUrl === 'string' && directUrl.startsWith('http')) {
		const isGif =
			directUrl.toLowerCase().includes('.gif') ||
			target.contentType === 'image/gif'
		const filename =
			target.filename || target.item?.filename || target.name || 'image_asset'
		const cleanName = filename
			.replace(/\.[a-zA-Z0-9]+$/, '')
			.replace(/[^a-zA-Z0-9_]/g, '_')
		addAsset({
			id: target.id || directUrl,
			name: cleanName || 'image_asset',
			url: directUrl,
			animated: isGif,
			type: 'attachment',
		})
	}

	const message =
		target.message || target.channelMessage || target.targetMessage || target

	// 1. Extract Custom Emojis from message content (<:name:id> or <a:name:id>)
	const content = typeof message?.content === 'string' ? message.content : ''
	if (content) {
		let match: RegExpExecArray | null
		const regex = new RegExp(CUSTOM_EMOJI_REGEX.source, 'g')
		while (true) {
			match = regex.exec(content)
			if (!match) break
			const isAnimated = match[1] === 'a'
			const name = match[2]
			const id = match[3]
			const ext = isAnimated ? 'gif' : 'webp'
			addAsset({
				id,
				name,
				url: `https://cdn.discordapp.com/emojis/${id}.${ext}?size=128&quality=lossless`,
				animated: isAnimated,
				type: 'emoji',
				originalMessageId: message?.id,
				originalAuthor: message?.author?.username,
			})
		}

		// Also extract direct Discord emoji URLs pasted in text
		let urlMatch: RegExpExecArray | null
		const urlRegex = new RegExp(DISCORD_EMOJI_URL_REGEX.source, 'gi')
		while (true) {
			urlMatch = urlRegex.exec(content)
			if (!urlMatch) break
			const id = urlMatch[1]
			const ext = urlMatch[2].toLowerCase()
			const isAnimated = ext === 'gif'
			addAsset({
				id,
				name: `emoji_${id}`,
				url: `https://cdn.discordapp.com/emojis/${id}.${ext}?size=128&quality=lossless`,
				animated: isAnimated,
				type: 'emoji',
				originalMessageId: message?.id,
			})
		}

		// Direct Discord attachment URLs pasted in text
		let attMatch: RegExpExecArray | null
		const attRegex = new RegExp(DISCORD_ATTACHMENT_URL_REGEX.source, 'gi')
		while (true) {
			attMatch = attRegex.exec(content)
			if (!attMatch) break
			const fullUrl = attMatch[0]
			const ext = attMatch[1].toLowerCase()
			const isAnimated = ext === 'gif'
			addAsset({
				id: fullUrl,
				name: 'pasted_image',
				url: fullUrl,
				animated: isAnimated,
				type: 'attachment',
				originalMessageId: message?.id,
			})
		}
	}

	// 2. Extract Emojis from Message Reactions
	if (Array.isArray(message?.reactions)) {
		for (const r of message.reactions) {
			const emoji = r?.emoji
			if (emoji?.id) {
				const isAnimated = Boolean(emoji.animated)
				const ext = isAnimated ? 'gif' : 'webp'
				addAsset({
					id: emoji.id,
					name: emoji.name || 'reaction_emoji',
					url: `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=128&quality=lossless`,
					animated: isAnimated,
					type: 'emoji',
					originalMessageId: message?.id,
				})
			}
		}
	}

	// 3. Extract Stickers
	const stickers = message?.sticker_items || message?.stickers
	if (Array.isArray(stickers)) {
		for (const s of stickers) {
			if (s?.id) {
				const isAnimated = s.format_type === 2 || s.format_type === 4
				addAsset({
					id: s.id,
					name: s.name || 'sticker',
					url: `https://media.discordapp.net/stickers/${s.id}.png?size=160`,
					animated: isAnimated,
					type: 'sticker',
					originalMessageId: message?.id,
				})
			}
		}
	}

	// 4. Extract Attachments
	if (Array.isArray(message?.attachments)) {
		for (const att of message.attachments) {
			const url = att?.url || att?.proxy_url || att?.proxyUrl
			if (!url) continue
			const filename = att.filename || 'attachment'
			const isImage =
				att.content_type?.startsWith('image/') ||
				/\.(png|jpe?g|webp|gif)$/i.test(filename)

			if (isImage) {
				const isGif =
					filename.toLowerCase().endsWith('.gif') ||
					att.content_type === 'image/gif'
				const cleanName = filename
					.replace(/\.[a-zA-Z0-9]+$/, '')
					.replace(/[^a-zA-Z0-9_]/g, '_')
				addAsset({
					id: att.id || url,
					name: cleanName || 'image_asset',
					url,
					animated: isGif,
					type: 'attachment',
					originalMessageId: message?.id,
				})
			}
		}
	}

	// 5. Extract Images from Embeds
	if (Array.isArray(message?.embeds)) {
		for (const em of message.embeds) {
			const imgUrl =
				em?.image?.url ||
				em?.image?.proxy_url ||
				em?.thumbnail?.url ||
				em?.thumbnail?.proxy_url
			if (imgUrl) {
				const isGif = imgUrl.toLowerCase().includes('.gif')
				addAsset({
					id: imgUrl,
					name: em?.title || 'embed_image',
					url: imgUrl,
					animated: isGif,
					type: 'attachment',
					originalMessageId: message?.id,
				})
			}
		}
	}

	// 6. Extract User Avatar and Banner
	const user =
		target?.user ||
		target?.author ||
		message?.author ||
		(target?.avatar && target?.id ? target : null)
	if (user?.id) {
		if (user.avatar) {
			const isAnim = String(user.avatar).startsWith('a_')
			const ext = isAnim ? 'gif' : 'webp'
			addAsset({
				id: `avatar_${user.id}`,
				name: `${user.username || 'user'}_avatar`,
				url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=512`,
				animated: isAnim,
				type: 'avatar',
				originalAuthor: user.username,
			})
		}
		if (user.banner) {
			const isAnim = String(user.banner).startsWith('a_')
			const ext = isAnim ? 'gif' : 'webp'
			addAsset({
				id: `banner_${user.id}`,
				name: `${user.username || 'user'}_banner`,
				url: `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`,
				animated: isAnim,
				type: 'banner',
				originalAuthor: user.username,
			})
		}
	}

	// 7. Extract Guild Icon
	const guild =
		target?.guild ||
		(target?.icon && target?.id && !target?.username ? target : null)
	if (guild?.id && guild?.icon) {
		const isAnim = String(guild.icon).startsWith('a_')
		const ext = isAnim ? 'gif' : 'webp'
		addAsset({
			id: `guild_icon_${guild.id}`,
			name: `${(guild.name || 'guild').replace(/[^a-zA-Z0-9_]/g, '_')}_icon`,
			url: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=512`,
			animated: isAnim,
			type: 'attachment',
		})
	}

	return assets
}
