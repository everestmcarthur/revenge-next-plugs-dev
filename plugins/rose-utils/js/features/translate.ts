import { RoseUtilsSettings } from '../types'
import { getClientUtils } from '../shared'
import { discordModules } from '../../../shared/discord-modules'

export const SUPPORTED_LANGUAGES: { code: string; name: string }[] = [
	{ code: 'en', name: 'English' },
	{ code: 'es', name: 'Spanish' },
	{ code: 'fr', name: 'French' },
	{ code: 'de', name: 'German' },
	{ code: 'ja', name: 'Japanese' },
	{ code: 'ko', name: 'Korean' },
	{ code: 'zh-CN', name: 'Chinese (Simplified)' },
	{ code: 'ru', name: 'Russian' },
	{ code: 'pt', name: 'Portuguese' },
	{ code: 'it', name: 'Italian' },
	{ code: 'ar', name: 'Arabic' },
	{ code: 'hi', name: 'Hindi' },
	{ code: 'nl', name: 'Dutch' },
	{ code: 'pl', name: 'Polish' },
	{ code: 'tr', name: 'Turkish' },
	{ code: 'vi', name: 'Vietnamese' },
	{ code: 'uk', name: 'Ukrainian' },
	{ code: 'id', name: 'Indonesian' },
	{ code: 'th', name: 'Thai' },
	{ code: 'sv', name: 'Swedish' },
]

export function resolveLangCode(input?: string): string {
	if (!input) return 'en'
	const clean = input.trim().toLowerCase()
	const match = SUPPORTED_LANGUAGES.find(
		(l) => l.code.toLowerCase() === clean || l.name.toLowerCase() === clean
	)
	if (match) return match.code
	return clean.slice(0, 5)
}

export async function translateText(text: string, targetLang = 'en'): Promise<{ translated: string; src: string }> {
	if (!text || !text.trim()) return { translated: text, src: 'auto' }
	try {
		const lang = resolveLangCode(targetLang)
		const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`
		const res = await fetch(url)
		if (!res.ok) return { translated: text, src: 'unknown' }
		const data = await res.json()
		const src = data?.[2] || 'unknown'
		const translated = Array.isArray(data?.[0])
			? data[0].map((chunk: any) => chunk?.[0] || '').join('')
			: text
		return { translated: translated || text, src }
	} catch {
		return { translated: text, src: 'unknown' }
	}
}

function getDispatcher() {
	try {
		const raw = (globalThis as any).__r?.(573)
		return raw?.default || raw
	} catch {
		return null
	}
}

function getCurrentUserId(): string | null {
	try {
		const raw = (globalThis as any).__r?.(1372)
		const userStore = raw?.default || raw
		return userStore?.getCurrentUser?.()?.id || null
	} catch {
		return null
	}
}

const translatedMessageIds = new Set<string>()

export function initTranslate(settings: RoseUtilsSettings): () => void {
	const cleanups: (() => void)[] = []
	const clientUtils = getClientUtils()
	const r = (globalThis as any).__r

	if (clientUtils?.registerCommand) {
		clientUtils.registerCommand(
			{
				name: 'translate',
				displayName: 'translate',
				description: 'Translate text into another language',
				options: [
					{
						type: 3,
						name: 'text',
						displayName: 'text',
						description: 'The text to translate',
						required: true,
					},
					{
						type: 3,
						name: 'to',
						displayName: 'to',
						description: 'Target language (e.g. es, Spanish, fr, German)',
						required: false,
						choices: SUPPORTED_LANGUAGES.slice(0, 20).map((l) => ({
							name: `${l.name} (${l.code})`,
							displayName: `${l.name} (${l.code})`,
							value: l.code,
						})),
					},
					{
						type: 3,
						name: 'ephemeral',
						displayName: 'ephemeral',
						description: 'Show response only to you (optional)',
						required: false,
						choices: [{ name: 'True', displayName: 'True', value: 'true' }],
					},
				],
				execute: async (args: any, ctx: any) => {
					let text = args.text || args.content || args.message || ''
					if (!text) {
						ctx.reply({
							ephemeral: true,
							content: 'Please provide text to translate.',
						})
						return
					}
					let rawTo = args.to || args.target || args.lang || args.language || ''
					if (!rawTo) {
						const toMatch = text.match(/(.*?)\s+(?:to|into|->|➔)\s+([a-zA-Z\-]{2,15})$/i)
						if (toMatch) {
							text = toMatch[1].trim()
							rawTo = toMatch[2].trim()
						}
					}
					const targetLang = resolveLangCode(rawTo || settings.translateIncomingTargetLang || 'en')
					const isEphemeral = args.ephemeral === 'true' || args.ephemeral === true || args.ephemeral === 'True'
					const { translated, src } = await translateText(text, targetLang)

					ctx.reply({
						ephemeral: isEphemeral,
						content: `${translated}\n-# ${src.toUpperCase()} ➔ ${targetLang.toUpperCase()}`,
					})
				},
			},
			{
				id: 'dev.everestmcarthur.rose-utils',
				name: 'Rose Utils',
				description: 'Rose Utils commands',
			}
		)
		cleanups.push(() => {
			clientUtils.unregisterCommand('translate')
		})
	}

	if (settings.translateIncomingEnabled) {
		const dispatcher = getDispatcher()
		if (dispatcher?.subscribe) {
			const onMessageCreate = async (event: any) => {
				try {
					const msg = event?.message
					if (!msg || !msg.id || !msg.content || typeof msg.content !== 'string') return
					if (translatedMessageIds.has(msg.id)) return

					const myId = getCurrentUserId()
					if (msg.author?.id && myId && msg.author.id === myId) return

					const targetLang = resolveLangCode(settings.translateIncomingTargetLang || 'en')
					const { translated, src } = await translateText(msg.content, targetLang)

					if (src === targetLang || !translated || translated === msg.content) return

					translatedMessageIds.add(msg.id)
					if (translatedMessageIds.size > 500) {
						const first = translatedMessageIds.values().next().value
						if (first) translatedMessageIds.delete(first)
					}

					const updatedContent = `${msg.content}\n\n${translated}\n-# ${src.toUpperCase()} ➔ ${targetLang.toUpperCase()}`

					dispatcher.dispatch({
						type: 'MESSAGE_UPDATE',
						message: {
							id: msg.id,
							channel_id: msg.channel_id || event.channelId,
							content: updatedContent,
						},
					})
				} catch {}
			}

			dispatcher.subscribe('MESSAGE_CREATE', onMessageCreate)
			cleanups.push(() => {
				dispatcher.unsubscribe?.('MESSAGE_CREATE', onMessageCreate)
			})
		}
	}

	if (settings.translateOutgoingEnabled) {
		try {
			const sendUtilsId = discordModules['modules/chat_input/native/accessories/ChatInputSendUtils.tsx']
			const sendUtils = r?.(sendUtilsId)
			if (sendUtils && typeof sendUtils.chatInputHandleSendText === 'function') {
				const unpatchSendText = revenge.patcher.instead(
					sendUtils,
					'chatInputHandleSendText',
					async (args: any[], orig: any) => {
						try {
							const data = args[0]
							const rawText = typeof data === 'string' ? data : data?.text || data?.value || ''
							if (rawText && !rawText.startsWith('/')) {
								const targetLang = resolveLangCode(settings.translateOutgoingTargetLang || 'en')
								const { translated, src } = await translateText(rawText, targetLang)
								if (translated && src !== targetLang) {
									if (typeof data === 'string') {
										args[0] = translated
									} else {
										if (data.text !== undefined) data.text = translated
										if (data.value !== undefined) data.value = translated
									}
								}
							}
						} catch {}
						return orig.apply(sendUtils, args)
					}
				)
				if (unpatchSendText) cleanups.push(unpatchSendText)
			}
		} catch {}

		try {
			const messageActionsId = discordModules['actions/MessageActionCreators.tsx']
			const raw = r?.(messageActionsId)
			const MessageActions = raw?.default || raw
			if (MessageActions) {
				if (typeof MessageActions.sendMessage === 'function') {
					const unpatch = revenge.patcher.instead(
						MessageActions,
						'sendMessage',
						async (args: any[], orig: any) => {
							try {
								const targetLang = resolveLangCode(settings.translateOutgoingTargetLang || 'en')
								const msg = args[1]
								if (msg && typeof msg.content === 'string' && !msg._translated) {
									const { translated, src } = await translateText(msg.content, targetLang)
									if (translated && src !== targetLang) {
										msg.content = translated
										msg._translated = true
									}
								}
							} catch {}
							return orig.apply(MessageActions, args)
						}
					)
					if (unpatch) cleanups.push(unpatch)
				}
				if (typeof MessageActions._sendMessage === 'function') {
					const unpatch = revenge.patcher.instead(
						MessageActions,
						'_sendMessage',
						async (args: any[], orig: any) => {
							try {
								const targetLang = resolveLangCode(settings.translateOutgoingTargetLang || 'en')
								const msg = args[1]
								if (msg && typeof msg.content === 'string' && !msg._translated) {
									const { translated, src } = await translateText(msg.content, targetLang)
									if (translated && src !== targetLang) {
										msg.content = translated
										msg._translated = true
									}
								}
							} catch {}
							return orig.apply(MessageActions, args)
						}
					)
					if (unpatch) cleanups.push(unpatch)
				}
			}
		} catch {}
	}

	return () => {
		for (const fn of cleanups) fn()
	}
}
