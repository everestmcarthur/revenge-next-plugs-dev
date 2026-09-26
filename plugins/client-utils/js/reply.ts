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

export const formatEmbedToMarkdown = (opts: any): string => {
	const embed = opts.embed || (opts.embeds && opts.embeds[0])
	const parts: string[] = []

	if (opts.content && typeof opts.content === 'string' && opts.content.trim()) {
		parts.push(opts.content.trim())
	}

	if (embed) {
		if (embed.author?.name) parts.push(`### ${embed.author.name}`)
		if (embed.title) parts.push(`## ${embed.title}`)
		if (embed.description) parts.push(embed.description)
		if (embed.fields && Array.isArray(embed.fields)) {
			for (const f of embed.fields) {
				if (f.name && f.value) {
					parts.push(`**${f.name}**: ${f.value}`)
				}
			}
		}
		if (embed.footer?.text) parts.push(`-# ${embed.footer.text}`)
	}

	const img = opts.imageUrl || embed?.image?.url || embed?.thumbnail?.url
	if (img && typeof img === 'string' && !parts.some((p) => p.includes(img))) {
		parts.push(img)
	}

	return parts.join('\n\n')
}

export const formatReplyData = (opts: any, defaultFormat = 'embed') => {
	const chosenFormat = opts.format || defaultFormat

	if (chosenFormat === 'text') {
		const text = formatEmbedToMarkdown(opts)
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
			content: formatEmbedToMarkdown(opts),
			embeds: [],
			components: [container],
		}
	} else {
		const embeds = opts.embeds ? [...opts.embeds] : opts.embed ? [opts.embed] : []
		let content = opts.content || ''
		if (!content) {
			content = formatEmbedToMarkdown(opts)
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
		const markdownText = formatEmbedToMarkdown(opts)

		if (isEphemeral) {
			const snowflake = (BigInt(Date.now() - 1420070400000) << 22n).toString()
			const botMsgMod = getBotMessageMod()
			const botMsgFn = botMsgMod?.createBotMessage || botMsgMod?.default?.createBotMessage
			const base = botMsgFn && targetChannelId
				? botMsgFn({ channelId: targetChannelId, content: markdownText || formatted.content || '', loggingName: 'client-utils' })
				: null

			const currentUser = getCurrentUserSafe()
			const authorName = defaultAuthorName || 'Client Utils'
			const authorAvatar =
				opts.icon ||
				opts.picture ||
				opts.avatar ||
				opts.image ||
				_pluginMeta?.icon ||
				_pluginMeta?.avatar ||
				'clyde'

			const msg = base || {
				id: snowflake,
				type: 0,
				flags: 64,
				content: markdownText || formatted.content || '',
				channel_id: targetChannelId,
				author: {
					id: '1',
					username: authorName,
					discriminator: '0000',
					avatar: authorAvatar,
					bot: true,
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
				msg.author.id = '1'
				msg.author.username = authorName
				msg.author.discriminator = '0000'
				msg.author.avatar = authorAvatar
				msg.author.bot = true
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

			msg.content = markdownText || formatted.content || ''
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
			} else if (msgActions?.sendBotMessage) {
				msgActions.sendBotMessage(targetChannelId, msg.content, msg.embeds, 'client-utils')
			} else {
				const dispatcher = getDispatcher()
				dispatcher?.dispatch?.({ type: 'MESSAGE_CREATE', channelId: targetChannelId, message: msg, optimistic: false })
			}
		} else {
			const textToSend = markdownText || formatted.content || ''
			if (!textToSend.trim() || !targetChannelId) return

			const nonce = (BigInt(Date.now() - 1420070400000) << 22n).toString()
			const msgPayload = {
				content: textToSend,
				tts: false,
				invalidEmojis: [],
				validNonShortcutEmojis: [],
			}

			if (typeof msgActions?._sendMessage === 'function') {
				msgActions._sendMessage(targetChannelId, msgPayload, { nonce })
			} else if (typeof msgActions?.sendMessage === 'function') {
				msgActions.sendMessage(targetChannelId, msgPayload, null, { nonce })
			} else {
				const filters = getFinders()?.filters
				const RestAPI = getMod(filters?.withProps('get', 'post', 'del'))
				if (RestAPI?.post) {
					RestAPI.post({
						url: `/channels/${targetChannelId}/messages`,
						body: {
							content: textToSend,
							tts: false,
							nonce,
							flags: 0,
						},
					}).catch((e: any) => {
						logger?.error?.(`[ClientUtils] RestAPI.post error: ${e}`)
					})
				}
			}
		}
	} catch (err) {
		logger?.error?.(`[ClientUtils] sendReply error: ${err}`)
	}
}
