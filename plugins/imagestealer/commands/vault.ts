import { findByProps, showToast } from '../components'
import { extractStealableAssets } from '../extractor'
import { openVaultPicker } from '../patches/chatInput'
import { openStealerSheet } from '../patches/messageActionSheet'

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
								'Message ID to steal from (defaults to latest message in channel)',
							required: false,
						},
					],
					execute: async (args: any, ctx: any) => {
						const msgId = args?.message_id
						const channelId = ctx?.channel?.id
						const rev = (globalThis as any).revenge
						const MessageStore =
							rev?.everest?.getMessageStore?.() ||
							findByProps('getMessages', 'getMessage')

						let targetMessage: any = null
						if (msgId && MessageStore?.getMessage) {
							targetMessage = MessageStore.getMessage(channelId, msgId)
						}

						if (!targetMessage && channelId && MessageStore?.getMessages) {
							const list = MessageStore.getMessages(channelId)
							const arr =
								list?.toArray?.() ||
								list?._array ||
								(Array.isArray(list) ? list : [])
							if (arr.length > 0) {
								targetMessage = arr[arr.length - 1]
							}
						}

						if (targetMessage) {
							const assets = extractStealableAssets(targetMessage)
							if (assets.length > 0) {
								openStealerSheet(assets, targetMessage.id, channelId)
							} else {
								showToast('No custom emojis or stickers found in message')
							}
						} else {
							showToast('Could not find recent message to steal from')
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
