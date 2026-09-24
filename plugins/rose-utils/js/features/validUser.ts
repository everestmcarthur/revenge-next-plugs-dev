import { getModule, getFilters, getLazyActionSheet, getActionSheetRow } from '../shared'
import type { RoseUtilsSettings } from '../types'

function extractMentionIds(message: any): string[] {
	if (!message?.content) return []
	const matches = message.content.matchAll(/<@!?([0-9]+)>/g)
	const ids = new Set<string>()
	for (const m of matches) {
		if (m[1]) ids.add(m[1])
	}
	return Array.from(ids)
}

export function initValidUser(settings: RoseUtilsSettings): () => void {
	if (!settings.validUser) return () => {}

	const cleanups: (() => void)[] = []
	const UserStore = getModule(getFilters().withProps('getUser'))
	const UserUtils = getModule(getFilters().withProps('fetchUser'))
	const RestAPI = getModule(getFilters().withProps('get', 'post'))
	const Dispatcher = getModule(getFilters().withProps('dispatch', 'subscribe'))
	const AvatarUtils = getModule(getFilters().withProps('getDefaultAvatarURL'))
	const LazyActionSheet = getLazyActionSheet()
	const ActionSheetRow = getActionSheetRow()
	const React = (globalThis as any).revenge?.react?.React || (globalThis as any).React

	if (AvatarUtils?.getDefaultAvatarURL) {
		const unpatchAvatar = revenge.patcher.instead(AvatarUtils, 'getDefaultAvatarURL', (args: any, orig: any) => {
			try {
				const [id] = args
				if (typeof id === 'string' || typeof id === 'number' || id == null) {
					return orig.apply(AvatarUtils, args)
				}
				return orig.call(AvatarUtils, String(id.id ?? '0'), typeof id.discriminator === 'string' ? id.discriminator : '0000')
			} catch {
				return orig.call(AvatarUtils, '0', '0000')
			}
		})
		cleanups.push(unpatchAvatar)
	}

	const fetchUserById = async (userId: string) => {
		if (UserStore?.getUser?.(userId)) return
		if (typeof UserUtils?.fetchUser === 'function') {
			try {
				await UserUtils.fetchUser(userId)
				return
			} catch {}
		}
		if (RestAPI?.get) {
			try {
				const res = await RestAPI.get({ url: `/users/${userId}` })
				if (res?.body && Dispatcher?.dispatch) {
					Dispatcher.dispatch({ type: 'USER_UPDATE', user: res.body })
				}
			} catch {}
		}
	}

	const fixMentions = async (message: any) => {
		const ids = extractMentionIds(message)
		if (ids.length === 0) return
		for (const id of ids) {
			await fetchUserById(id)
		}
		const channelId = message.channel_id || message.channelId
		if (channelId && message.id && Dispatcher?.dispatch) {
			Dispatcher.dispatch({
				type: 'MESSAGE_UPDATE',
				message: {
					id: message.id,
					channel_id: channelId,
					content: message.content,
					embeds: message.embeds,
					components: message.components,
				},
			})
		}
	}

	if (LazyActionSheet && ActionSheetRow && React) {
		const unpatchSheet = revenge.patcher.before(LazyActionSheet, 'openLazy', (args: any) => {
			const [componentPromise, key, msg] = args
			if (key !== 'MessageLongPressActionSheet' || !msg?.message) return args
			const message = msg.message
			const ids = extractMentionIds(message)
			if (ids.length === 0) return args

			componentPromise.then((instance: any) => {
				const unpatchInner = revenge.patcher.after(instance, 'default', (comp: any) => {
					try {
						const searchChildren = (node: any): any[] | null => {
							if (!node) return null
							if (Array.isArray(node)) {
								for (const item of node) {
									const res = searchChildren(item)
									if (res) return res
								}
								return null
							}
							if (node.props?.children) {
								if (Array.isArray(node.props.children)) {
									const hasRow = node.props.children.some(
										(c: any) => c?.type?.name === 'ActionSheetRow' || c?.props?.label
									)
									if (hasRow) return node.props.children
								}
								return searchChildren(node.props.children)
							}
							return null
						}

						const children = searchChildren(comp)
						if (!children) return comp

						const fixRow = React.createElement(ActionSheetRow, {
							label: ids.length === 1 ? 'Fix 1 @Mention' : `Fix ${ids.length} @Mentions`,
							onPress: () => {
								if (LazyActionSheet?.hideActionSheet) LazyActionSheet.hideActionSheet()
								fixMentions(message)
							},
						})
						children.unshift(fixRow)
					} catch {}
					return comp
				})
				cleanups.push(unpatchInner)
			})
			return args
		})
		cleanups.push(unpatchSheet)
	}

	return () => {
		for (const fn of cleanups) fn()
	}
}
