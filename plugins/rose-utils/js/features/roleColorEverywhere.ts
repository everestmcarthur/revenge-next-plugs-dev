import { getModule, getFilters } from '../shared'
import { discordModules } from '../../../shared/discord-modules'
import type { RoseUtilsSettings } from '../types'

export function initRoleColorEverywhere(settings: RoseUtilsSettings): () => void {
	if (!settings.roleColorEverywhere) return () => {}

	const cleanups: (() => void)[] = []
	const r = (globalThis as any).__r
	if (!r) return () => {}

	const ChannelStore = getModule(getFilters().withProps('getChannel'))
	const SelectedChannelStore = getModule(getFilters().withProps('getChannelId', 'getLastSelectedChannelId'))

	let GuildMemberStore: any = null
	try {
		const memberStoreId = discordModules['stores/GuildMemberStore.tsx']
		const raw = r(memberStoreId)
		GuildMemberStore = raw?.default || raw
	} catch {
		GuildMemberStore = getModule(getFilters().withProps('getMember'))
	}

	const getMemberColor = (guildId?: string, userId?: string): string | null => {
		if (!guildId || !userId || !GuildMemberStore?.getMember) return null
		try {
			const member = GuildMemberStore.getMember(guildId, userId)
			return member?.colorString || null
		} catch {
			return null
		}
	}

	if (settings.roleColorChat !== false) {
		try {
			const authorModId = discordModules['modules/messages/useMessageAuthor.tsx']
			const authorMod = r(authorModId)
			if (authorMod) {
				if (typeof authorMod.default === 'function') {
					const unpatchDefault = revenge.patcher.after(authorMod, 'default', (args: any[], ret: any) => {
						try {
							if (!ret) return ret
							const message = args[0]
							const channel = args[1]
							const guildId =
								channel?.guild_id ||
								message?.guildId ||
								ChannelStore?.getChannel?.(SelectedChannelStore?.getChannelId?.())?.guild_id
							const authorId = message?.author?.id || message?.authorId
							if (guildId && authorId) {
								const color = getMemberColor(guildId, authorId)
								if (color) {
									ret.colorString = color
								}
							}
						} catch {}
						return ret
					})
					cleanups.push(unpatchDefault)
				}
				if (typeof authorMod.getMessageAuthor === 'function') {
					const unpatchGetAuthor = revenge.patcher.after(authorMod, 'getMessageAuthor', (args: any[], ret: any) => {
						try {
							if (!ret) return ret
							const message = args[0]
							const channelId = message?.channelId || message?.channel_id || SelectedChannelStore?.getChannelId?.()
							const channel = channelId ? ChannelStore?.getChannel?.(channelId) : null
							const guildId = channel?.guild_id || message?.guildId
							const authorId = message?.author?.id || message?.authorId
							if (guildId && authorId) {
								const color = getMemberColor(guildId, authorId)
								if (color) {
									ret.colorString = color
								}
							}
						} catch {}
						return ret
					})
					cleanups.push(unpatchGetAuthor)
				}
			}
		} catch {}
	}

	if (settings.roleColorMentions !== false) {
		try {
			const mentionModId = discordModules['modules/markup_v2/native/transformNativeMarkupMention.tsx']
			const mentionMod = r(mentionModId)
			if (typeof mentionMod?.transformNativeMention === 'function') {
				const unpatchMention = revenge.patcher.instead(mentionMod, 'transformNativeMention', (args: any[], Original: any) => {
					const res = Original(...args)
					try {
						if (!res) return res
						const part = args[0]
						const ctx = args[1]
						const userId = res.parsedUserId || part?.value || part?.userId || part?.id
						const guildId =
							ctx?.guildId ||
							ChannelStore?.getChannel?.(ctx?.channelId || SelectedChannelStore?.getChannelId?.())?.guild_id
						const color = getMemberColor(guildId, userId)
						if (color) {
							const dec = parseInt(color.replace('#', ''), 16)
							res.roleColor = dec
							res.color = dec
							res.colorString = color
							if (Array.isArray(res.content)) {
								for (const sub of res.content) {
									if (sub && typeof sub === 'object') {
										sub.roleColor = dec
										sub.color = dec
										sub.colorString = color
									}
								}
							}
						}
					} catch {}
					return res
				})
				cleanups.push(unpatchMention)
			}
		} catch {}
	}

	const applyColorToTextChildren = (elem: any, color: string): void => {
		if (!elem || typeof elem !== 'object') return
		if (elem.props) {
			if (elem.props.style) {
				const isText =
					(typeof elem.type === 'string' && elem.type.toLowerCase().includes('text')) ||
					elem.type?.displayName?.toLowerCase().includes('text') ||
					elem.type?.name?.toLowerCase().includes('text')
				if (isText) {
					elem.props.style = [elem.props.style, { color }]
				}
			}
			if (Array.isArray(elem.props.children)) {
				for (const child of elem.props.children) {
					applyColorToTextChildren(child, color)
				}
			} else if (elem.props.children && typeof elem.props.children === 'object') {
				applyColorToTextChildren(elem.props.children, color)
			}
		}
	}

	if (settings.roleColorTyping !== false) {
		try {
			const typingModId = discordModules['modules/chat/native/TypingIndicator.tsx']
			const typingMod = r(typingModId)
			const target = typingMod?.default?.type ? typingMod.default : typingMod
			const fnKey = typingMod?.default?.type ? 'type' : 'default'
			if (target && typeof target[fnKey] === 'function') {
				const unpatchTyping = revenge.patcher.instead(target, fnKey, (args: any[], Original: any) => {
					const res = Original(...args)
					try {
						if (!res?.props) return res
						const channel = res.props.channel
						const userIds = res.props.typingUserIds
						if (channel?.guild_id && Array.isArray(userIds) && userIds.length > 0) {
							const color = getMemberColor(channel.guild_id, userIds[0])
							if (color) {
								applyColorToTextChildren(res, color)
							}
						}
					} catch {}
					return res
				})
				cleanups.push(unpatchTyping)
			}
		} catch {}
	}

	if (settings.roleColorVoice !== false) {
		try {
			const voiceItemId = discordModules['modules/guild_sidebar/native/VoiceUserNameItem.tsx']
			const voiceMod = r(voiceItemId)
			if (typeof voiceMod?.default === 'function') {
				const unpatchVoice = revenge.patcher.instead(voiceMod, 'default', (args: any[], Original: any) => {
					const res = Original(...args)
					try {
						if (!res?.props) return res
						const user = res.props.user
						const guildId = res.props.guildId || ChannelStore?.getChannel?.(SelectedChannelStore?.getChannelId?.())?.guild_id
						const color = getMemberColor(guildId, user?.id)
						if (color) {
							res.props.style = [res.props.style, { color }]
						}
					} catch {}
					return res
				})
				cleanups.push(unpatchVoice)
			}
		} catch {}
	}

	return () => {
		for (const fn of cleanups) fn()
	}
}
