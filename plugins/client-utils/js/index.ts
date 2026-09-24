import { discordModules } from '../../shared/discord-modules'
import * as builders from './builders'

const getFinders = () => {
	try {
		if (typeof revenge !== 'undefined' && revenge?.modules?.finders) {
			return revenge.modules.finders
		}
	} catch {}
	return (globalThis as any).revenge?.modules?.finders
}
const getMod = (filter: any) => {
	const finders = getFinders()
	if (!finders?.lookupModule) return undefined
	const res = finders.lookupModule(filter) as any
	const m = Array.isArray(res) ? res[0] : res
	if (!m) return undefined
	return m.default || m
}

const DISCORD_EPOCH = 1420070400000n
const getSnowflakeDate = (id: string | bigint) => {
	try {
		const ms = Number((BigInt(id) >> 22n) + DISCORD_EPOCH)
		return Math.floor(ms / 1000)
	} catch {
		return null
	}
}

const isEphemeralArg = (val: any) => {
	if (val === undefined || val === null || val === '') return false
	if (typeof val === 'string') {
		const s = val.toLowerCase().trim()
		return s === 'true' || s === 'yes' || s === '1'
	}
	if (typeof val === 'boolean') return val
	return false
}

function parseOptionValues(rawOptions: any) {
	const args: Record<string, any> = {}
	if (!rawOptions) return args

	const extractVal = (item: any): any => {
		if (item === null || item === undefined) return undefined
		if (typeof item !== 'object') return item
		if (item.value !== undefined) return item.value
		if (item.text !== undefined) return item.text
		if (item.id !== undefined) return item.id
		if (item.userId !== undefined) return item.userId
		return item
	}

	if (Array.isArray(rawOptions)) {
		for (const opt of rawOptions) {
			if (!opt) continue
			const optName = opt.name || opt.displayName
			if (optName) {
				args[optName] = extractVal(opt)
			}
		}
	} else if (typeof rawOptions === 'object') {
		for (const [key, val] of Object.entries(rawOptions)) {
			if (Array.isArray(val)) {
				const first: any = val[0]
				const optName = first?.name || key
				args[optName] = extractVal(first)
				if (optName !== key) {
					args[key] = args[optName]
				}
			} else if (typeof val === 'object' && val !== null) {
				const optName = (val as any).name || key
				args[optName] = extractVal(val)
				if (optName !== key) {
					args[key] = args[optName]
				}
			} else {
				args[key] = val
			}
		}
	}
	return args
}

export default plugin({
	start({ cleanup, logger }) {
		const filters = getFinders()?.filters
		const scopes = filters?.FilterScopes
		const getUserStore = () => getMod(filters?.withProps('getCurrentUser'))
		const getUserProfileStore = () => getMod(filters?.withProps('getUserProfile'))
		const getGuildStore = () => getMod(filters?.withProps('getGuild'))
		const getGuildMemberStore = () => getMod(filters?.withProps('getMember'))
		const getGuildMemberCountStore = () => getMod(filters?.withProps('getMemberCount'))
		const getChannelStore = () => getMod(filters?.withProps('getChannel'))
		const getSelectedChannelStore = () =>
			getMod(filters?.withProps('getLastSelectedChannelId')) || getMod(filters?.withProps('getChannelId'))
		const getSelectedChannelIdSafe = () => {
			try {
				const s = getSelectedChannelStore()
				return s?.getChannelId?.() || s?.getLastSelectedChannelId?.() || null
			} catch {
				return null
			}
		}
		const getMessageActions = () => {
			try {
				const raw = (globalThis as any).__r?.(7696)
				return (
					raw?.default ||
					raw ||
					getFinders()?.lookupModule?.(filters?.withProps('receiveMessage', 'sendMessage'), scopes?.All || 1)?.[0] ||
					getMod(filters?.withProps('receiveMessage', 'sendMessage'))
				)
			} catch {
				return null
			}
		}
		const getBotMessageMod = () => {
			try {
				const raw = (globalThis as any).__r?.(7992)
				return (
					raw?.default ||
					raw ||
					getFinders()?.lookupModule?.(filters?.withProps('createBotMessage'), scopes?.All || 1)?.[0] ||
					getMod(filters?.withProps('createBotMessage'))
				)
			} catch {
				return null
			}
		}
		const getDispatcher = () => {
			try {
				return (
					getFinders()?.lookupModule?.(filters?.withProps('dispatch', 'subscribe'), scopes?.All || 1)?.[0] ||
					getMod(filters?.withProps('dispatch', 'subscribe'))
				)
			} catch {
				return null
			}
		}
		const getApplicationStore = () => {
			try {
				const mods = getFinders()?.lookupModule?.(filters?.withProps('getApplication'), scopes?.All || 1)
				if (Array.isArray(mods)) {
					const found = mods.find((m: any) => typeof m?.getApplication === 'function')
					if (found) return found
				}
				return getMod(filters?.withProps('getApplication'))
			} catch {
				return null
			}
		}
		const IndexStore = getMod(filters?.withProps('indices'))

		const getCurrentUserSafe = () => {
			try {
				const us = getUserStore()
				return (
					us?.getCurrentUser?.() ||
					(globalThis as any).__r?.(1372)?.default?.getCurrentUser?.() ||
					(globalThis as any).__r?.(1372)?.getCurrentUser?.() ||
					{ id: '0', username: 'You', avatar: '858e9559e7ec01b194a2750ad12ab57e' }
				)
			} catch {
				return { id: '0', username: 'You', avatar: '858e9559e7ec01b194a2750ad12ab57e' }
			}
		}

		const getUserSafe = (id: any) => {
			try {
				const us = getUserStore()
				return (
					us?.getUser?.(id) ||
					(globalThis as any).__r?.(1372)?.default?.getUser?.(id) ||
					null
				)
			} catch {
				return null
			}
		}

		const getAvatarUrl = (user: any) => {
			if (!user) return 'https://cdn.discordapp.com/embed/avatars/0.png'
			if (user.avatar) {
				const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
				return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=1024`
			}
			const idx = (BigInt(user.id || 0) >> 22n) % 6n
			return `https://cdn.discordapp.com/embed/avatars/${idx}.png`
		}

		const getBannerUrl = (user: any, profile: any) => {
			const banner = profile?.banner || user?.banner
			if (!banner) return null
			const ext = banner.startsWith('a_') ? 'gif' : 'png'
			return `https://cdn.discordapp.com/banners/${user.id}/${banner}.${ext}?size=1024`
		}

		const getInitialsAvatar = (name: string) => {
			const parts = (name || '').trim().split(/\s+/)
			const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2) || 'CU').toUpperCase()
			return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=5865F2&color=fff&rounded=true`
		}

		const formatReplyData = (opts: any, defaultFormat = 'embed') => {
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

		const sendReply = (channelId: string, options: any, defaultAuthorName = 'Client Utils', cmdName?: string, pluginMeta?: any) => {
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
				logger.error(`[ClientUtils] sendReply error: ${err}`)
			}
		}

		const getSectionId = (pluginId: string, index: number) => {
			if (!pluginId || pluginId === 'dev.everestmcarthur.client-utils' || pluginId === 'client-utils') {
				return '999000000000000001'
			}
			let hash = 0n
			for (let i = 0; i < pluginId.length; i++) {
				hash = (hash * 31n + BigInt(pluginId.charCodeAt(i))) & 0x7fffffffffffffffn
			}
			const numStr = (hash % 8999999999999n + 1000000000000n).toString()
			return `999${numStr}${String(index % 10).padStart(2, '0')}`
		}

		const commands = new Map<string, any>()

		const registerCommand = (cmd: any, pluginMeta?: any) => {
			const meta = pluginMeta || cmd.plugin || cmd.category || cmd.section || cmd.application || {
				id: 'dev.everestmcarthur.client-utils',
				name: 'Client Utils',
				description: 'Custom client-side slash command utilities',
			}
			const rawIcon =
				meta.icon ||
				meta.avatar ||
				meta.picture ||
				meta.image ||
				cmd.icon ||
				cmd.avatar ||
				cmd.picture ||
				cmd.image
			const parsedMeta =
				typeof meta === 'string'
					? { id: meta, name: meta, icon: rawIcon }
					: {
							id: meta.id || meta.name || 'dev.everestmcarthur.client-utils',
							name: meta.name || meta.id || 'Client Utils',
							description: meta.description || 'Custom client-side slash commands',
							icon: rawIcon,
						}
			cmd._pluginMeta = parsedMeta
			commands.set(cmd.name, cmd)
			syncIndexStore()
		}

		const unregisterCommand = (name: string) => {
			commands.delete(name)
			syncIndexStore()
		}

		const buildAllSections = () => {
			const currentUser = getCurrentUserSafe()
			const defaultAvatar = currentUser?.avatar || '858e9559e7ec01b194a2750ad12ab57e'

			const pluginGroups = new Map<string, { meta: any; cmds: any[] }>()

			Array.from(commands.values()).forEach((cmd) => {
				const meta = cmd._pluginMeta || {
					id: 'dev.everestmcarthur.client-utils',
					name: 'Client Utils',
					description: 'Custom client-side slash command utilities',
				}
				const groupKey = meta.id || meta.name || 'dev.everestmcarthur.client-utils'
				if (!pluginGroups.has(groupKey)) {
					pluginGroups.set(groupKey, { meta, cmds: [] })
				}
				pluginGroups.get(groupKey)!.cmds.push(cmd)
			})

			const allSections: any[] = []
			const allCommands: any[] = []

			let sectionIndex = 1
			for (const [groupId, group] of pluginGroups.entries()) {
				const isClientUtils = groupId === 'dev.everestmcarthur.client-utils' || groupId === 'client-utils'
				const sectionId = isClientUtils
					? '999000000000000001'
					: getSectionId(groupId, sectionIndex)
				sectionIndex++

				const sectionName = group.meta.name || groupId
				const sectionIcon =
					group.meta.icon ||
					group.meta.avatar ||
					group.meta.picture ||
					group.meta.image ||
					getInitialsAvatar(sectionName)
				const sectionDesc = group.meta.description || 'Custom client-side slash commands'

				const sectionDescriptor = {
					type: 1,
					id: sectionId,
					name: sectionName,
					icon: sectionIcon,
					application: {
						id: sectionId,
						name: sectionName,
						description: sectionDesc,
						icon: sectionIcon,
						bot: {
							id: sectionId,
							username: sectionName,
							avatar: sectionIcon,
							bot: true,
						},
						flags: 0,
					},
					isUserApp: true,
					botId: sectionId,
				}

				const sectionCommandsMap: Record<string, any> = {}
				const sectionBuiltCommands = group.cmds.map((cmd, idx) => {
					const cmdId = isClientUtils
						? `9990000000000000${String(idx + 1).padStart(2, '0')}`
						: `${sectionId.slice(0, 16)}${String(idx + 1).padStart(2, '0')}`

					const discordOptions = (cmd.options || []).map((opt: any) => ({
						type: opt.type,
						name: opt.name,
						displayName: opt.displayName || opt.name,
						description: opt.description,
						displayDescription: opt.displayDescription || opt.description,
						required: !!opt.required,
						choices: opt.choices
							? opt.choices.map((c: any) => ({
									name: c.name,
									displayName: c.displayName || c.name,
									value: c.value,
								}))
							: undefined,
					}))

					const builtCmd = {
						id: cmdId,
						version: '1',
						applicationId: sectionId,
						name: cmd.name,
						untranslatedName: cmd.name,
						displayName: cmd.name,
						serverLocalizedName: cmd.name,
						type: 1,
						inputType: 3,
						description: cmd.description,
						untranslatedDescription: cmd.description,
						displayDescription: cmd.description,
						options: discordOptions,
						section: sectionDescriptor,
						dmPermission: true,
						contexts: [0, 1, 2],
						integration_types: [0, 1],
						handler: 1,
						rootCommand: {
							id: cmdId,
							type: 1,
							application_id: sectionId,
							version: '1',
							name: cmd.name,
							description: cmd.description,
							options: discordOptions,
							dm_permission: true,
							contexts: [0, 1, 2],
							integration_types: [0, 1],
							handler: 1,
							name_localized: cmd.name,
							description_localized: cmd.description,
						},
						_cmdRef: cmd,
					}

					sectionCommandsMap[cmdId] = builtCmd
					return builtCmd
				})

				allCommands.push(...sectionBuiltCommands)
				allSections.push({
					id: sectionId,
					name: sectionName,
					descriptor: sectionDescriptor,
					commands: sectionBuiltCommands,
					commandsMap: sectionCommandsMap,
				})
			}

			return { allSections, allCommands }
		}

		const syncIndexStore = () => {
			try {
				if (!IndexStore?.indices) return
				const { allSections, allCommands } = buildAllSections()
				const currentSecIds = new Set(allSections.map((s: any) => s.id))
				const currentCmdIds = new Set(allCommands.map((c: any) => c.id))

				const targetKeys = [
					...Object.getOwnPropertySymbols(IndexStore.indices),
					...Object.keys(IndexStore.indices),
				]

				targetKeys.forEach((key) => {
					const entry = IndexStore.indices[key]
					if (entry?.result) {
						if (!entry.result.commands) entry.result.commands = {}
						if (!entry.result.sections) entry.result.sections = {}

						for (const sId of Object.keys(entry.result.sections)) {
							if (sId.startsWith('999') && !currentSecIds.has(sId)) {
								delete entry.result.sections[sId]
							}
						}
						for (const cId of Object.keys(entry.result.commands)) {
							if (cId.startsWith('999') && !currentCmdIds.has(cId)) {
								delete entry.result.commands[cId]
							}
						}

						allSections.forEach((sec: any) => {
							entry.result.sections[sec.id] = {
								descriptor: sec.descriptor,
								commands: sec.commandsMap,
							}
							sec.commands.forEach((c: any) => {
								entry.result.commands[c.id] = c
							})
						})
					}
				})

				const currentUserSym = targetKeys.find((k) => typeof k === 'symbol') || Symbol.for('currentUser')
				if (!IndexStore.indices[currentUserSym]) {
					const initialSections: Record<string, any> = {}
					const initialCommands: Record<string, any> = {}
					allSections.forEach((sec: any) => {
						initialSections[sec.id] = {
							descriptor: sec.descriptor,
							commands: sec.commandsMap,
						}
						sec.commands.forEach((c: any) => {
							initialCommands[c.id] = c
						})
					})
					IndexStore.indices[currentUserSym] = {
						result: {
							commands: initialCommands,
							sections: initialSections,
						},
					}
				} else if (IndexStore.indices[currentUserSym]?.result) {
					const curResult = IndexStore.indices[currentUserSym].result
					if (!curResult.commands) curResult.commands = {}
					if (!curResult.sections) curResult.sections = {}

					for (const sId of Object.keys(curResult.sections)) {
						if (sId.startsWith('999') && !currentSecIds.has(sId)) {
							delete curResult.sections[sId]
						}
					}
					for (const cId of Object.keys(curResult.commands)) {
						if (cId.startsWith('999') && !currentCmdIds.has(cId)) {
							delete curResult.commands[cId]
						}
					}

					allSections.forEach((sec: any) => {
						curResult.sections[sec.id] = {
							descriptor: sec.descriptor,
							commands: sec.commandsMap,
						}
						sec.commands.forEach((c: any) => {
							curResult.commands[c.id] = c
						})
					})
				}
			} catch (e) {
				logger.error(`[ClientUtils] syncIndexStore error: ${e}`)
			}
		}

		let origQuery: any
		let origGetContextState: any
		let origGetUserState: any
		try {
			if (IndexStore) {
				origQuery = IndexStore.query
				origGetContextState = IndexStore.getContextState
				origGetUserState = IndexStore.getUserState

				IndexStore.query = function (withAffinitySuggestions: any, commandTypes: any, applicationId: any) {
					const res = origQuery ? origQuery.apply(this, arguments) : { commands: [], descriptors: [] }
					const { allSections, allCommands } = buildAllSections()
					let qText = ''
					for (let i = 0; i < arguments.length; i++) {
						const arg = arguments[i]
						if (typeof arg === 'string') {
							qText = arg.toLowerCase().trim()
							break
						} else if (arg && typeof arg === 'object' && typeof arg.text === 'string') {
							qText = arg.text.toLowerCase().trim()
							break
						}
					}

					const targetAppId =
						(applicationId && typeof applicationId === 'object' && applicationId.applicationId) ||
						(commandTypes && typeof commandTypes === 'object' && commandTypes.applicationId) ||
						(typeof applicationId === 'string' ? applicationId : null)

					if (targetAppId) {
						if (typeof targetAppId === 'string' && targetAppId.startsWith('999')) {
							const matching = allCommands.filter(
								(c: any) =>
									c.applicationId === targetAppId &&
									(!qText ||
										c.name.toLowerCase().includes(qText) ||
										c.displayName?.toLowerCase().includes(qText)),
							)
							const matchingSec = allSections.find((s: any) => s.id === targetAppId)
							return {
								...res,
								commands: matching,
								descriptors: matchingSec ? [matchingSec.descriptor] : [],
							}
						}
						return res
					}

					const matching = allCommands.filter(
						(c: any) =>
							!qText ||
							c.name.toLowerCase().includes(qText) ||
							c.displayName?.toLowerCase().includes(qText),
					)

					if (matching.length === 0) return res

					const matchingSecIds = new Set(matching.map((c: any) => c.applicationId))
					const matchingDescriptors = allSections
						.filter((s: any) => matchingSecIds.has(s.id))
						.map((s: any) => s.descriptor)

					const existingCmds = Array.isArray(res?.commands)
						? res.commands.filter((c: any) => !c?.id?.startsWith?.('999'))
						: []
					const existingDescs = Array.isArray(res?.descriptors)
						? res.descriptors.filter((d: any) => !d?.id?.startsWith?.('999'))
						: []

					return {
						...res,
						commands: [...existingCmds, ...matching],
						descriptors: [...existingDescs, ...matchingDescriptors],
					}
				}

				IndexStore.getContextState = function (type: any) {
					const res = origGetContextState ? origGetContextState.apply(this, arguments) : undefined
					if (res?.result) {
						const { allSections } = buildAllSections()
						if (!res.result.sections) res.result.sections = {}
						if (!res.result.commands) res.result.commands = {}
						allSections.forEach((sec: any) => {
							res.result.sections[sec.id] = { descriptor: sec.descriptor, commands: sec.commandsMap }
							sec.commands.forEach((c: any) => {
								res.result.commands[c.id] = c
							})
						})
					}
					return res
				}

				IndexStore.getUserState = function () {
					const res = origGetUserState ? origGetUserState.apply(this, arguments) : undefined
					if (res?.result) {
						const { allSections } = buildAllSections()
						if (!res.result.sections) res.result.sections = {}
						if (!res.result.commands) res.result.commands = {}
						allSections.forEach((sec: any) => {
							res.result.sections[sec.id] = { descriptor: sec.descriptor, commands: sec.commandsMap }
							sec.commands.forEach((c: any) => {
								res.result.commands[c.id] = c
							})
						})
					}
					return res
				}
			}
		} catch (err) {
			logger.error(`[ClientUtils] Failed to hook IndexStore: ${err}`)
		}

		let origGetApp: any
		let appStoreTarget: any
		const hookApplicationStore = () => {
			try {
				const appStore = getApplicationStore()
				if (!appStore) return
				const proto = Object.getPrototypeOf(appStore)
				const target = typeof proto?.getApplication === 'function' ? proto : appStore
				if (target && typeof target.getApplication === 'function' && !target.getApplication.__cu_hooked) {
					origGetApp = target.getApplication
					appStoreTarget = target
					const hooked = function (appId: string) {
						if (typeof appId === 'string' && appId.startsWith('999')) {
							const { allSections } = buildAllSections()
							const foundSec = allSections.find((s: any) => s.id === appId)
							if (foundSec) return foundSec.descriptor.application
							const currentUser = getCurrentUserSafe()
							const avatar = currentUser?.avatar || '858e9559e7ec01b194a2750ad12ab57e'
							return {
								id: appId,
								name: 'Custom Plugin',
								icon: avatar,
								description: 'Custom client-side slash command utilities',
								bot: {
									id: appId,
									username: 'Custom Plugin',
									avatar: avatar,
									discriminator: '0000',
									bot: true,
								},
								flags: 0n,
								isVerified: true,
							}
						}
						return origGetApp ? origGetApp.apply(this, arguments) : undefined
					}
					hooked.__cu_hooked = true
					target.getApplication = hooked
				}
			} catch (err) {
				logger.error(`[ClientUtils] Failed to hook ApplicationStore: ${err}`)
			}
		}
		hookApplicationStore()

		let IconMod: any
		try {
			const rawIconMod = (globalThis as any).__r?.(1397)
			IconMod = rawIconMod?.default || rawIconMod || getMod(filters?.withProps('getApplicationIconSource'))
			if (IconMod) {
				const unpatchSrc = revenge.patcher.instead(IconMod, 'getApplicationIconSource', (args: any, orig: any) => {
					const [app] = args
					const appId = app?.id || app?.applicationId || (typeof app === 'string' ? app : null)
					if (typeof appId === 'string' && appId.startsWith('999')) {
						const { allSections } = buildAllSections()
						const sec = allSections.find((s: any) => s.id === appId)
						const icon = sec?.descriptor?.icon
						if (icon && typeof icon === 'string' && icon.startsWith('http')) return { uri: icon }
						const sectionName = sec?.name || app?.name || (appId.includes('000000000001') ? 'Client Utils' : 'Rose Utils')
						return { uri: getInitialsAvatar(sectionName) }
					}
					return orig.apply(IconMod, args)
				})
				cleanup(unpatchSrc)

				const unpatchUrl = revenge.patcher.instead(IconMod, 'getApplicationIconURL', (args: any, orig: any) => {
					const [app] = args
					const appId = app?.id || app?.applicationId || (typeof app === 'string' ? app : null)
					if (typeof appId === 'string' && appId.startsWith('999')) {
						const { allSections } = buildAllSections()
						const sec = allSections.find((s: any) => s.id === appId)
						const icon = sec?.descriptor?.icon
						if (icon && typeof icon === 'string' && icon.startsWith('http')) return icon
						const sectionName = sec?.name || app?.name || (appId.includes('000000000001') ? 'Client Utils' : 'Rose Utils')
						return getInitialsAvatar(sectionName)
					}
					return orig.apply(IconMod, args)
				})
				cleanup(unpatchUrl)

				if (typeof IconMod.getUserAvatarSource === 'function') {
					const unpatchUserAvatarSrc = revenge.patcher.instead(IconMod, 'getUserAvatarSource', (args: any, orig: any) => {
						const user = args[0]
						if (typeof user?.avatar === 'string' && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://'))) {
							return { uri: user.avatar }
						}
						return orig.apply(IconMod, args)
					})
					cleanup(unpatchUserAvatarSrc)
				}

				if (typeof IconMod.getUserAvatarURL === 'function') {
					const unpatchUserAvatarUrl = revenge.patcher.instead(IconMod, 'getUserAvatarURL', (args: any, orig: any) => {
						const user = args[0]
						if (typeof user?.avatar === 'string' && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://'))) {
							return user.avatar
						}
						return orig.apply(IconMod, args)
					})
					cleanup(unpatchUserAvatarUrl)
				}
			}
		} catch (err) {
			logger.error(`[ClientUtils] Failed to hook IconMod: ${err}`)
		}

		let CacheMod: any
		let origGetCached: any
		let origGetCachedSection: any
		let origGetCachedCmd: any
		let origUseDiscovery: any
		let origUseCachedResults: any
		let origUseQuery: any
		try {
			const cacheModId = discordModules['modules/application_commands/ApplicationCommandQueryApi.tsx']
			const rawCacheMod = (globalThis as any).__r?.(cacheModId)
			CacheMod =
				rawCacheMod?.default ||
				rawCacheMod ||
				getMod(filters.withProps('getCachedResults', 'getCachedApplicationSection', 'getCachedCommand'))

			if (CacheMod) {
				origGetCached = CacheMod.getCachedResults
				origGetCachedSection = CacheMod.getCachedApplicationSection
				origGetCachedCmd = CacheMod.getCachedCommand
				origUseDiscovery = CacheMod.useDiscovery
				origUseCachedResults = CacheMod.useCachedResults
				origUseQuery = CacheMod.useQuery

				if (origUseDiscovery) {
					CacheMod.useDiscovery = function (options: any) {
						const res = origUseDiscovery ? origUseDiscovery.apply(this, arguments) : {}
						try {
							hookApplicationStore()
							const { allSections, allCommands } = buildAllSections()

							const existingDescs = Array.isArray(res.sectionDescriptors)
								? res.sectionDescriptors.filter((d: any) => !d?.id?.startsWith?.('999'))
								: []
							const myDescs = allSections.map((s: any) => s.descriptor)

							const frecencyIndex = existingDescs.findIndex((d: any) => d?.id === '-2')
							let combinedDescs: any[]
							if (frecencyIndex >= 0) {
								combinedDescs = [
									...existingDescs.slice(0, frecencyIndex + 1),
									...myDescs,
									...existingDescs.slice(frecencyIndex + 1),
								]
							} else {
								combinedDescs = [...myDescs, ...existingDescs]
							}
							res.sectionDescriptors = combinedDescs

							const filterId = res.filteredSectionId
							if (filterId) {
								if (typeof filterId === 'string' && filterId.startsWith('999')) {
									const selectedSec = allSections.find((s: any) => s.id === filterId)
									if (selectedSec) {
										res.commandsByActiveSection = [
											{
												section: selectedSec.descriptor,
												data: selectedSec.commands,
											},
										]
										res.activeSections = [selectedSec.descriptor]
										res.commands = [...selectedSec.commands]
									}
								} else {
									if (Array.isArray(res.commandsByActiveSection)) {
										res.commandsByActiveSection = res.commandsByActiveSection.filter(
											(g: any) => !g.section?.id?.startsWith?.('999'),
										)
									}
									if (Array.isArray(res.activeSections)) {
										res.activeSections = res.activeSections.filter(
											(d: any) => !d?.id?.startsWith?.('999'),
										)
									}
									if (Array.isArray(res.commands)) {
										res.commands = res.commands.filter(
											(c: any) => !c?.id?.startsWith?.('999'),
										)
									}
								}
							} else {
								const existingGroups = Array.isArray(res.commandsByActiveSection)
									? res.commandsByActiveSection.filter((g: any) => !g.section?.id?.startsWith?.('999'))
									: []
								const myGroups = allSections.map((s: any) => ({
									section: s.descriptor,
									data: s.commands,
								}))
								res.commandsByActiveSection = [...myGroups, ...existingGroups]

								const existingActive = Array.isArray(res.activeSections)
									? res.activeSections.filter((d: any) => !d?.id?.startsWith?.('999'))
									: []
								res.activeSections = [...myDescs, ...existingActive]

								const existingCmds = Array.isArray(res.commands)
									? res.commands.filter((c: any) => !c?.id?.startsWith?.('999'))
									: []
								res.commands = [...allCommands, ...existingCmds]
							}
						} catch {}
						return res
					}
				}

				if (origUseCachedResults) {
					CacheMod.useCachedResults = function (arg0: any, CHAT: any, text: any) {
						const res = origUseCachedResults
							? origUseCachedResults.apply(this, arguments)
							: { commands: [], sections: [] }
						try {
							hookApplicationStore()
							const { allSections, allCommands } = buildAllSections()
							const q = (text || '').toLowerCase().trim()
							const matching = allCommands.filter(
								(c: any) => !q || c.name.toLowerCase().includes(q) || c.displayName?.toLowerCase().includes(q),
							)
							if (matching.length > 0) {
								const matchingSecIds = new Set(matching.map((c: any) => c.applicationId))
								const matchingSections = allSections
									.filter((s: any) => matchingSecIds.has(s.id))
									.map((s: any) => s.descriptor)
								const cList = Array.isArray(res.commands) ? res.commands : []
								const sList = Array.isArray(res.sections) ? res.sections : []
								return {
									commands: [...matching, ...cList.filter((c: any) => !c.id?.startsWith('999'))],
									sections: [...matchingSections, ...sList.filter((s: any) => !s.id?.startsWith('999'))],
								}
							}
						} catch {}
						return res
					}
				}

				if (origUseQuery) {
					CacheMod.useQuery = function (context: any, obj: any, options: any) {
						const res = origUseQuery
							? origUseQuery.apply(this, arguments)
							: { commands: [], descriptors: [] }
						try {
							hookApplicationStore()
							const { allSections, allCommands } = buildAllSections()
							const targetAppId = options?.applicationId || obj?.applicationId
							if (targetAppId) {
								if (typeof targetAppId === 'string' && targetAppId.startsWith('999')) {
									const q = (obj?.text || '').toLowerCase().trim()
									const matching = allCommands.filter(
										(c: any) =>
											c.applicationId === targetAppId &&
											(!q ||
												c.name.toLowerCase().includes(q) ||
												c.displayName?.toLowerCase().includes(q)),
									)
									const matchingSec = allSections.find((s: any) => s.id === targetAppId)
									return {
										commands: matching,
										descriptors: matchingSec ? [matchingSec.descriptor] : [],
									}
								}
								return res
							}
							const q = (obj?.text || '').toLowerCase().trim()
							const matching = allCommands.filter(
								(c: any) => !q || c.name.toLowerCase().includes(q) || c.displayName?.toLowerCase().includes(q),
							)
							if (matching.length > 0) {
								const matchingSecIds = new Set(matching.map((c: any) => c.applicationId))
								const matchingDescriptors = allSections
									.filter((s: any) => matchingSecIds.has(s.id))
									.map((s: any) => s.descriptor)
								const cList = Array.isArray(res.commands) ? res.commands : []
								const dList = Array.isArray(res.descriptors) ? res.descriptors : []
								return {
									commands: [...matching, ...cList.filter((c: any) => !c.id?.startsWith('999'))],
									descriptors: [
										...matchingDescriptors,
										...dList.filter((d: any) => !d.id?.startsWith('999')),
									],
								}
							}
						} catch {}
						return res
					}
				}

				CacheMod.getCachedResults = function (state: any, CHAT: any, query: any) {
					const orig = origGetCached ? origGetCached.apply(this, arguments) : { commands: [], sections: [] }
					const { allSections, allCommands } = buildAllSections()

					const qStr = typeof query === 'string' ? query : typeof CHAT === 'string' ? CHAT : ''
					const lq = qStr.toLowerCase().trim()

					const matching = allCommands.filter(
						(c: any) =>
							!lq ||
							c.name.toLowerCase().includes(lq) ||
							c.displayName?.toLowerCase().includes(lq),
					)

					if (matching.length === 0) {
						return orig
					}

					const matchingSecIds = new Set(matching.map((c: any) => c.applicationId))
					const matchingSections = allSections
						.filter((s: any) => matchingSecIds.has(s.id))
						.map((s: any) => s.descriptor)

					const origCmds = Array.isArray(orig?.commands) ? orig.commands : []
					const origSections = Array.isArray(orig?.sections) ? orig.sections : []

					return {
						commands: [...matching, ...origCmds.filter((c: any) => !c.id?.startsWith('999'))],
						sections: [...matchingSections, ...origSections.filter((s: any) => !s.id?.startsWith('999'))],
					}
				}

				CacheMod.getCachedApplicationSection = function (type: any, CHAT: any, appId: string) {
					if (typeof appId === 'string' && appId.startsWith('999')) {
						const { allSections } = buildAllSections()
						const found = allSections.find((s: any) => s.id === appId)
						if (found) return found.descriptor
					}
					return origGetCachedSection?.apply(this, arguments)
				}

				CacheMod.getCachedCommand = function (type: any, cmdId: string, appId: string) {
					if (typeof cmdId === 'string' && cmdId.startsWith('999')) {
						const { allSections, allCommands } = buildAllSections()
						const foundCmd = allCommands.find((c: any) => c.id === cmdId)
						if (foundCmd) {
							const foundSec = allSections.find((s: any) => s.id === foundCmd.applicationId)
							return {
								application: foundSec?.descriptor?.application,
								command: foundCmd,
								section: foundSec?.descriptor,
							}
						}
					}
					return origGetCachedCmd?.apply(this, arguments)
				}

				if (CacheMod.useCommandsForApplication) {
					const origUseCmds = CacheMod.useCommandsForApplication
					CacheMod.useCommandsForApplication = function (context: any, appId: string, options: any) {
						if (typeof appId === 'string' && appId.startsWith('999')) {
							const { allSections } = buildAllSections()
							const sec = allSections.find((s: any) => s.id === appId)
							return sec?.commands || []
						}
						return origUseCmds ? origUseCmds.apply(this, arguments) : []
					}
				}

				if (CacheMod.useAccessibleCommandsForApplication) {
					const origUseAccCmds = CacheMod.useAccessibleCommandsForApplication
					CacheMod.useAccessibleCommandsForApplication = function (channel: any, appId: string, options: any) {
						if (typeof appId === 'string' && appId.startsWith('999')) {
							const { allSections } = buildAllSections()
							const sec = allSections.find((s: any) => s.id === appId)
							return sec?.commands || []
						}
						return origUseAccCmds ? origUseAccCmds.apply(this, arguments) : []
					}
				}
			}
		} catch (err) {
			logger.error(`[ClientUtils] Failed to hook CacheMod: ${err}`)
		}

		let ExecMod: any
		let origSend: any
		let origHandleSendText: any
		try {
			const execModId = discordModules['modules/chat_input/native/accessories/ChatInputSendUtils.tsx']
			const rawExecMod = (globalThis as any).__r?.(execModId)
			ExecMod =
				rawExecMod?.default ||
				rawExecMod ||
				getMod(filters.withProps('chatInputSendApplicationCommand'))

			if (ExecMod) {
				origSend = ExecMod.chatInputSendApplicationCommand
				ExecMod.chatInputSendApplicationCommand = function (data: any) {
					try {
						const cmdName =
							data?.applicationCommand?.command?.name ||
							data?.applicationCommand?.name ||
							data?.command?.name ||
							data?.name
						const registered = commands.get(cmdName)

						if (registered) {
							const channelId =
								data?.params?.channel?.id ||
								data?.params?.channelId ||
								data?.channel?.id ||
								data?.channelId ||
								getSelectedChannelIdSafe()
							const chStore = getChannelStore()
							const channel = chStore?.getChannel?.(channelId) || data?.params?.channel || data?.channel
							const guildId = channel?.guild_id || channel?.getGuildId?.() || null
							const currentUser = getCurrentUserSafe()

							const parsedArgs: Record<string, any> = {
								...parseOptionValues(data?.applicationCommand?.options),
								...parseOptionValues(data?.command?.options),
								...parseOptionValues(data?.options),
								...parseOptionValues(data?.params?.options),
								...parseOptionValues(data?.applicationCommand?.optionValues),
								...parseOptionValues(data?.command?.optionValues),
								...parseOptionValues(data?.optionValues),
								...parseOptionValues(data?.params?.optionValues),
							}

							setTimeout(() => {
								try {
									const ref = data?.params?.chatInputRef?.current
									if (ref) {
										ref.clearText?.()
										ref.setText?.('')
									}
								} catch {}
							}, 50)

							const pluginName = registered._pluginMeta?.name || 'Client Utils'
							const ctx = {
								channelId,
								guildId,
								currentUser,
								reply: (options: any) =>
									sendReply(channelId, options, pluginName, cmdName, registered._pluginMeta),
							}

							Promise.resolve(registered.execute(parsedArgs, ctx)).catch((err: any) => {
								sendReply(channelId, {
									content: `❌ Command Error: ${err?.message || err}`,
									ephemeral: true,
								}, pluginName, cmdName, registered._pluginMeta)
							})

							return Promise.resolve()
						}
					} catch (e) {
						logger.error(`[ClientUtils] Execution wrapper error: ${e}`)
					}
					return origSend.apply(this, arguments)
				}

				origHandleSendText = ExecMod.chatInputHandleSendText
				ExecMod.chatInputHandleSendText = function (data: any) {
					try {
						const rawText = (typeof data === 'string' ? data : data?.text || data?.value || '').trim()
						if (rawText.startsWith('/')) {
							const parts = rawText.slice(1).trim().split(/\s+/)
							const cmdName = parts[0]?.toLowerCase()
							const registered = commands.get(cmdName)
							if (registered) {
								const channelId =
									data?.params?.channel?.id ||
									data?.params?.channelId ||
									data?.channel?.id ||
									data?.channelId ||
									getSelectedChannelIdSafe()
								const chStore = getChannelStore()
								const channel = chStore?.getChannel?.(channelId) || data?.params?.channel || data?.channel
								const guildId = channel?.guild_id || channel?.getGuildId?.() || null
								const currentUser = getCurrentUserSafe()

								try {
									const ref = data?.params?.chatInputRef?.current
									if (ref) {
										ref.clearText?.()
										ref.setText?.('')
									}
								} catch {}

								const parsedArgs: Record<string, any> = {}
								const remaining = rawText.slice(1).trim().slice(cmdName.length).trim()
								if (remaining) {
									const opts = registered.options || []
									if (opts.length > 0) {
										parsedArgs[opts[0].name] = remaining
									}
								}

								const pluginName = registered._pluginMeta?.name || 'Client Utils'
								const ctx = {
									channelId,
									guildId,
									currentUser,
									reply: (options: any) =>
										sendReply(channelId, options, pluginName, cmdName, registered._pluginMeta),
								}

								Promise.resolve(registered.execute(parsedArgs, ctx)).catch((err: any) => {
									sendReply(channelId, {
										content: `❌ Command Error: ${err?.message || err}`,
										ephemeral: true,
									}, pluginName, cmdName, registered._pluginMeta)
								})

								return Promise.resolve()
							}
						}
					} catch (e) {
						logger.error(`[ClientUtils] handleSendText wrapper error: ${e}`)
					}
					return origHandleSendText.apply(this, arguments)
				}
			}
		} catch (err) {
			logger.error(`[ClientUtils] Failed to hook ExecMod: ${err}`)
		}

		let LegacyMod: any
		let origHandleLegacy: any
		try {
			const legacyModId =
				(discordModules['modules/chat_input/native/accessories/ChatInputSendUtils.tsx'] as number) - 1
			const rawLegacyMod = (globalThis as any).__r?.(legacyModId)
			LegacyMod =
				rawLegacyMod?.default ||
				rawLegacyMod ||
				getMod(filters.withProps('handleLegacyCommands'))

			if (LegacyMod?.handleLegacyCommands) {
				origHandleLegacy = LegacyMod.handleLegacyCommands
				LegacyMod.handleLegacyCommands = function (text: string, context: any) {
					try {
						const trimmed = (text || '').trim()
						if (trimmed.startsWith('/')) {
							const parts = trimmed.slice(1).trim().split(/\s+/)
							const cmdName = parts[0]?.toLowerCase()
							const registered = commands.get(cmdName)
							if (registered) {
								const channelId =
									context?.channel?.id ||
									context?.channelId ||
									getSelectedChannelIdSafe()
								const chStore = getChannelStore()
								const channel = chStore?.getChannel?.(channelId) || context?.channel
								const guildId = channel?.guild_id || channel?.getGuildId?.() || null
								const currentUser = getCurrentUserSafe()

								const parsedArgs: Record<string, any> = {}
								const remaining = trimmed.slice(1).trim().slice(cmdName.length).trim()
								if (remaining) {
									const opts = registered.options || []
									if (opts.length > 0) {
										parsedArgs[opts[0].name] = remaining
									}
								}

								const pluginName = registered._pluginMeta?.name || 'Client Utils'
								const ctx = {
									channelId,
									guildId,
									currentUser,
									reply: (options: any) =>
										sendReply(channelId, options, pluginName, cmdName, registered._pluginMeta),
								}

								Promise.resolve(registered.execute(parsedArgs, ctx)).catch((err: any) => {
									sendReply(channelId, {
										content: `❌ Command Error: ${err?.message || err}`,
										ephemeral: true,
									}, pluginName, cmdName, registered._pluginMeta)
								})

								return { content: '' }
							}
						}
					} catch (e) {
						logger.error(`[ClientUtils] handleLegacyCommands hook error: ${e}`)
					}
					return origHandleLegacy.apply(this, arguments)
				}
			}
		} catch (err) {
			logger.error(`[ClientUtils] Failed to hook LegacyMod: ${err}`)
		}

		const responseFormatOption = {
			type: 3,
			name: 'format',
			displayName: 'format',
			description: 'Response format: text, embed, or cv2 (optional)',
			required: false,
			choices: [
				{ name: 'Text', displayName: 'Text', value: 'text' },
				{ name: 'Embed', displayName: 'Embed', value: 'embed' },
				{ name: 'Components V2', displayName: 'Components V2', value: 'cv2' },
			],
		}

		const clientUtilsApi = {
			version: '1.0.20',
			commands,
			registerCommand,
			unregisterCommand,
			sendReply,
			builders,
			responseFormatOption,
			getCommands: () => Array.from(commands.values()),
		}

		;(globalThis as any).__c_utils = clientUtilsApi
		if (revenge?.plugins) {
			(revenge.plugins as any).clientUtils = clientUtilsApi
		}

		const everest = (globalThis as any).__everest
		everest?.registerPlugin?.({
			id: 'dev.everestmcarthur.client-utils',
			name: 'Client Utils',
			icon: 'HammerIcon',
			author: 'Rosie',
			description: 'Custom client-side slash command engine and built-in Discord utilities.',
			version: { nums: [1, 0, 0], label: null },
		})

		const ephemeralOption = {
			type: 3,
			name: 'ephemeral',
			displayName: 'ephemeral',
			description: 'Show response only to you (optional)',
			required: false,
			choices: [
				{ name: 'True', displayName: 'True', value: 'true' },
			],
		}

		registerCommand({
			name: 'avatar',
			description: 'View the avatar of yourself or another user',
			options: [
				{
					type: 6,
					name: 'user',
					displayName: 'user',
					description: 'The user whose avatar you want to view',
					required: false,
				},
				ephemeralOption,
			],
			execute: async (args: any, ctx: any) => {
				let targetUser = ctx.currentUser
				if (args.user) {
					const u = getUserSafe(args.user) || getUserSafe(args.user?.id)
					if (u) targetUser = u
				}
				const avatarUrl = getAvatarUrl(targetUser)
				const isEphemeral = isEphemeralArg(args.ephemeral)
				const name = targetUser.globalName || targetUser.username

				ctx.reply({
					ephemeral: isEphemeral,
					content: '',
					imageUrl: avatarUrl,
					embed: {
						type: 'rich',
						title: `${name}'s Avatar`,
						url: avatarUrl,
						color: 0x5865f2,
						description: `[Open Original in Browser](${avatarUrl})`,
						image: {
							url: avatarUrl,
							proxyURL: avatarUrl,
							width: 1024,
							height: 1024,
						},
					},
				})
			},
		})

		registerCommand({
			name: 'banner',
			description: 'View the profile banner of yourself or another user',
			options: [
				{
					type: 6,
					name: 'user',
					displayName: 'user',
					description: 'The user whose banner you want to view',
					required: false,
				},
				ephemeralOption,
			],
			execute: async (args: any, ctx: any) => {
				let targetUser = ctx.currentUser
				if (args.user) {
					const u = getUserSafe(args.user) || getUserSafe(args.user?.id)
					if (u) targetUser = u
				}
				const profStore = getUserProfileStore()
				const profile = profStore?.getUserProfile?.(targetUser.id)
				const bannerUrl = getBannerUrl(targetUser, profile)
				const isEphemeral = isEphemeralArg(args.ephemeral)
				const name = targetUser.globalName || targetUser.username

				if (!bannerUrl) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: `ℹ️ **${name}** does not have a custom profile banner.`,
					})
					return
				}

				ctx.reply({
					ephemeral: isEphemeral,
					content: '',
					imageUrl: bannerUrl,
					embed: {
						type: 'rich',
						title: `${name}'s Banner`,
						url: bannerUrl,
						color: 0x5865f2,
						description: `[Open Original in Browser](${bannerUrl})`,
						image: {
							url: bannerUrl,
							proxyURL: bannerUrl,
							width: 1024,
							height: 576,
						},
					},
				})
			},
		})

		registerCommand({
			name: 'userinfo',
			description: 'View detailed account information for a user',
			options: [
				{
					type: 6,
					name: 'user',
					displayName: 'user',
					description: 'The user to inspect',
					required: false,
				},
				ephemeralOption,
			],
			execute: async (args: any, ctx: any) => {
				let targetUser = ctx.currentUser
				if (args.user) {
					const u = getUserSafe(args.user) || getUserSafe(args.user?.id)
					if (u) targetUser = u
				}
				const isEphemeral = isEphemeralArg(args.ephemeral)
				const avatarUrl = getAvatarUrl(targetUser)
				const createdUnix = getSnowflakeDate(targetUser.id)
				const name = targetUser.globalName
					? `${targetUser.globalName} (@${targetUser.username})`
					: `@${targetUser.username}`

				const fields = [
					{ name: 'User ID', value: `\`${targetUser.id}\``, inline: true },
					{ name: 'Bot Account', value: targetUser.bot ? 'Yes' : 'No', inline: true },
					{
						name: 'Account Created',
						value: createdUnix ? `<t:${createdUnix}:F> (<t:${createdUnix}:R>)` : 'Unknown',
						inline: false,
					},
				]

				if (ctx.guildId) {
					const memStore = getGuildMemberStore()
					const member = memStore?.getMember?.(ctx.guildId, targetUser.id)
					if (member?.joinedAt) {
						const joinedUnix = Math.floor(new Date(member.joinedAt).getTime() / 1000)
						fields.push({
							name: 'Joined Server',
							value: `<t:${joinedUnix}:F> (<t:${joinedUnix}:R>)`,
							inline: false,
						})
					}
					if (member?.roles && member.roles.length > 0) {
						const rolesStr =
							member.roles
								.slice(0, 10)
								.map((r: string) => `<@&${r}>`)
								.join(' ') + (member.roles.length > 10 ? ` +${member.roles.length - 10} more` : '')
						fields.push({ name: `Roles (${member.roles.length})`, value: rolesStr, inline: false })
					}
				}

				ctx.reply({
					ephemeral: isEphemeral,
					embed: {
						type: 'rich',
						title: `User Info: ${name}`,
						color: 0x5865f2,
						thumbnail: {
							url: avatarUrl,
							proxyURL: avatarUrl,
							width: 128,
							height: 128,
						},
						fields,
					},
				})
			},
		})

		registerCommand({
			name: 'serverinfo',
			description: 'View information about the current server',
			options: [ephemeralOption],
			execute: async (args: any, ctx: any) => {
				const isEphemeral = isEphemeralArg(args.ephemeral)
				if (!ctx.guildId) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: '❌ `/serverinfo` can only be used inside a server channel.',
					})
					return
				}

				const gStore = getGuildStore()
				const guild = gStore?.getGuild?.(ctx.guildId)
				if (!guild) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: '❌ Server details not found.',
					})
					return
				}

				const iconUrl = guild.icon
					? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith('a_') ? 'gif' : 'png'}?size=1024`
					: null
				const createdUnix = getSnowflakeDate(guild.id)
				const cntStore = getGuildMemberCountStore()
				const memberCount = cntStore?.getMemberCount?.(guild.id) || 'Unknown'

				const fields = [
					{ name: 'Server ID', value: `\`${guild.id}\``, inline: true },
					{ name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
					{ name: 'Members', value: String(memberCount), inline: true },
					{
						name: 'Boost Tier',
						value: `Level ${guild.premiumTier || 0} (${guild.premiumSubscriptionCount || 0} boosts)`,
						inline: true,
					},
					{
						name: 'Created',
						value: createdUnix ? `<t:${createdUnix}:F> (<t:${createdUnix}:R>)` : 'Unknown',
						inline: false,
					},
				]

				ctx.reply({
					ephemeral: isEphemeral,
					embed: {
						type: 'rich',
						title: guild.name,
						color: 0x5865f2,
						thumbnail: iconUrl ? { url: iconUrl, proxyURL: iconUrl, width: 128, height: 128 } : undefined,
						fields,
					},
				})
			},
		})

		registerCommand({
			name: 'channelinfo',
			description: 'View information about the current or specified channel',
			options: [
				{
					type: 7,
					name: 'channel',
					displayName: 'channel',
					description: 'Channel to inspect',
					required: false,
				},
				ephemeralOption,
			],
			execute: async (args: any, ctx: any) => {
				const isEphemeral = isEphemeralArg(args.ephemeral)
				const targetChannelId = args.channel || ctx.channelId
				const chStore = getChannelStore()
				const channel = chStore?.getChannel?.(targetChannelId)

				if (!channel) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: '❌ Channel not found.',
					})
					return
				}

				const createdUnix = getSnowflakeDate(channel.id)
				const fields = [
					{ name: 'Channel ID', value: `\`${channel.id}\``, inline: true },
					{
						name: 'Type',
						value:
							channel.type === 0
								? 'Text'
								: channel.type === 2
									? 'Voice'
									: channel.type === 4
										? 'Category'
										: channel.type === 5
											? 'Announcement'
											: String(channel.type),
						inline: true,
					},
					{ name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
					{
						name: 'Created',
						value: createdUnix ? `<t:${createdUnix}:F> (<t:${createdUnix}:R>)` : 'Unknown',
						inline: false,
					},
				]

				if (channel.topic) {
					fields.push({ name: 'Topic', value: channel.topic, inline: false })
				}

				ctx.reply({
					ephemeral: isEphemeral,
					embed: {
						type: 'rich',
						title: `#${channel.name || 'channel'}`,
						color: 0x5865f2,
						fields,
					},
				})
			},
		})
		registerCommand({
			name: 'inviteinfo',
			description: 'View detailed server and channel information for an invite link or code',
			options: [
				{
					type: 3,
					name: 'invite',
					displayName: 'invite',
					description: 'The invite link or code to look up',
					required: true,
				},
				ephemeralOption,
			],
			execute: async (args: any, ctx: any) => {
				const isEphemeral = isEphemeralArg(args.ephemeral)
				const rawInvite = args.invite
				if (!rawInvite) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: '❌ Please provide an invite code or link.',
					})
					return
				}

				const cleanCode = rawInvite
					.replace(/^(https?:\/\/)?(discord\.(gg|com\/invite)\/)/i, '')
					.trim()

				try {
					const res = await fetch(
						`https://discord.com/api/v9/invites/${cleanCode}?with_counts=true&with_expiration=true`,
					)
					if (!res.ok) {
						ctx.reply({
							ephemeral: isEphemeral,
							content: `❌ Could not resolve invite \`${cleanCode}\` (Status: ${res.status}).`,
						})
						return
					}

					const data = await res.json()
					const guild = data.guild || {}
					const channel = data.channel || {}
					const inviter = data.inviter
					const totalMembers = data.approximate_member_count || 0
					const onlineMembers = data.approximate_presence_count || 0
					const onlinePercent =
						totalMembers > 0 ? Math.round((onlineMembers / totalMembers) * 100) : 0
					const createdUnix = guild.id ? getSnowflakeDate(guild.id) : null
					const expiresUnix = data.expires_at
						? Math.floor(new Date(data.expires_at).getTime() / 1000)
						: null

					const iconUrl =
						guild.id && guild.icon
							? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith('a_') ? 'gif' : 'png'}?size=512`
							: null
					const bannerUrl =
						guild.id && guild.banner
							? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${guild.banner.startsWith('a_') ? 'gif' : 'png'}?size=1024`
							: null

					const fields = [
						{
							name: 'Members',
							value: `${totalMembers} total\n${onlineMembers} online (${onlinePercent}%)`,
							inline: true,
						},
						{ name: 'Created', value: createdUnix ? `<t:${createdUnix}:R>` : 'Unknown', inline: true },
						{
							name: 'Boosts',
							value: `Level ${guild.premium_tier || 0}\n${guild.premium_subscription_count || 0} boosts`,
							inline: true,
						},
						{ name: 'Invite URL', value: `https://discord.gg/${cleanCode}`, inline: false },
						{ name: 'Invite Code', value: `\`${cleanCode}\``, inline: true },
					]

					if (channel.name) {
						fields.push({ name: 'Channel', value: `#${channel.name}`, inline: true })
						if (channel.id) {
							fields.push({ name: 'Channel ID', value: `\`${channel.id}\``, inline: true })
						}
					}

					if (inviter) {
						fields.push({
							name: 'Inviter',
							value: `${inviter.global_name || inviter.username} (@${inviter.username})`,
							inline: false,
						})
						fields.push({ name: 'Inviter ID', value: `\`${inviter.id}\``, inline: true })
					}

					fields.push({
						name: 'Expires',
						value: expiresUnix ? `<t:${expiresUnix}:R>` : 'Never',
						inline: true,
					})
					fields.push({
						name: 'Max Uses',
						value: data.max_uses ? String(data.max_uses) : 'Unlimited',
						inline: true,
					})

					if (guild.id) {
						fields.push({ name: 'Server ID', value: `\`${guild.id}\``, inline: true })
					}

					ctx.reply({
						ephemeral: isEphemeral,
						embed: {
							type: 'rich',
							title: guild.name || `Invite: ${cleanCode}`,
							url: `https://discord.gg/${cleanCode}`,
							description: guild.description || undefined,
							color: 0x5865f2,
							thumbnail: iconUrl
								? { url: iconUrl, proxyURL: iconUrl, width: 128, height: 128 }
								: undefined,
							image: bannerUrl
								? { url: bannerUrl, proxyURL: bannerUrl, width: 1024, height: 576 }
								: undefined,
							fields,
						},
					})
				} catch (err: any) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: `❌ Failed to inspect invite: ${err.message}`,
					})
				}
			},
		})

		registerCommand({
			name: 'updatechecker',
			description: 'Check for plugin updates on device and download available updates',
			options: [ephemeralOption],
			execute: async (args: any, ctx: any) => {
				const isEphemeral = isEphemeralArg(args.ephemeral)
				try {
					const repos = (globalThis as any).revenge?.hidden?.plugins?.repositories
					if (!repos?.refreshAllRepos || !repos?.listAllUpdates) {
						ctx.reply({
							ephemeral: isEphemeral,
							content: '❌ Plugin repository manager is not available.',
						})
						return
					}

					await repos.refreshAllRepos()
					const updatesResult = await repos.listAllUpdates()
					const updates = Array.isArray(updatesResult)
						? updatesResult
						: updatesResult?.updates || []

					if (updates.length === 0) {
						ctx.reply({
							ephemeral: isEphemeral,
							content: '',
							embed: {
								type: 'rich',
								title: 'Plugin Updates',
								description: '✅ All plugins are up to date!',
								color: 0x57f287,
							},
						})
						return
					}

					if (repos.updateAllPlugins) {
						await repos.updateAllPlugins()
					}

					const pList = (globalThis as any).revenge?.hidden?.plugins?.internal?.pList
					const updatedNames = updates
						.map((u: any) => {
							const id = u.id || u.manifest?.id || u.name
							const pluginObj = pList?.get ? pList.get(id) : null
							const name = pluginObj?.manifest?.name || u.name || id || 'Plugin'
							const avail = Array.isArray(u.available)
								? u.available.join('.')
								: u.available?.nums
									? u.available.nums.join('.')
									: u.available || u.version || 'Latest'
							return `• **${name}** (v${avail})`
						})
						.join('\n')

					ctx.reply({
						ephemeral: isEphemeral,
						content: '',
						embed: {
							type: 'rich',
							title: 'Plugin Updates Downloaded',
							description: `Downloaded updates for **${updates.length}** plugin(s):\n\n${updatedNames}\n\n*Reload Discord to apply the updates.*`,
							color: 0x5865f2,
						},
					})
				} catch (e: any) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: `❌ Failed to check for updates: ${e?.message || e}`,
					})
				}
			},
		})

		cleanup(() => {
			if (IndexStore) {
				if (origQuery) IndexStore.query = origQuery
				if (origGetContextState) IndexStore.getContextState = origGetContextState
				if (origGetUserState) IndexStore.getUserState = origGetUserState
			}
			if (appStoreTarget && origGetApp) {
				appStoreTarget.getApplication = origGetApp
			}
			if (IconMod) {
				if (origGetUrl) IconMod.getApplicationIconURL = origGetUrl
				if (origGetSource) IconMod.getApplicationIconSource = origGetSource
			}
			if (CacheMod) {
				if (origGetCached) CacheMod.getCachedResults = origGetCached
				if (origGetCachedSection) CacheMod.getCachedApplicationSection = origGetCachedSection
				if (origGetCachedCmd) CacheMod.getCachedCommand = origGetCachedCmd
				if (origUseDiscovery) CacheMod.useDiscovery = origUseDiscovery
				if (origUseCachedResults) CacheMod.useCachedResults = origUseCachedResults
				if (origUseQuery) CacheMod.useQuery = origUseQuery
			}
			if (ExecMod) {
				if (origSend) ExecMod.chatInputSendApplicationCommand = origSend
				if (origHandleSendText) ExecMod.chatInputHandleSendText = origHandleSendText
			}
			if (LegacyMod && origHandleLegacy) {
				LegacyMod.handleLegacyCommands = origHandleLegacy
			}
			delete (globalThis as any).__c_utils
			if ((revenge?.plugins as any)?.clientUtils) {
				delete (revenge.plugins as any).clientUtils
			}
		})
	},
})
