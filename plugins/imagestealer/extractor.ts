import type { StealableAsset } from './types'

const CUSTOM_EMOJI_REGEX = /<(a)?:([a-zA-Z0-9_]+):([0-9]{15,22})>/g

/**
 * Parses all stealable assets (emojis, stickers, image attachments) from a Discord message.
 */
export function extractStealableAssets(message: any): StealableAsset[] {
	if (!message) return []
	const assets: StealableAsset[] = []
	const seenIds = new Set<string>()

	const addAsset = (asset: StealableAsset) => {
		const key = asset.id || asset.url
		if (!seenIds.has(key)) {
			seenIds.add(key)
			assets.push(asset)
		}
	}

	// 1. Extract Custom Emojis from message content
	const content = typeof message.content === 'string' ? message.content : ''
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
				originalMessageId: message.id,
				originalAuthor: message.author?.username,
			})
		}
	}

	// 2. Extract Emojis from Message Reactions
	if (Array.isArray(message.reactions)) {
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
					originalMessageId: message.id,
				})
			}
		}
	}

	// 3. Extract Stickers
	const stickers = message.sticker_items || message.stickers
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
					originalMessageId: message.id,
				})
			}
		}
	}

	// 4. Extract Attachments
	if (Array.isArray(message.attachments)) {
		for (const att of message.attachments) {
			const url = att?.url || att?.proxy_url
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
					originalMessageId: message.id,
				})
			}
		}
	}

	return assets
}
