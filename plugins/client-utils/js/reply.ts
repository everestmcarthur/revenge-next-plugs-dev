import {
	getFinders,
	getMod,
	getMessageActions,
	getBotMessageMod,
	getDispatcher,
	getCurrentUserSafe,
	getSelectedChannelIdSafe,
	getAvatarUrl,
} from './stores'

export const formatReplyData = (opts: any, defaultFormat = 'embed') => {
	const chosenFormat = opts.format || defaultFormat

	if (chosenFormat === 'text') {
		let text = opts.content || ''
		const embed = opts.embed || (opts.embeds && opts.embeds[0])
		if (embed) {
			const parts: string[] = []
			if (embed.author?.name) parts.push(`### ${embed.author.name}`)
			if (embed.title) parts.push(`## ${embed.title}`)
			if (embed.description) parts.push(embed.description)
			if (embed.fields && Array.isArray(embed.fields)) {
				for (const f of embed.fields) {
					parts.push(`**${f.name}**\n${f.value}`)
				}
			}
			if (embed.footer?.text) parts.push(`-# ${embed.footer.text}`)
			if (embed.image?.url) parts.push(embed.image.url)
			const embedText = parts.join('\n\n')
			text = text ? `${text}\n\n${embedText}` : embedText
		}
		if (opts.imageUrl && !text.includes(opts.imageUrl)) {
			text = text ? `${text}\n${opts.imageUrl}` : opts.imageUrl
		}
		return {
			content: text,
			embeds: [],
			components: opts.components || [],
		}
	} else if (chosenFormat === 'cv2') {
		const components: any[] = []
		const embed = opts.embed || (opts.embeds && opts.embeds[0])
		let mainText = opts.content || ''
		if (embed?.title || embed?.description) {
			const header = embed.title ? `## ${embed.title}\n` : ''
			const desc = embed.description || ''
			mainText = mainText ? `${mainText}\n\n${header}${desc}` : `${header}${desc}`
		}
		if (mainText) {
			const section: any = {
				type: 9,
				components: [
					{
						type: 10,
						content: mainText,
					},
				],
			}
			if (embed?.thumbnail?.url) {
				section.accessory = {
					type: 11,
					media: {
						url: embed.thumbnail.url,
						proxy_url: embed.thumbnail.url,
					},
				}
			}
			components.push(section)
		}
		if (embed?.fields && Array.isArray(embed.fields)) {
			for (const f of embed.fields) {
				components.push({
					type: 9,
					components: [
						{
							type: 10,
							content: `**${f.name}**\n${f.value}`,
						},
					],
				})
			}
		}
		if (embed?.image?.url) {
			components.push({
				type: 12,
				items: [
					{
						media: {
							url: embed.image.url,
							proxy_url: embed.image.url,
						},
					},
				],
			})
		}
		if (embed?.footer?.text) {
			components.push({
				type: 14,
				divider: true,
				spacing: 1,
			})
			components.push({
				type: 9,
				components: [
					{
						type: 10,
						content: `-# ${embed.footer.text}`,
					},
				],
			})
		}
		if (opts.components && Array.isArray(opts.components)) {
			components.push(...opts.components)
		}
		const container: any = {
			type: 17,
			components,
		}
		if (embed?.color) {
			container.accent_color = embed.color
		}
		return {
			content: '',
			embeds: [],
			components: [container],
		}
	} else {
		let embeds = opts.embeds ? [...opts.embeds] : opts.embed ? [opts.embed] : []
		let content = opts.content || ''
		if (embeds.length === 0 && !opts.imageUrl && content && (!opts.components || opts.components.length === 0)) {
			embeds = [
				{
					type: 'rich',
					description: content,
					color: 0x5865f2,
				},
			]
			content = ''
		}
		return {
			content,
			embeds,
			components: opts.components || [],
		}
	}
}

export const sendReply = (
	channelId: string,
	options: any,
	defaultAuthorName = 'Client Utils',
	cmdName?: string,
	_pluginMeta?: any,
	logger?: any,
) => {
	try {
		const opts = typeof options === 'string' ? { content: options } : options
		const rawEph = opts.ephemeral
		const isEphemeral =
			rawEph === true || rawEph === 'true' || rawEph === 'True' || rawEph === 'yes' || rawEph === 1
		const msgActions = getMessageActions()
		const targetChannelId = channelId || getSelectedChannelIdSafe()
		const formatted = formatReplyData(opts)

		if (isEphemeral) {
			const snowflake = (BigInt(Date.now() - 1420070400000) << 22n).toString()
			const botMsgMod = getBotMessageMod()
			const botMsgFn = botMsgMod?.createBotMessage || botMsgMod?.default?.createBotMessage
			const base = botMsgFn && targetChannelId
				? botMsgFn({ channelId: targetChannelId, content: formatted.content || '', loggingName: 'client-utils' })
				: null

			const currentUser = getCurrentUserSafe()
			const userDisplayName =
				currentUser?.globalName || currentUser?.global_name || currentUser?.username || 'You'

			const authorName =
				opts.name ||
				opts.username ||
				opts.authorName ||
				opts.author?.username ||
				userDisplayName
			const customAvatar =
				opts.icon ||
				opts.picture ||
				opts.avatar ||
				opts.image ||
				opts.authorAvatar ||
				opts.author?.avatar
			const authorAvatar = customAvatar || currentUser?.avatar || null
			const authorAvatarUrl =
				typeof authorAvatar === 'string' && authorAvatar.startsWith('http')
					? authorAvatar
					: getAvatarUrl(currentUser)

			const msg = base || {
				id: snowflake,
				type: 0,
				flags: 64,
				content: formatted.content || '',
				channel_id: targetChannelId,
				author: {
					id: currentUser?.id || '0',
					username: authorName,
					discriminator: currentUser?.discriminator || '0000',
					avatar: authorAvatar,
					avatarURL: authorAvatarUrl,
					avatarDecorationData: currentUser?.avatarDecorationData || null,
					globalName: currentUser?.globalName || currentUser?.global_name || authorName,
					global_name: currentUser?.global_name || currentUser?.globalName || authorName,
					bot: false,
				},
				attachments: opts.attachments || [],
				embeds: formatted.embeds || [],
				components: formatted.components || [],
				pinned: false,
				mentions: [],
				mention_channels: [],
				mention_roles: [],
				mention_everyone: false,
				timestamp: new Date().toISOString(),
				state: 'SENT',
				tts: false,
				loggingName: 'client-utils',
			}

			if (msg.author) {
				msg.author.id = currentUser?.id || msg.author.id
				msg.author.username = authorName
				msg.author.discriminator = currentUser?.discriminator || msg.author.discriminator || '0000'
				msg.author.avatar = authorAvatar
				msg.author.avatarURL = authorAvatarUrl
				msg.author.avatarDecorationData = currentUser?.avatarDecorationData || null
				msg.author.globalName = currentUser?.globalName || currentUser?.global_name || authorName
				msg.author.global_name = currentUser?.global_name || currentUser?.globalName || authorName
				msg.author.bot = false
			}

			if (cmdName) {
				msg.interaction = {
					id: snowflake,
					type: 2,
					name: cmdName,
					user: {
						id: currentUser?.id || '0',
						username: currentUser?.username || 'You',
						discriminator: currentUser?.discriminator || '0000',
						avatar: currentUser?.avatar || null,
						global_name: currentUser?.globalName || currentUser?.global_name || currentUser?.username || 'You',
					},
				}
			}

			msg.content = formatted.content || ''
			if (formatted.embeds && formatted.embeds.length > 0) {
				msg.embeds = formatted.embeds
			}
			if (formatted.components && formatted.components.length > 0) {
				msg.components = formatted.components
			}
			if (opts.attachments) {
				msg.attachments = opts.attachments
			}

			if (msgActions?.receiveMessage) {
				msgActions.receiveMessage(targetChannelId, msg)
			} else {
				const dispatcher = getDispatcher()
				dispatcher?.dispatch?.({ type: 'MESSAGE_CREATE', channelId: targetChannelId, message: msg, optimistic: false })
			}
		} else {
			let text = formatted.content || ''
			if (opts.imageUrl && !text.includes(opts.imageUrl)) {
				text = text ? `${text}\n${opts.imageUrl}` : opts.imageUrl
			} else if (opts.embed?.image?.url && !text.includes(opts.embed.image.url)) {
				text = text ? `${text}\n${opts.embed.image.url}` : opts.embed.image.url
			}

			if (!text && (!formatted.embeds || formatted.embeds.length === 0) && (!formatted.components || formatted.components.length === 0)) return
			if (!targetChannelId) return

			const nonce = (BigInt(Date.now() - 1420070400000) << 22n).toString()

			const hasCustomPayload = (formatted.components && formatted.components.length > 0) || (formatted.embeds && formatted.embeds.length > 0)
			const filters = getFinders()?.filters
			const RestAPI = getMod(filters?.withProps('get', 'post', 'del'))
			if (hasCustomPayload && RestAPI?.post) {
				RestAPI.post({
					url: `/channels/${targetChannelId}/messages`,
					body: {
						content: text,
						tts: false,
						nonce,
						flags: 0,
						embeds: formatted.embeds || [],
						components: formatted.components || [],
					},
				}).catch(() => {
					const msgPayload = {
						content: text || (formatted.embeds?.[0]?.description ?? ''),
						tts: false,
						invalidEmojis: [],
						validNonShortcutEmojis: [],
					}
					if (typeof msgActions?._sendMessage === 'function') {
						msgActions._sendMessage(targetChannelId, msgPayload, { nonce })
					} else if (typeof msgActions?.sendMessage === 'function') {
						msgActions.sendMessage(targetChannelId, msgPayload, null, { nonce })
					}
				})
			} else {
				const msgPayload = {
					content: text,
					tts: false,
					invalidEmojis: [],
					validNonShortcutEmojis: [],
				}
				if (typeof msgActions?._sendMessage === 'function') {
					msgActions._sendMessage(targetChannelId, msgPayload, { nonce })
				} else if (typeof msgActions?.sendMessage === 'function') {
					msgActions.sendMessage(targetChannelId, msgPayload, null, { nonce })
				}
			}
		}
	} catch (err) {
		logger?.error?.(`[ClientUtils] sendReply error: ${err}`)
	}
}
