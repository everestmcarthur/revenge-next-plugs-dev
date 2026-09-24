import { getModule, getFilters, showToast, getDispatcher } from '../shared'
import type { RoseUtilsSettings } from '../types'

export function initUserNotif(settings: RoseUtilsSettings): () => void {
	if (!settings.userNotif) return () => {}

	const Dispatcher = getDispatcher()
	const PresenceStore = getModule(getFilters().withProps('getStatus'))
	const RelationshipStore = getModule(getFilters().withProps('getFriendIDs'))
	const ChannelStore = getModule(getFilters().withProps('getChannel'))
	const GuildStore = getModule(getFilters().withProps('getGuild'))
	const UserStore = getModule(getFilters().withProps('getUser'))

	if (!Dispatcher?.subscribe) return () => {}

	const getTrackedIds = (): Set<string> => {
		const set = new Set<string>()
		if (settings.userNotifTrackFriends && RelationshipStore?.getFriendIDs) {
			try {
				const friends = RelationshipStore.getFriendIDs()
				if (Array.isArray(friends)) {
					for (const id of friends) {
						set.add(id)
					}
				}
			} catch {}
		}
		if (Array.isArray(settings.userNotifTrackedIds)) {
			for (const id of settings.userNotifTrackedIds) {
				set.add(id)
			}
		}
		return set
	}

	const getName = (id: string): string => {
		try {
			const u = UserStore?.getUser?.(id)
			return u?.globalName || u?.username || id
		} catch {
			return id
		}
	}

	const lastStatuses: Record<string, string | undefined> = {}
	for (const id of getTrackedIds()) {
		try {
			lastStatuses[id] = PresenceStore?.getStatus?.(id)
		} catch {}
	}

	const onPresence = (p: any) => {
		const id = p?.user?.id
		if (!id || !getTrackedIds().has(id)) return
		if (lastStatuses[id] !== p.status) {
			lastStatuses[id] = p.status
			showToast(`${getName(id)} is now ${p.status}`)
		}
	}

	const onMessage = (p: any) => {
		const m = p?.message
		const id = m?.author?.id
		if (!id || !getTrackedIds().has(id)) return
		const c = ChannelStore?.getChannel?.(m.channel_id)

		if (c?.guild_id) {
			const g = GuildStore?.getGuild?.(c.guild_id)
			showToast(`${getName(id)} in ${g?.name || 'server'} #${c.name || 'chat'}: ${m.content || 'media'}`)
		} else {
			showToast(`${getName(id)}: ${m.content || 'sent a message'}`)
		}
	}

	const onTyping = (p: any) => {
		const id = p?.userId
		if (!id || !getTrackedIds().has(id)) return
		const c = ChannelStore?.getChannel?.(p.channelId)

		if (c?.guild_id) {
			const g = GuildStore?.getGuild?.(c.guild_id)
			showToast(`${getName(id)} is typing in ${g?.name || 'server'}`)
		} else {
			showToast(`${getName(id)} is typing`)
		}
	}

	const unpatchPresence = revenge.patcher.before(Dispatcher, 'dispatch', (args: any[]) => {
		const action = args?.[0]
		if (action?.type === 'PRESENCE_UPDATE') {
			onPresence(action)
		}
		return args
	})

	Dispatcher.subscribe('MESSAGE_CREATE', onMessage)
	Dispatcher.subscribe('TYPING_START', onTyping)

	return () => {
		unpatchPresence()
		try {
			Dispatcher.unsubscribe('MESSAGE_CREATE', onMessage)
			Dispatcher.unsubscribe('TYPING_START', onTyping)
		} catch {}
	}
}
