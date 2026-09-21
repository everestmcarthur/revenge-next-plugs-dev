import { getModules, lookupModule } from '@revenge-mod/modules/finders'
import { withName, withProps } from '@revenge-mod/modules/finders/filters'
import { instead } from '@revenge-mod/patcher'
import { processColor } from 'react-native'
import type { JsonStorage } from '@revenge-mod/json-storage'
import { discordModules } from '../../../shared/discord-modules'
import type { ClydeEditorStorage } from '../lib/types'

export function patchClyde(storage: JsonStorage<ClydeEditorStorage>) {
	const unpatches: (() => void)[] = []

	const isClyde = (target: any): boolean => {
		if (!target) return false
		const authorId = target.authorId || target.author?.id
		if (authorId === '1') return true
		if (target.loggingName === 'clyde') return true
		const name = (target.author?.username || target.username || '').toLowerCase()
		return name === 'clyde'
	}

	const patchChatManager = (ChatManager: any) => {
		const targetProto = ChatManager?.prototype
		if (!targetProto?.createRow) return

		unpatches.push(
			instead(targetProto, 'createRow', function (args, orig) {
				if (storage.cache?.destroyClyde) {
					const [{ message, content }] = args
					if (isClyde(message)) {
						return
					}
					if (Array.isArray(content) && content.length > 0) {
						if (isClyde(content[0]?.message)) {
							return
						}
					}
				}
				return Reflect.apply(orig, this, args)
			})
		)
	}

	try {
		const cmId = discordModules['modules/messages/native/renderer/ChatManager.tsx']
		const rawCM = (globalThis as any).__r?.(cmId)
		const directCM = rawCM?.default || rawCM
		if (directCM?.prototype?.createRow) {
			patchChatManager(directCM)
		} else {
			const unsub = getModules(withName('ChatManager'), (mod: any) => {
				const cm = mod?.default || mod
				patchChatManager(cm)
			})
			if (typeof unsub === 'function') unpatches.push(unsub)
		}
	} catch {}

	try {
		const msgActions = lookupModule(
			withProps('receiveMessage', 'sendMessage'),
			{ initialize: true }
		)?.[0] as any

		if (msgActions?.receiveMessage) {
			unpatches.push(
				instead(msgActions, 'receiveMessage', ([channelId, message, ...rest], orig) => {
					if (storage.cache?.destroyClyde && isClyde(message)) {
						return
					}
					return orig(channelId, message, ...rest)
				})
			)
		}

		if (msgActions?.sendClydeError) {
			unpatches.push(
				instead(msgActions, 'sendClydeError', (args, orig) => {
					if (storage.cache?.destroyClyde) {
						return
					}
					return orig(...args)
				})
			)
		}
	} catch {}

	try {
		const createMsgId = discordModules['modules/messages/createMessage.tsx']
		const botMsgMod =
			lookupModule(withProps('createBotMessage'), { initialize: true })?.[0] ||
			(globalThis as any).__r?.(createMsgId)
		if (botMsgMod?.createBotMessage) {
			unpatches.push(
				instead(botMsgMod, 'createBotMessage', ([opts, ...rest], orig) => {
					if (storage.cache?.destroyClyde) {
						return null
					}
					return orig(opts, ...rest)
				})
			)
		}
	} catch {}

	try {
		const userStoreId = discordModules['stores/UserStore.tsx']
		const userStore =
			(globalThis as any).__r?.(userStoreId)?.default ||
			lookupModule(withProps('getUser', 'getCurrentUser'), { initialize: true })?.[0] as any
		if (userStore?.getUser) {
			unpatches.push(
				instead(userStore, 'getUser', ([id], original) => {
					const user = original(id)
					if (id === '1') {
						const conf = storage.cache
						const customName = conf?.name || 'Clyde'
						if (user) {
							user.username = customName
							user.globalName = customName
							if (conf?.avatar) {
								user.avatar = conf.avatar
							}
							if (conf?.banner) {
								user.banner = conf.banner
							}
							return user
						}
					}
					return user
				})
			)
		}
	} catch {}

	try {
		const avatarId = discordModules['utils/AvatarUtils.tsx']
		const avatarRaw =
			(globalThis as any).__r?.(avatarId)?.default ||
			lookupModule(
				withProps('getUserAvatarSource', 'getUserAvatarURL'),
				{ initialize: true }
			)?.[0] as any
		const avatarMod = avatarRaw?.default || avatarRaw
		if (avatarMod) {
			if (avatarMod.getUserAvatarSource) {
				unpatches.push(
					instead(avatarMod, 'getUserAvatarSource', ([user, ...rest], original) => {
						if (user?.id === '1') {
							const conf = storage.cache
							if (conf?.avatar) {
								return { uri: conf.avatar }
							}
						}
						return original(user, ...rest)
					})
				)
			}

			if (avatarMod.getUserAvatarURL) {
				unpatches.push(
					instead(avatarMod, 'getUserAvatarURL', ([user, ...rest], original) => {
						if (user?.id === '1') {
							const conf = storage.cache
							if (conf?.avatar) {
								return conf.avatar
							}
						}
						return original(user, ...rest)
					})
				)
			}

			if (avatarMod.getUserBannerURL) {
				unpatches.push(
					instead(avatarMod, 'getUserBannerURL', ([user, ...rest], original) => {
						if (user?.id === '1') {
							const conf = storage.cache
							if (conf?.banner) {
								return conf.banner
							}
						}
						return original(user, ...rest)
					})
				)
			}
		}
	} catch {}

	try {
		const authorId = discordModules['modules/messages/useMessageAuthor.tsx']
		const authorMod =
			(globalThis as any).__r?.(authorId)?.default ||
			lookupModule(
				withProps('getMessageAuthor', 'getUserAuthor'),
				{ initialize: true }
			)?.[0] as any
		if (authorMod?.getMessageAuthor) {
			unpatches.push(
				instead(authorMod, 'getMessageAuthor', ([message], original) => {
					const ret = original(message)
					if (message?.author?.id === '1') {
						const conf = storage.cache
						return {
							...ret,
							nick: conf?.name || ret?.nick || 'Clyde',
							colorString: conf?.color || ret?.colorString,
						}
					}
					return ret
				})
			)
		}
	} catch {}

	const patchTagProperties = (tagMod: any) => {
		const target = tagMod?.default ? tagMod : { default: tagMod }
		if (typeof target?.default === 'function') {
			unpatches.push(
				instead(target, 'default', ([args], original) => {
					const ret = original(args)
					if (args?.message?.author?.id === '1') {
						const conf = storage.cache
						const customText = conf?.tagText || 'APP'
						const bg = conf?.tagBackgroundColor
							? processColor(conf.tagBackgroundColor)
							: undefined
						const textCol = conf?.tagTextColor
							? processColor(conf.tagTextColor)
							: undefined
						return {
							...ret,
							tagText: customText,
							tagAccessibilityLabel: customText,
							tagBackgroundColor: bg,
							tagTextColor: textCol,
							tagVerified: conf?.tagVerified ?? true,
						}
					}
					return ret
				})
			)
		}
	}

	try {
		const tagId = discordModules['modules/messages/native/renderer/getTagProperties.tsx']
		const rawTag = (globalThis as any).__r?.(tagId)
		if (rawTag?.default) {
			patchTagProperties(rawTag)
		} else {
			const unsub = getModules(withName('getTagProperties'), mod => {
				patchTagProperties(mod)
			})
			if (typeof unsub === 'function') {
				unpatches.push(unsub)
			}
		}
	} catch {}

	try {
		const profileStore = lookupModule(withProps('getUserProfile'), {
			initialize: true,
		})?.[0] as any
		const userStore = lookupModule(withProps('getUser', 'getCurrentUser'), {
			initialize: true,
		})?.[0] as any
		if (profileStore?.getUserProfile) {
			unpatches.push(
				instead(profileStore, 'getUserProfile', ([userId], original) => {
					if (userId === '1') {
						const conf = storage.cache
						const user = userStore?.getUser?.('1')
						return {
							userId: '1',
							bio: conf?.bio || "I'm your friendly Discord bot companion!",
							banner: conf?.banner || undefined,
							user,
						}
					}
					return original(userId)
				})
			)
		}
	} catch {}

	return () => {
		for (const u of unpatches) {
			try {
				u()
			} catch {}
		}
	}
}

export function sendTestClydeMessage(storage: JsonStorage<ClydeEditorStorage>): boolean {
	try {
		const createMsgId = discordModules['modules/messages/createMessage.tsx']
		const botMsgMod =
			lookupModule(withProps('createBotMessage'), { initialize: true })?.[0] ||
			(globalThis as any).__r?.(createMsgId)
		const msgMod = lookupModule(
			withProps('receiveMessage', 'sendMessage'),
			{ initialize: true }
		)?.[0] as any
		const channelStore = lookupModule(
			withProps('getChannelId', 'getVoiceChannelId'),
			{ initialize: true }
		)?.[0] as any
		const channelId = channelStore?.getChannelId?.()

		if (!botMsgMod || !msgMod || !channelId) return false

		const conf = storage.cache
		const name = conf?.name || 'Clyde'
		const content = `Hello! I am ${name}. Your custom Clyde styling has been applied!`

		const msg = botMsgMod.createBotMessage({ channelId, content })
		if (msg?.author) {
			msg.author.username = name
			msg.author.globalName = name
			if (conf?.avatar) {
				msg.author.avatar = conf.avatar
			}
		}
		msgMod.receiveMessage(channelId, msg)
		return true
	} catch {
		return false
	}
}

export function updateActiveClydeMessages(storage: JsonStorage<ClydeEditorStorage>) {
	try {
		const messageStore = lookupModule(
			withProps('getMessages', 'getMessage'),
			{ initialize: true }
		)?.[0] as any
		const channelStore = lookupModule(
			withProps('getChannelId', 'getVoiceChannelId'),
			{ initialize: true }
		)?.[0] as any
		const dispatcher = lookupModule(
			withProps('dispatch', 'subscribe'),
			{ initialize: true }
		)?.[0] as any
		const channelId = channelStore?.getChannelId?.()

		if (!messageStore || !dispatcher || !channelId) return

		const messages = messageStore.getMessages(channelId)?._array || []
		const conf = storage.cache
		const name = conf?.name || 'Clyde'

		for (const m of messages) {
			if (m?.author?.id === '1') {
				dispatcher.dispatch({
					type: 'MESSAGE_UPDATE',
					message: {
						id: m.id,
						channel_id: channelId,
						author: {
							...m.author,
							username: name,
							globalName: name,
							avatar: conf?.avatar || m.author.avatar,
						},
						nick: name,
					},
				})
			}
		}
	} catch {}
}
