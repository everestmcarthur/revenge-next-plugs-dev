import { getModule, getFilters, showToast, getActionSheetRow, getLazyActionSheet, getReact } from '../shared'
import type { RoseUtilsSettings } from '../types'

export function initSilentEdit(settings: RoseUtilsSettings): () => void {
	if (!settings.silentEdit && !settings.silentEditAlways) return () => {}

	const cleanups: (() => void)[] = []
	let pendingSilentEditId: string | null = null

	const MessageActions = getModule(getFilters().withProps('editMessage'))
	const RestAPI = getModule(getFilters().withProps('get', 'post', 'del'))
	const UserStore = getModule(getFilters().withProps('getCurrentUser'))
	const LazyActionSheet = getLazyActionSheet()
	const ActionSheetRow = getActionSheetRow()
	const React = getReact()

	if (MessageActions && RestAPI) {
		const unpatch = revenge.patcher.instead(MessageActions, 'editMessage', async (args: any, orig: any) => {
			const [channelId, messageId, reqData] = args
			const shouldSilent = settings.silentEditAlways || pendingSilentEditId === messageId
			if (!shouldSilent) {
				return orig.apply(MessageActions, args)
			}
			pendingSilentEditId = null

			try {
				let msg: any = null
				try {
					const originalMessage = await RestAPI.get({
						url: `/channels/${channelId}/messages`,
						query: { limit: 10, around: messageId },
					})
					const msgArray = originalMessage?.body
					if (Array.isArray(msgArray)) {
						msg = msgArray.find((m: any) => m.id === messageId)
					}
				} catch {}

				const nonce = (BigInt(Date.now() - 1420070400000) << 22n).toString()
				const body: any = {
					content: reqData.content || '',
					nonce: nonce,
					tts: false,
					flags: msg?.flags ?? 0,
					mobile_network_type: 'wifi',
				}

				if (msg?.attachments && msg.attachments.length) {
					body.attachments = msg.attachments
				}

				if (msg?.message_reference) {
					body.message_reference = {
						message_id: msg.message_reference.message_id,
						channel_id: msg.message_reference.channel_id,
						guild_id: msg.message_reference.guild_id,
					}
					const repliedUser = msg.referenced_message?.author?.id
					const hasPing = repliedUser ? msg.mentions?.some((m: any) => m.id === repliedUser) : false
					body.allowed_mentions = {
						replied_user: hasPing,
						parse: ['users', 'roles', 'everyone'],
					}
				}

				const res = await RestAPI.post({
					url: `/channels/${channelId}/messages`,
					body,
				})

				await RestAPI.del({
					url: `/channels/${channelId}/messages/${messageId}`,
				})

				showToast('Message edited silently')
				return res
			} catch (e: any) {
				showToast(`Silent edit fallback: ${e?.message || e}`)
				return orig.apply(MessageActions, args)
			}
		})
		cleanups.push(unpatch)
	}

	if (LazyActionSheet && ActionSheetRow && React) {
		const unpatchSheet = revenge.patcher.before(LazyActionSheet, 'openLazy', (args: any) => {
			const [componentPromise, key, msg] = args
			if (key !== 'MessageLongPressActionSheet' || !msg?.message) return args
			const message = msg.message
			const currentUser = UserStore?.getCurrentUser?.()
			if (!currentUser || message.author?.id !== currentUser.id) return args

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

						const editIdx = children.findIndex((c: any) => {
							const l = (c?.props?.label || '').toLowerCase()
							return l.includes('edit')
						})
						if (editIdx < 0) return comp

						const editOnPress = children[editIdx].props.onPress
						const silentEditBtn = React.createElement(ActionSheetRow, {
							label: 'Silent Edit',
							onPress: () => {
								pendingSilentEditId = message.id
								if (editOnPress) editOnPress()
							},
						})

						children.splice(editIdx + 1, 0, silentEditBtn)
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
