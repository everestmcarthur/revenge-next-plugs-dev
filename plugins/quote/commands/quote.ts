import React from 'react'
import { checkQuoteAllowed, generateQuoteCard } from '../api'
import { findByProps, openLazyActionSheet } from '../components'
import QuoteActionSheet, { ACTION_SHEET_KEY } from '../QuoteActionSheet'
import {
	extractMessageInfo,
	getSelectedChannelIdSafe,
	sendQuoteToChannel,
} from '../quotes'
import { defaultSettings, getStoredSettings } from '../storage'

export function registerQuoteSlashCommand(): () => void {
	const getClientUtils = () => {
		let rev: any
		try {
			if (typeof revenge !== 'undefined') rev = revenge
		} catch {}
		rev ??= (globalThis as any).revenge
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
			clientUtils.registerCommand(
				{
					name: 'quote',
					displayName: 'quote',
					description:
						'Make It A Quote - Turn any message into a quote card image',
					options: [
						{
							type: 3, // String
							name: 'message_id',
							displayName: 'message_id',
							description:
								'Message ID to quote (defaults to the most recent message)',
							required: false,
						},
						{
							type: 3, // String
							name: 'custom_text',
							displayName: 'custom_text',
							description: 'Custom text to quote instead of message content',
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

						const messageId = getArg('message_id')
						const customText = getArg('custom_text')

						const targetChannelId =
							ctx?.channelId ||
							ctx?.channel?.id ||
							getSelectedChannelIdSafe() ||
							''

						const store = findByProps('getMessages', 'getMessage')
						let targetMsg: any
						if (messageId) {
							targetMsg = store?.getMessage?.(targetChannelId, messageId)
						} else {
							const channelMessages = store?.getMessages?.(targetChannelId)
							const msgsList =
								channelMessages?.toArray?.() ||
								channelMessages?._array ||
								(Array.isArray(channelMessages) ? channelMessages : [])
							targetMsg = msgsList[msgsList.length - 1]
						}

						if (!targetMsg) {
							return ctx.reply?.({
								ephemeral: true,
								content:
									'❌ Could not find message to quote in current channel.',
							})
						}

						const info = extractMessageInfo(targetMsg, targetChannelId)
						if (customText) {
							info.text = customText
						}

						const s = getStoredSettings()
						if (s?.instantQuote) {
							// Instant quote execution
							try {
								const def = s.defaultSettings ?? defaultSettings.defaultSettings

								// Run permission check and card generation concurrently
								const checkPromise = checkQuoteAllowed(
									info.targetUserId,
									info.hasSpoilers,
									Boolean(customText),
								)

								const cardPromise = generateQuoteCard({
									text: info.text || '...',
									avatar: info.avatarUrl,
									username: info.username,
									display_name: info.displayName,
									color: Boolean(def.color),
									watermark: def.watermark
										? def.watermarkText || 'Make It A Quote'
										: '',
									bold: Boolean(def.bold),
									light: Boolean(def.light),
									flip: Boolean(def.flip),
									new: Boolean(def.new),
									gif: Boolean(def.gif),
									theme: def.theme,
									font: def.font,
								})

								const [check, res] = await Promise.all([
									checkPromise,
									cardPromise,
								])

								if (!check.allowed) {
									return ctx.reply?.({
										ephemeral: true,
										content: `❌ ${check.reason || 'This user has disallowed quotes of their messages.'}`,
									})
								}

								if (res.success && res.url) {
									const finalUrl = res.ziplineUrl || res.url
									sendQuoteToChannel(info.channelId, finalUrl)
									return ctx.reply?.({
										ephemeral: true,
										content: '✅ Generated and sent quote to channel!',
									})
								}
								return ctx.reply?.({
									ephemeral: true,
									content: `❌ ${res.error || 'Failed to generate quote.'}`,
								})
							} catch (err) {
								console.error(
									'[Quote] Instant quote slash execution failed:',
									err,
								)
								return ctx.reply?.({
									ephemeral: true,
									content: '❌ Error generating instant quote.',
								})
							}
						}

						openLazyActionSheet(
							() =>
								React.createElement(QuoteActionSheet, { initialInfo: info }),
							ACTION_SHEET_KEY,
							{},
						)

						return ctx.reply?.({
							ephemeral: true,
							content: `💬 Opened Make It A Quote for message \`${targetMsg.id}\`.`,
						})
					},
				},
				{
					id: 'dev.everestmcarthur.quote',
					name: 'Make It A Quote',
					description:
						'Generate beautiful quote card images directly from messages',
					icon: 'QuoteIcon',
				},
			)
			return true
		} catch (e) {
			console.warn('[Quote] Failed to register slash command:', e)
			return false
		}
	}

	if (!register()) {
		const interval = setInterval(() => {
			if (register()) {
				clearInterval(interval)
			}
		}, 1000)

		return () => {
			clearInterval(interval)
			getClientUtils()?.unregisterCommand?.('quote')
		}
	}

	return () => {
		getClientUtils()?.unregisterCommand?.('quote')
	}
}
