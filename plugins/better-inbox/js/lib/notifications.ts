import type { JsonStorage } from '@revenge-mod/json-storage'
import type { BetterInboxStorage, NotificationItem, NotificationCategory, MentionSubCategory } from './types'

let memoryNotifications: NotificationItem[] = []
const listeners = new Set<() => void>()
let storageRef: JsonStorage<BetterInboxStorage> | null = null
let saveTimeout: any = null

function syncStorageDebounced() {
	if (saveTimeout) clearTimeout(saveTimeout)
	saveTimeout = setTimeout(() => {
		if (!storageRef) return
		const max = storageRef.cache?.maxStored ?? 300
		storageRef.set({ notifications: memoryNotifications.slice(0, max) })
	}, 1000)
}

export function subscribeToNotifications(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function getNotifications(): NotificationItem[] {
	return memoryNotifications
}

export function clearNotifications(category?: NotificationCategory) {
	if (!category) {
		memoryNotifications = []
	} else {
		memoryNotifications = memoryNotifications.filter((n) => n.category !== category)
	}
	syncStorageDebounced()
	for (const l of listeners) {
		try {
			l()
		} catch {}
	}
}

export function deleteNotification(id: string) {
	memoryNotifications = memoryNotifications.filter((n) => n.id !== id)
	syncStorageDebounced()
	for (const l of listeners) {
		try {
			l()
		} catch {}
	}
}

export function pushNotification(item: NotificationItem) {
	if (memoryNotifications.some((n) => n.id === item.id)) return

	const max = storageRef?.cache?.maxStored ?? 300
	memoryNotifications = [item, ...memoryNotifications].slice(0, max)
	syncStorageDebounced()
	for (const l of listeners) {
		try {
			l()
		} catch {}
	}
}

function getStores() {
	const stores = (revenge.discord?.flux?.Stores ?? {}) as Record<string, any>
	return {
		UserStore: stores.UserStore,
		ChannelStore: stores.ChannelStore,
		GuildStore: stores.GuildStore,
		MessageStore: stores.MessageStore,
		GuildMemberStore: stores.GuildMemberStore,
		RelationshipStore: stores.RelationshipStore,
	}
}

function processMentionMessage(channelId: string, messageId: string, rawMsg?: any) {
	try {
		const { UserStore, ChannelStore, GuildStore, MessageStore } = getStores()
		const currentUser = UserStore?.getCurrentUser?.()
		if (!currentUser) return

		const msg = MessageStore?.getMessage?.(channelId, messageId) || rawMsg
		const channel = ChannelStore?.getChannel?.(channelId)
		if (!msg || !channel) return

		const author = msg.author || UserStore?.getUser?.(msg.author?.id)
		if (!author || author.id === currentUser.id) return

		const guild = channel.guild_id ? GuildStore?.getGuild?.(channel.guild_id) : undefined
		const guildName = guild?.name || (channel.isGroupDM?.() ? 'Group DM' : 'Direct Message')
		const channelName = channel.name ? `#${channel.name}` : 'DM'
		const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

		const isReply = msg.type === 19 || msg.referenced_message?.author?.id === currentUser.id
		const category: NotificationCategory = isReply ? 'replies' : 'mentions'

		let subCategory: Exclude<MentionSubCategory, 'all'> = 'people'
		if (category === 'mentions') {
			if (author.bot) {
				subCategory = 'bot'
			} else {
				const msgRoles = msg.mention_roles || msg.mentionRoles || []
				if (msgRoles.length > 0 && msg.guild_id) {
					subCategory = 'role'
				}
			}
		}

		pushNotification({
			id: `mention-${channelId}-${messageId}`,
			category,
			subCategory: category === 'mentions' ? subCategory : undefined,
			title: isReply
				? `${author.globalName || author.username} replied to you`
				: `${author.globalName || author.username} mentioned you`,
			content: msg.content || '',
			guildName,
			channelName,
			guildId: guild?.id,
			channelId,
			messageId,
			timestamp,
			author,
		})
	} catch (err) {
		console.error('[BetterInbox] Mention error:', err)
	}
}

function handleIncomingMessage(payload: any) {
	try {
		const cache = storageRef?.cache
		const { UserStore, GuildMemberStore } = getStores()
		const currentUser = UserStore?.getCurrentUser?.()
		if (!currentUser) return

		const msg = payload?.message || payload
		if (!msg || !msg.channel_id || msg.author?.id === currentUser.id) return

		const isDirectMention = msg.mentions?.some((u: any) => u.id === currentUser.id)
		const isReplyToMe = msg.referenced_message?.author?.id === currentUser.id

		let isRoleMention = false
		const msgRoles = msg.mention_roles || msg.mentionRoles || []
		if (msgRoles.length > 0 && msg.guild_id) {
			const myMember = GuildMemberStore?.getMember?.(msg.guild_id, currentUser.id)
			const myRoles: string[] = myMember?.roles || []
			isRoleMention = msgRoles.some((roleId: string) => myRoles.includes(roleId))
		}

		if (isReplyToMe && cache?.trackReplies === false) return
		if ((isDirectMention || isRoleMention) && !isReplyToMe && cache?.trackMentions === false) return
		if (!isDirectMention && !isReplyToMe && !isRoleMention) return

		processMentionMessage(msg.channel_id, msg.id, msg)
	} catch (err) {
		console.error('[BetterInbox] Incoming message error:', err)
	}
}

function handleReactionAdd(payload: any) {
	try {
		if (storageRef?.cache?.trackReactions === false) return
		const { UserStore, ChannelStore, GuildStore, MessageStore } = getStores()
		const currentUser = UserStore?.getCurrentUser?.()
		if (!currentUser) return

		const channelId = payload.channel_id || payload.channelId
		const targetMessageId = payload.message_id || payload.messageId
		const reactorId = payload.user_id || payload.userId

		if (reactorId === currentUser.id) return

		const targetMessage = MessageStore?.getMessage?.(channelId, targetMessageId)
		if (!targetMessage || targetMessage.author?.id !== currentUser.id) return

		const channel = ChannelStore?.getChannel?.(channelId)
		const guild = channel?.guild_id ? GuildStore?.getGuild?.(channel.guild_id) : undefined
		const guildName = guild?.name || 'Direct Message'
		const channelName = channel?.name ? `#${channel.name}` : 'DM'
		const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

		const reactorUser = payload.member?.user || payload.user || UserStore?.getUser?.(reactorId)
		const finalAuthor = reactorUser || {
			id: reactorId,
			username: payload.member?.nick || 'Someone',
			globalName: payload.member?.nick || 'Someone',
			avatar: null,
		}

		pushNotification({
			id: `react-${targetMessageId}-${reactorId}`,
			category: 'reactions',
			title: `${finalAuthor.globalName || finalAuthor.username || 'Someone'} reacted ${payload.emoji?.name || 'an emoji'}`,
			content: targetMessage?.content ? `"${targetMessage.content}"` : `Reacted to your message in ${channelName}`,
			guildName,
			channelName,
			guildId: guild?.id,
			channelId,
			messageId: targetMessageId,
			timestamp,
			author: finalAuthor,
		})
	} catch (err) {
		console.error('[BetterInbox] Reaction error:', err)
	}
}

const RELATIONSHIP_PENDING_INCOMING = 3

function handleRelationshipAdd(payload: any) {
	try {
		if (storageRef?.cache?.trackFriendRequests === false) return
		const relationship = payload?.relationship
		if (!relationship || relationship.type !== RELATIONSHIP_PENDING_INCOMING) return

		const user = relationship.user
		if (!user) return

		pushNotification({
			id: `friend-request-${relationship.id}`,
			category: 'friend_request',
			title: `${user.globalName || user.username || 'Someone'} sent you a friend request`,
			content: '',
			guildName: '',
			channelName: '',
			timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			author: user,
		})
	} catch (err) {
		console.error('[BetterInbox] Friend request error:', err)
	}
}

function handleFriendRequestAccepted(payload: any) {
	try {
		if (storageRef?.cache?.trackFriendRequests === false) return
		const user = payload?.user
		if (!user) return

		pushNotification({
			id: `friend-accepted-${user.id}-${Date.now()}`,
			category: 'friend_request',
			title: `${user.globalName || user.username || 'Someone'} accepted your friend request`,
			content: '',
			guildName: '',
			channelName: '',
			timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			author: user,
		})
	} catch (err) {
		console.error('[BetterInbox] Friend accept error:', err)
	}
}

function handleThreadMembersUpdate(payload: any) {
	try {
		if (storageRef?.cache?.trackThreads === false) return
		const { UserStore, ChannelStore, GuildStore } = getStores()
		const currentUser = UserStore?.getCurrentUser?.()
		if (!currentUser) return

		const addedMembers = payload?.addedMembers
		if (!Array.isArray(addedMembers) || !addedMembers.some((m: any) => m?.userId === currentUser.id)) return

		const threadId = payload.id
		const thread = ChannelStore?.getChannel?.(threadId)
		if (!thread) return

		const guildId = payload.guildId ?? thread.guild_id
		const guild = guildId ? GuildStore?.getGuild?.(guildId) : undefined

		pushNotification({
			id: `thread-added-${threadId}`,
			category: 'thread',
			title: 'You were added to a thread',
			content: thread.name ? `#${thread.name}` : '',
			guildName: guild?.name || '',
			channelName: thread.name ? `#${thread.name}` : '',
			guildId,
			channelId: threadId,
			timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
		})
	} catch (err) {
		console.error('[BetterInbox] Thread add error:', err)
	}
}

const ACTIVITY_TYPE_CUSTOM_STATUS = 4
const lastActivitySignature = new Map<string, string>()

function handlePresenceUpdate(update: any) {
	try {
		if (storageRef?.cache?.trackPresence !== true) return
		const user = update?.user
		const userId = user?.id
		if (!userId) return

		const { UserStore, RelationshipStore } = getStores()
		const currentUser = UserStore?.getCurrentUser?.()
		if (!currentUser || userId === currentUser.id) return

		const friendIds: string[] = RelationshipStore?.getFriendIDs?.() ?? []
		if (!friendIds.includes(userId) || user.bot) return

		const activities = update?.activities
		const customStatus = Array.isArray(activities)
			? activities.find((a: any) => a?.type === ACTIVITY_TYPE_CUSTOM_STATUS)
			: undefined

		const statusText: string = customStatus?.state || ''
		const emojiName: string | undefined = customStatus?.emoji?.name

		const signature = statusText || emojiName || ''
		if (lastActivitySignature.get(userId) === signature) return
		lastActivitySignature.set(userId, signature)

		if (!signature) return

		pushNotification({
			id: `presence-${userId}-${Date.now()}`,
			category: 'other',
			title: `${user.globalName || user.username || 'A friend'} updated their status`,
			content: statusText || (emojiName ? `:${emojiName}:` : ''),
			guildName: '',
			channelName: '',
			timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			author: user,
		})
	} catch (err) {
		console.error('[BetterInbox] Presence error:', err)
	}
}

function handlePresenceUpdates(payload: any) {
	const updates = payload?.updates
	if (!Array.isArray(updates)) return
	for (const update of updates) handlePresenceUpdate(update)
}

let isTracking = false

export function startInboxTracking(storage: JsonStorage<BetterInboxStorage>): () => void {
	storageRef = storage
	if (isTracking) return () => {}
	isTracking = true

	memoryNotifications = Array.isArray(storage.cache?.notifications)
		? [...storage.cache.notifications]
		: []

	const stores = (revenge.discord?.flux?.Stores ?? {}) as any
	const Dispatcher =
		stores.UserStore?._dispatcher ??
		stores.ChannelStore?._dispatcher ??
		stores.InAppNotificationStore?._dispatcher ??
		(revenge.discord?.flux as any)?.Dispatcher

	const cleanups: Array<() => void> = []

	if (Dispatcher && typeof Dispatcher.subscribe === 'function') {
		Dispatcher.subscribe('MESSAGE_CREATE', handleIncomingMessage)
		Dispatcher.subscribe('MESSAGE_REACTION_ADD', handleReactionAdd)
		Dispatcher.subscribe('RELATIONSHIP_ADD', handleRelationshipAdd)
		Dispatcher.subscribe('FRIEND_REQUEST_ACCEPTED', handleFriendRequestAccepted)
		Dispatcher.subscribe('THREAD_MEMBERS_UPDATE', handleThreadMembersUpdate)
		Dispatcher.subscribe('PRESENCE_UPDATES', handlePresenceUpdates)

		cleanups.push(() => {
			Dispatcher.unsubscribe('MESSAGE_CREATE', handleIncomingMessage)
			Dispatcher.unsubscribe('MESSAGE_REACTION_ADD', handleReactionAdd)
			Dispatcher.unsubscribe('RELATIONSHIP_ADD', handleRelationshipAdd)
			Dispatcher.unsubscribe('FRIEND_REQUEST_ACCEPTED', handleFriendRequestAccepted)
			Dispatcher.unsubscribe('THREAD_MEMBERS_UPDATE', handleThreadMembersUpdate)
			Dispatcher.unsubscribe('PRESENCE_UPDATES', handlePresenceUpdates)
		})
	} else if (typeof (revenge.discord?.flux as any)?.onFluxEventDispatched === 'function') {
		const onFlux = (revenge.discord.flux as any).onFluxEventDispatched
		const events = [
			['MESSAGE_CREATE', handleIncomingMessage],
			['MESSAGE_REACTION_ADD', handleReactionAdd],
			['RELATIONSHIP_ADD', handleRelationshipAdd],
			['FRIEND_REQUEST_ACCEPTED', handleFriendRequestAccepted],
			['THREAD_MEMBERS_UPDATE', handleThreadMembersUpdate],
			['PRESENCE_UPDATES', handlePresenceUpdates],
		] as const

		for (const [evt, handler] of events) {
			const unsub = onFlux(evt, (payload: any) => {
				try {
					handler(payload)
				} catch {}
				return payload
			})
			cleanups.push(unsub)
		}
	}

	return () => {
		isTracking = false
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}

		if (saveTimeout) clearTimeout(saveTimeout)
		const max = storageRef?.cache?.maxStored ?? 300
		storageRef?.set({ notifications: memoryNotifications.slice(0, max) })
		lastActivitySignature.clear()
	}
}
