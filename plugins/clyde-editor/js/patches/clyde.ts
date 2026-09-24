import { processColor } from 'react-native'
import type { JsonStorage } from '@revenge-mod/json-storage'
import { findByImportedPath, waitForImportedPath } from '../../../shared/finders'
import { CLYDE_DEFAULTS, type ClydeEditorStorage } from '../lib/types'

export function patchClyde(storage: JsonStorage<ClydeEditorStorage>) {
	const unpatches: (() => void)[] = []

	const getConfig = (): ClydeEditorStorage => {
		return { ...CLYDE_DEFAULTS, ...(storage.cache ?? {}) }
	}

	const isClyde = (target: any): boolean => {
		if (!target) return false
		const authorId = target.authorId || target.author?.id || target.id
		if (authorId === '1') return true
		if (target.loggingName === 'clyde') return true
		const name = (target.author?.username || target.username || '').toLowerCase()
		return name === 'clyde'
	}

	// 1. ChatManager.prototype.createRow (Destroy Clyde)
	const applyChatManager = (ChatManagerMod: any) => {
		const targetProto = ChatManagerMod?.default?.prototype || ChatManagerMod?.prototype
		if (!targetProto?.createRow) return

		unpatches.push(
			revenge.patcher.instead(targetProto, 'createRow', function (this: any, args: any[], orig: any) {
				const conf = getConfig()
				if (conf.destroyClyde && args?.[0]) {
					const row = args[0]
					if (isClyde(row.message) || (Array.isArray(row.content) && isClyde(row.content[0]?.message))) {
						return null
					}
				}
				return Reflect.apply(orig, this, args)
			})
		)
	}

	const existingCM = findByImportedPath('modules/messages/native/renderer/ChatManager.tsx')
	if (existingCM) {
		applyChatManager(existingCM)
	} else {
		const unsubCM = waitForImportedPath('modules/messages/native/renderer/ChatManager.tsx', applyChatManager)
		if (typeof unsubCM === 'function') unpatches.push(unsubCM)
	}

	// 2. MessageActionCreators (receiveMessage & sendClydeError for Destroy Clyde)
	const applyMessageActions = (actionsMod: any) => {
		const target = actionsMod?.default || actionsMod
		if (target?.receiveMessage) {
			unpatches.push(
				revenge.patcher.instead(target, 'receiveMessage', function (this: any, args: any[], orig: any) {
					const conf = getConfig()
					if (conf.destroyClyde && isClyde(args[1])) {
						return
					}
					return Reflect.apply(orig, this, args)
				})
			)
		}

		if (target?.sendClydeError) {
			unpatches.push(
				revenge.patcher.instead(target, 'sendClydeError', function (this: any, args: any[], orig: any) {
					const conf = getConfig()
					if (conf.destroyClyde) {
						return
					}
					return Reflect.apply(orig, this, args)
				})
			)
		}
	}

	const existingActions = findByImportedPath('actions/MessageActionCreators.tsx')
	if (existingActions) {
		applyMessageActions(existingActions)
	} else {
		const unsubActions = waitForImportedPath('actions/MessageActionCreators.tsx', applyMessageActions)
		if (typeof unsubActions === 'function') unpatches.push(unsubActions)
	}

	// 3. createBotMessage (modules/messages/createMessage.tsx)
	const applyCreateMessage = (createMod: any) => {
		const target = createMod?.default || createMod
		if (target?.createBotMessage) {
			unpatches.push(
				revenge.patcher.instead(target, 'createBotMessage', function (this: any, args: any[], orig: any) {
					const conf = getConfig()
					if (conf.destroyClyde) {
						return null
					}
					const msg = Reflect.apply(orig, this, args)
					if (msg?.author) {
						msg.author.username = conf.name || 'Clyde'
						msg.author.globalName = conf.name || 'Clyde'
						if (conf.avatar) {
							msg.author.avatar = conf.avatar
						}
					}
					return msg
				})
			)
		}
	}

	const existingCreate = findByImportedPath('modules/messages/createMessage.tsx')
	if (existingCreate) {
		applyCreateMessage(existingCreate)
	} else {
		const unsubCreate = waitForImportedPath('modules/messages/createMessage.tsx', applyCreateMessage)
		if (typeof unsubCreate === 'function') unpatches.push(unsubCreate)
	}

	// 4. UserStore (getUser)
	const applyUserStore = (userStoreMod: any) => {
		const target = userStoreMod?.default || userStoreMod
		if (target?.getUser) {
			unpatches.push(
				revenge.patcher.instead(target, 'getUser', function (this: any, args: any[], orig: any) {
					const id = args[0]
					const user = Reflect.apply(orig, this, args)
					if (id === '1') {
						const conf = getConfig()
						const name = conf.name || 'Clyde'
						if (user) {
							user.username = name
							user.globalName = name
							if (conf.avatar) user.avatar = conf.avatar
							if (conf.banner) user.banner = conf.banner
							return user
						}
						// If UserStore has no record for Clyde, provide a synthetic User object
						return {
							id: '1',
							username: name,
							globalName: name,
							avatar: conf.avatar,
							banner: conf.banner || undefined,
							bot: true,
							discriminator: '0000',
						}
					}
					return user
				})
			)
		}
	}

	const existingUserStore = findByImportedPath('stores/UserStore.tsx') || (revenge as any).everest?.getUserStore?.()
	if (existingUserStore) {
		applyUserStore(existingUserStore)
	} else {
		const unsubUser = waitForImportedPath('stores/UserStore.tsx', applyUserStore)
		if (typeof unsubUser === 'function') unpatches.push(unsubUser)
	}

	// 5. AvatarUtils (getUserAvatarSource, getUserAvatarURL, getUserBannerURL)
	const applyAvatarUtils = (avatarMod: any) => {
		const target = avatarMod?.default || avatarMod
		if (!target) return

		if (target.getUserAvatarSource) {
			unpatches.push(
				revenge.patcher.instead(target, 'getUserAvatarSource', function (this: any, args: any[], orig: any) {
					const user = args[0]
					if (user?.id === '1' || user?.username?.toLowerCase() === 'clyde') {
						const conf = getConfig()
						if (conf.avatar) {
							return { uri: conf.avatar }
						}
					}
					return Reflect.apply(orig, this, args)
				})
			)
		}

		if (target.getUserAvatarURL) {
			unpatches.push(
				revenge.patcher.instead(target, 'getUserAvatarURL', function (this: any, args: any[], orig: any) {
					const user = args[0]
					if (user?.id === '1' || user?.username?.toLowerCase() === 'clyde') {
						const conf = getConfig()
						if (conf.avatar) {
							return conf.avatar
						}
					}
					return Reflect.apply(orig, this, args)
				})
			)
		}

		if (target.getUserBannerURL) {
			unpatches.push(
				revenge.patcher.instead(target, 'getUserBannerURL', function (this: any, args: any[], orig: any) {
					const user = args[0]
					if (user?.id === '1' || user?.username?.toLowerCase() === 'clyde') {
						const conf = getConfig()
						if (conf.banner) {
							return conf.banner
						}
					}
					return Reflect.apply(orig, this, args)
				})
			)
		}
	}

	const existingAvatar = findByImportedPath('utils/AvatarUtils.tsx')
	if (existingAvatar) {
		applyAvatarUtils(existingAvatar)
	} else {
		const unsubAvatar = waitForImportedPath('utils/AvatarUtils.tsx', applyAvatarUtils)
		if (typeof unsubAvatar === 'function') unpatches.push(unsubAvatar)
	}

	// 6. useMessageAuthor (getMessageAuthor - author nick and role color in chat)
	const applyAuthorMod = (authorMod: any) => {
		const target = authorMod?.default || authorMod
		if (target?.getMessageAuthor) {
			unpatches.push(
				revenge.patcher.instead(target, 'getMessageAuthor', function (this: any, args: any[], orig: any) {
					const ret = Reflect.apply(orig, this, args)
					const message = args[0]
					if (message?.author?.id === '1' || message?.author?.username?.toLowerCase() === 'clyde') {
						const conf = getConfig()
						return {
							...ret,
							nick: conf.name || ret?.nick || 'Clyde',
							colorString: conf.color || ret?.colorString || '#5865F2',
						}
					}
					return ret
				})
			)
		}
	}

	const existingAuthor = findByImportedPath('modules/messages/useMessageAuthor.tsx')
	if (existingAuthor) {
		applyAuthorMod(existingAuthor)
	} else {
		const unsubAuthor = waitForImportedPath('modules/messages/useMessageAuthor.tsx', applyAuthorMod)
		if (typeof unsubAuthor === 'function') unpatches.push(unsubAuthor)
	}

	// 7. getTagProperties (modules/messages/native/renderer/getTagProperties.tsx - bot tag text, verified checkmark, colors)
	const applyTagMod = (tagMod: any) => {
		const target = tagMod?.default ? tagMod : { default: tagMod }
		if (typeof target?.default === 'function') {
			unpatches.push(
				revenge.patcher.instead(target, 'default', function (this: any, args: any[], orig: any) {
					const ret = Reflect.apply(orig, this, args)
					const message = args[0]?.message
					if (message?.author?.id === '1' || message?.author?.username?.toLowerCase() === 'clyde') {
						const conf = getConfig()
						const customText = conf.tagText || 'APP'
						const bg = conf.tagBackgroundColor ? processColor(conf.tagBackgroundColor) : undefined
						const textCol = conf.tagTextColor ? processColor(conf.tagTextColor) : undefined
						return {
							...ret,
							tagText: customText,
							tagAccessibilityLabel: customText,
							tagBackgroundColor: bg ?? ret?.tagBackgroundColor,
							tagTextColor: textCol ?? ret?.tagTextColor,
							tagVerified: conf.tagVerified ?? true,
						}
					}
					return ret
				})
			)
		}
	}

	const existingTag = findByImportedPath('modules/messages/native/renderer/getTagProperties.tsx')
	if (existingTag) {
		applyTagMod(existingTag)
	} else {
		const unsubTag = waitForImportedPath('modules/messages/native/renderer/getTagProperties.tsx', applyTagMod)
		if (typeof unsubTag === 'function') unpatches.push(unsubTag)
	}

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
		const botMsgMod = findByImportedPath('modules/messages/createMessage.tsx')
		const msgMod = findByImportedPath('actions/MessageActionCreators.tsx')?.default
		const channelStore = (revenge as any).everest?.getSelectedChannelStore?.()
		const channelId = channelStore?.getChannelId?.()

		if (!botMsgMod?.createBotMessage || !msgMod?.receiveMessage || !channelId) return false

		const conf = { ...CLYDE_DEFAULTS, ...(storage.cache ?? {}) }
		const name = conf.name || 'Clyde'
		const content = `Hello! I am ${name}. Your custom Clyde styling has been applied!`

		const msg = botMsgMod.createBotMessage({ channelId, content })
		if (msg?.author) {
			msg.author.username = name
			msg.author.globalName = name
			if (conf.avatar) {
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
		const messageStore = (revenge as any).everest?.getMessageStore?.()
		const channelStore = (revenge as any).everest?.getSelectedChannelStore?.()
		const dispatcher = (revenge as any).discord?.flux?.Dispatcher
		const channelId = channelStore?.getChannelId?.()

		if (!messageStore || !dispatcher || !channelId) return

		const messages = messageStore.getMessages(channelId)?._array || []
		const conf = { ...CLYDE_DEFAULTS, ...(storage.cache ?? {}) }
		const name = conf.name || 'Clyde'

		for (const m of messages) {
			if (m?.author?.id === '1' || m?.author?.username?.toLowerCase() === 'clyde') {
				dispatcher.dispatch({
					type: 'MESSAGE_UPDATE',
					message: {
						id: m.id,
						channel_id: channelId,
						author: {
							...m.author,
							username: name,
							globalName: name,
							avatar: conf.avatar || m.author.avatar,
						},
						nick: name,
					},
				})
			}
		}
	} catch {}
}
