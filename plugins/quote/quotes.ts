import { findByProps } from './components'

function getRevenge(): any {
	try {
		if (typeof revenge !== 'undefined') return revenge
	} catch {}
	return (globalThis as any).revenge
}

import { showToast } from './toast'

export { showToast }

export function copyToClipboard(text: string): boolean {
	try {
		const rev = getRevenge()
		const bundled = rev?.externals?.ReactNativeClipboard?.Clipboard
		const clipboard =
			bundled ??
			rev?.externals?.ReactNativeClipboard ??
			rev?.react?.ReactNative?.Clipboard
		if (typeof clipboard?.setString === 'function') {
			clipboard.setString(text)
			showToast('Quote link copied to clipboard!')
			return true
		}
	} catch (e) {
		console.error('[Quote] Error copying to clipboard:', e)
	}
	showToast('Failed to copy quote URL')
	return false
}

export function getCurrentUserId(): string {
	try {
		const rev = getRevenge()
		const userStore = rev?.everest?.getUserStore?.()
		if (typeof userStore?.getCurrentUser === 'function') {
			const u = userStore.getCurrentUser()
			if (u?.id) return u.id
		}

		const finders = rev?.modules?.finders
		if (finders?.lookupModule && finders?.filters?.withProps) {
			const mods = finders.lookupModule(
				finders.filters.withProps('getCurrentUser'),
			)
			if (mods) {
				for (let i = 0; i < mods.length; i++) {
					try {
						const u = mods[i]?.getCurrentUser?.()
						if (u?.id) return u.id
					} catch {}
				}
			}
		}

		const fallback = findByProps('getCurrentUser')
		return fallback?.getCurrentUser?.()?.id || ''
	} catch {
		return ''
	}
}

export function getMessageActions(): any {
	try {
		const rev = getRevenge()
		const finders = rev?.modules?.finders
		const filters = finders?.filters
		if (finders?.lookupModule && filters?.withProps) {
			const mods = finders.lookupModule(
				filters.withProps('sendMessage', 'editMessage'),
			)
			if (mods?.[0]?.sendMessage || mods?.[0]?._sendMessage) return mods[0]
			const mods2 = finders.lookupModule(
				filters.withProps('receiveMessage', 'sendMessage'),
			)
			if (mods2?.[0]?.sendMessage || mods2?.[0]?._sendMessage) return mods2[0]
		}
	} catch {}
	return findByProps('sendMessage', 'editMessage') ?? findByProps('sendMessage')
}

export function sendQuoteToChannel(
	rawChannelId: string,
	quoteUrl: string,
): boolean {
	const currentChannel = getSelectedChannelIdSafe()
	const channelId = currentChannel || rawChannelId
	if (!channelId || !quoteUrl) {
		showToast('Failed to send quote: Missing channel ID or URL')
		return false
	}

	try {
		const actions = getMessageActions()
		const nonce = (BigInt(Date.now() - 1420070400000) << 22n).toString()
		const msgPayload = {
			content: quoteUrl,
			tts: false,
			invalidEmojis: [],
			validNonShortcutEmojis: [],
		}
		const opts = { nonce }

		if (typeof actions?._sendMessage === 'function') {
			try {
				actions._sendMessage(channelId, msgPayload, opts)
				showToast('Quote sent to channel!')
				return true
			} catch (e1) {
				console.warn('[Quote] _sendMessage failed, trying sendMessage:', e1)
			}
		}

		if (typeof actions?.sendMessage === 'function') {
			try {
				actions.sendMessage(channelId, msgPayload, true, opts)
				showToast('Quote sent to channel!')
				return true
			} catch (_e2) {
				try {
					actions.sendMessage(channelId, msgPayload, void 0, opts)
					showToast('Quote sent to channel!')
					return true
				} catch (e3) {
					console.warn('[Quote] sendMessage fallback failed:', e3)
				}
			}
		}

		// Direct RestAPI fallback
		const rev = getRevenge()
		const finders = rev?.modules?.finders
		const filters = finders?.filters
		const rest = finders?.lookupModule?.(
			filters?.withProps('get', 'post', 'del'),
		)?.[0]
		if (rest?.post) {
			rest.post({
				url: `/channels/${channelId}/messages`,
				body: {
					content: quoteUrl,
					tts: false,
					nonce,
					flags: 0,
				},
			})
			showToast('Quote sent to channel!')
			return true
		}

		showToast('Failed to send quote: sendMessage action not found')
		return false
	} catch (e) {
		console.error('[Quote] Error sending message:', e)
		showToast('Failed to send quote')
		return false
	}
}

export interface ExtractedMessageInfo {
	text: string
	username: string
	displayName: string
	avatarUrl: string
	targetUserId: string
	channelId: string
	hasSpoilers: boolean
	roleColor?: string
	replyAuthor?: string
	attachmentUrl?: string
}

/**
 * Extracts all necessary display details from a Discord message instance.
 */
export function extractMessageInfo(
	message: any,
	channelId?: string,
	heldAttachment?: any,
): ExtractedMessageInfo {
	const rev = getRevenge()
	const GuildMemberStore =
		rev?.everest?.getGuildMemberStore?.() ?? findByProps('getMember')

	const author = message?.author ?? {}
	const targetUserId = author?.id ?? ''
	const username = author?.username ?? 'User'
	const guildId = message?.guild_id ?? message?.guildId

	// Resolve nickname & member details if available in guild
	const member =
		guildId && targetUserId && GuildMemberStore?.getMember
			? GuildMemberStore.getMember(guildId, targetUserId)
			: null

	const displayName =
		member?.nick || author?.globalName || author?.username || 'User'

	// Resolve avatar URL
	let avatarUrl = ''
	if (typeof author?.getAvatarURL === 'function') {
		avatarUrl = author.getAvatarURL(guildId, 128)
	} else if (member?.avatar && guildId) {
		avatarUrl = `https://cdn.discordapp.com/guilds/${guildId}/users/${targetUserId}/avatars/${member.avatar}.png?size=128`
	} else if (author?.avatar) {
		avatarUrl = `https://cdn.discordapp.com/avatars/${targetUserId}/${author.avatar}.png?size=128`
	} else if (targetUserId) {
		try {
			const defaultIndex = (BigInt(targetUserId) >> 22n) % 6n
			avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`
		} catch {
			avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png'
		}
	} else {
		avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png'
	}

	// Ensure png format for MIQ backend compatibility
	if (avatarUrl.includes('.webp')) {
		avatarUrl = avatarUrl.replace('.webp', '.png')
	}

	// Extract attachment URL if available (held image or message attachment)
	let attachmentUrl: string | undefined
	if (heldAttachment?.url) {
		attachmentUrl = heldAttachment.url
	} else if (heldAttachment?.proxy_url) {
		attachmentUrl = heldAttachment.proxy_url
	} else if (message?.attachments?.length) {
		attachmentUrl =
			message.attachments[0].url || message.attachments[0].proxy_url
	}

	// Extract text content or attachment fallback
	let text = message?.content || ''
	if (!text && heldAttachment) {
		text = heldAttachment.description || heldAttachment.filename || '[Image]'
	} else if (!text && message?.attachments?.length) {
		text =
			message.attachments[0].description ||
			message.attachments[0].filename ||
			'[Image]'
	} else if (!text && message?.sticker_items?.length) {
		text = `:${message.sticker_items[0].name}:`
	}

	// Check for reply reference
	let replyAuthor: string | undefined
	if (message?.referenced_message?.author) {
		const refAuthor = message.referenced_message.author
		replyAuthor = refAuthor.globalName || refAuthor.username
	}

	// Check for role color if member has one
	let roleColor: string | undefined
	if (member?.colorString) {
		roleColor = member.colorString
	}

	// Check for spoilers: ||...|| syntax or spoiler attachments
	const hasSpoilerSyntax = /\|\|[\s\S]+?\|\|/.test(message?.content || '')
	const hasSpoilerAttachment =
		Array.isArray(message?.attachments) &&
		message.attachments.some(
			(att: any) => att?.spoiler || att?.filename?.startsWith('SPOILER_'),
		)
	const hasSpoilers = hasSpoilerSyntax || hasSpoilerAttachment

	const currentChannel = getSelectedChannelIdSafe()
	const finalChannelId =
		currentChannel ||
		channelId ||
		message?.channel_id ||
		message?.channelId ||
		''

	return {
		text,
		username,
		displayName,
		avatarUrl,
		targetUserId,
		channelId: finalChannelId,
		hasSpoilers,
		roleColor,
		replyAuthor,
		attachmentUrl,
	}
}

export function getSelectedChannelIdSafe(): string {
	try {
		const rev = getRevenge()
		const store =
			rev?.everest?.getSelectedChannelStore?.() ||
			rev?.modules?.finders?.lookupModule?.(
				rev.modules.finders.filters.withProps(
					'getChannelId',
					'getVoiceChannelId',
				),
			)?.[0] ||
			findByProps('getChannelId', 'getVoiceChannelId')
		const id = store?.getChannelId?.() || store?.getVoiceChannelId?.()
		if (id && typeof id === 'string') return id
	} catch {}
	return ''
}

/**
 * Extracts display details from a Discord user instance (for User Action Sheets).
 * Searches for the user's latest message in the channel if available.
 */
export function extractUserInfo(
	rawUser: any,
	channelId?: string,
): ExtractedMessageInfo {
	const rev = getRevenge()
	const UserStore = rev?.everest?.getUserStore?.() ?? findByProps('getUser')
	let user = rawUser?.user || rawUser
	if (typeof user === 'string') {
		user = UserStore?.getUser?.(user) || { id: user }
	}

	const targetUserId = user?.id || ''
	const username = user?.username || 'User'
	const displayName = user?.globalName || user?.username || 'User'

	const finalChannelId = channelId || getSelectedChannelIdSafe() || ''

	// Search for user's latest message in the current channel if available
	let text = ''
	let hasSpoilers = false
	let roleColor: string | undefined
	let replyAuthor: string | undefined

	try {
		const MessageStore =
			rev?.everest?.getMessageStore?.() ??
			findByProps('getMessages', 'getMessage')
		if (finalChannelId && targetUserId && MessageStore?.getMessages) {
			const channelMessages = MessageStore.getMessages(finalChannelId)
			const msgsList =
				channelMessages?.toArray?.() ||
				channelMessages?._array ||
				(Array.isArray(channelMessages) ? channelMessages : [])

			for (let i = msgsList.length - 1; i >= 0; i--) {
				const m = msgsList[i]
				if (m?.author?.id === targetUserId && m?.content) {
					text = m.content
					hasSpoilers = /\|\|[\s\S]+?\|\|/.test(text)
					if (m.referenced_message?.author) {
						replyAuthor =
							m.referenced_message.author.globalName ||
							m.referenced_message.author.username
					}
					break
				}
			}
		}
	} catch {}

	let avatarUrl = ''
	if (user?.avatar) {
		avatarUrl = `https://cdn.discordapp.com/avatars/${targetUserId}/${user.avatar}.png?size=128`
	} else if (targetUserId) {
		try {
			const defaultIndex = (BigInt(targetUserId) >> 22n) % 6n
			avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`
		} catch {
			avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png'
		}
	} else {
		avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png'
	}

	return {
		text: text || 'No recent messages found',
		username,
		displayName,
		avatarUrl,
		targetUserId,
		channelId: finalChannelId,
		hasSpoilers,
		roleColor,
		replyAuthor,
	}
}
