import { getHTTPUtils } from '../api'
import { findByProps, showToast } from '../components'
import { extractStealableAssets } from '../extractor'
import { openVaultPicker } from '../patches/chatInput'
import { openStealerSheet } from '../patches/messageActionSheet'
import type { StealableAsset } from '../types'

export function registerSlashCommands(): () => void {
	const getClientUtils = () => {
		try {
			if (typeof revenge !== 'undefined' && revenge?.plugins?.clientUtils) {
				return revenge.plugins.clientUtils
			}
		} catch {}
		const rev = (globalThis as any).revenge
		let cu = rev?.plugins?.clientUtils
		if (!cu) {
			try {
				if (typeof __c_utils !== 'undefined') cu = __c_utils
			} catch {}
			cu ??= (globalThis as any).__c_utils
		}
		return cu
	}

	const register = () => {
		const clientUtils = getClientUtils()
		if (!clientUtils?.registerCommand) return false

		try {
			// Command 1: /vault (open emoji vault)
			clientUtils.registerCommand(
				{
					name: 'vault',
					displayName: 'vault',
					description: 'Open your ImageStealer Emoji Vault',
					options: [],
					execute: async () => {
						openVaultPicker()
					},
				},
				'ImageStealer',
			)

			// Command 2: /steal (steal emojis from latest message or specified ID)
			clientUtils.registerCommand(
				{
					name: 'steal',
					displayName: 'steal',
					description:
						'Steal emojis and stickers from recent message or message ID',
					options: [
						{
							type: 3,
							name: 'message_id',
							displayName: 'message_id',
							description:
								'Message ID or link to steal from (defaults to recent message in channel)',
							required: false,
						},
					],
					execute: async (args: any, ctx: any) => {
						const getArg = (name: string) => {
							if (!args) return undefined
							if (typeof args[name] !== 'undefined') return args[name]
							if (Array.isArray(args)) {
								const item = args.find((a: any) => a?.name === name)
								return item?.value
							}
							return undefined
						}

						const rawInput = getArg('message_id') || getArg('target') || ''
						const strInput = String(rawInput || '').trim()

						const rev = (globalThis as any).revenge
						const SelectedChannelStore =
							rev?.everest?.getSelectedChannelStore?.() ||
							findByProps('getChannelId', 'getVoiceChannelId')
						const channelId =
							ctx?.channelId ||
							ctx?.channel?.id ||
							SelectedChannelStore?.getChannelId?.() ||
							''

						let targetMessage: any = null
						let assets: StealableAsset[] = []

						// 1. Direct emoji input: <:name:id> or <a:name:id>
						const emojiMatch = strInput.match(
							/<(a)?:([a-zA-Z0-9_]+):([0-9]{15,22})>/,
						)
						if (emojiMatch) {
							const isAnimated = emojiMatch[1] === 'a'
							const name = emojiMatch[2]
							const id = emojiMatch[3]
							assets.push({
								id,
								name,
								url: `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'webp'}?size=128&quality=lossless`,
								animated: isAnimated,
								type: 'emoji',
							})
						}

						// 2. Direct Discord emoji/sticker/image URL input
						if (assets.length === 0 && /^https?:\/\//i.test(strInput)) {
							const urlEmojiMatch = strInput.match(
								/\/emojis\/([0-9]{15,22})\.([a-z0-9]+)/i,
							)
							if (urlEmojiMatch) {
								const id = urlEmojiMatch[1]
								const isAnimated = urlEmojiMatch[2].toLowerCase() === 'gif'
								assets.push({
									id,
									name: `emoji_${id}`,
									url: strInput,
									animated: isAnimated,
									type: 'emoji',
								})
							} else if (strInput.includes('/stickers/')) {
								const stickerId = strInput.match(
									/\/stickers\/([0-9]{15,22})/i,
								)?.[1]
								assets.push({
									id: stickerId || strInput,
									name: `sticker_${stickerId || 'item'}`,
									url: strInput,
									animated: strInput.includes('.gif'),
									type: 'sticker',
								})
							} else if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(strInput)) {
								assets.push({
									id: strInput,
									name: 'custom_image',
									url: strInput,
									animated: strInput.toLowerCase().includes('.gif'),
									type: 'attachment',
								})
							}
						}

						// 3. Message link or Message ID
						const MessageStore =
							rev?.everest?.getMessageStore?.() ||
							findByProps('getMessages', 'getMessage')

						const msgIdMatch = strInput.match(/([0-9]{17,21})$/)
						const msgId = msgIdMatch ? msgIdMatch[1] : undefined

						if (assets.length === 0 && msgId && channelId) {
							if (MessageStore?.getMessage) {
								targetMessage = MessageStore.getMessage(channelId, msgId)
								if (targetMessage) {
									assets = extractStealableAssets(targetMessage)
								}
							}
							if (assets.length === 0) {
								try {
									const http = getHTTPUtils()
									const res = await http?.get?.({
										url: `/channels/${channelId}/messages/${msgId}`,
									})
									if (res?.body) {
										targetMessage = res.body
										assets = extractStealableAssets(res.body)
									}
								} catch {}
							}
						}

						// 4. Backwards search in active channel if no assets found yet
						if (assets.length === 0 && channelId) {
							if (MessageStore?.getMessages) {
								const list = MessageStore.getMessages(channelId)
								const arr =
									list?.toArray?.() ||
									list?._array ||
									(Array.isArray(list) ? list : [])
								for (let i = arr.length - 1; i >= 0; i--) {
									const m = arr[i]
									const found = extractStealableAssets(m)
									if (found.length > 0) {
										targetMessage = m
										assets = found
										break
									}
								}
							}

							// 5. HTTP fallback: fetch recent messages if store was empty
							if (assets.length === 0) {
								try {
									const http = getHTTPUtils()
									const res = await http?.get?.({
										url: `/channels/${channelId}/messages?limit=25`,
									})
									const fetched = Array.isArray(res?.body) ? res.body : []
									for (const m of fetched) {
										const found = extractStealableAssets(m)
										if (found.length > 0) {
											targetMessage = m
											assets = found
											break
										}
									}
								} catch {}
							}
						}

						if (assets.length > 0) {
							openStealerSheet(assets, targetMessage?.id, channelId)
							return ctx?.reply?.({
								ephemeral: true,
								content: `🔍 Found ${assets.length} item(s)${targetMessage?.author?.username ? ` from @${targetMessage.author.username}` : ''}. Opened Stealer!`,
							})
						} else {
							showToast('No custom emojis or stickers found in recent messages')
							return ctx?.reply?.({
								ephemeral: true,
								content:
									'❌ No custom emojis, stickers, or images found in recent messages.',
							})
						}
					},
				},
				'ImageStealer',
			)

			return true
		} catch (e) {
			console.error('[ImageStealer] Error registering slash commands:', e)
			return false
		}
	}

	if (!register()) {
		const timer = setTimeout(() => {
			register()
		}, 1000)
		return () => clearTimeout(timer)
	}

	return () => {
		const cu = getClientUtils()
		if (typeof cu?.unregisterCommand === 'function') {
			try {
				cu.unregisterCommand('vault')
				cu.unregisterCommand('steal')
			} catch {}
		}
	}
}
