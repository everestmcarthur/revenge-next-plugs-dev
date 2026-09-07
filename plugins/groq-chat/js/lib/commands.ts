import type { JsonStorage } from '@revenge-mod/json-storage'
import type { GroqChatStorage } from './types'
import { DEFAULT_MODEL, DEFAULT_PREFIX } from './constants'
import { queryGroq } from './groqApi'
import { getSelectedChannelId, sendLocalBotMessage, sendChannelMessage } from './discordMessages'
import { byProps, onModule } from './finders'

export function setupGroqCommands(storage: JsonStorage<GroqChatStorage>): () => void {
	const unpatches: Array<() => void> = []

	// Self-healing: purge any corrupt/untranslated commands lingering in Hermes memory
	try {
		const finder = revenge.modules?.finders
		const filter = finder?.filters?.withProps('getBuiltInCommands', 'BUILT_IN_COMMANDS')
		if (finder && filter) {
			const results = Array.from(finder.lookupModules(filter) as any[])
			for (const item of results) {
				const exp = item?.[0] || item
				if (Array.isArray(exp?.BUILT_IN_COMMANDS)) {
					for (let i = exp.BUILT_IN_COMMANDS.length - 1; i >= 0; i--) {
						const cmd = exp.BUILT_IN_COMMANDS[i]
						if (cmd?.id === 'groq-chat-command' || !cmd?.untranslatedName) {
							exp.BUILT_IN_COMMANDS.splice(i, 1)
						}
					}
				}
			}
		}
	} catch {}

	// Command indexer crash guard: prevent undefined.length crashes in Discord chat bar
	const unsubQueryModule = onModule(byProps('useCachedResults', 'getCachedResults'), (mod) => {
		const target = mod?.default ?? mod
		if (!target) return

		if (typeof target.useCachedResults === 'function') {
			unpatches.push(
				revenge.patcher.instead(target, 'useCachedResults', (args: any[], orig: any) => {
					try {
						return orig.apply(target, args)
					} catch (e) {
						return { commands: [], sections: [], loading: false }
					}
				})
			)
		}

		if (typeof target.getCachedResults === 'function') {
			unpatches.push(
				revenge.patcher.instead(target, 'getCachedResults', (args: any[], orig: any) => {
					try {
						return orig.apply(target, args)
					} catch (e) {
						return { commands: [], sections: [], loading: false }
					}
				})
			)
		}
	})
	unpatches.push(unsubQueryModule)

	const handlePrompt = async (
		prompt: string,
		channelId?: string,
		modelOverride?: string,
		systemOverride?: string,
	) => {
		const targetChannelId = channelId || getSelectedChannelId()
		if (!targetChannelId) return

		const cached = storage.cache ?? {}
		const apiKey = cached.apiKey || ''
		const model = modelOverride || cached.defaultModel || DEFAULT_MODEL
		const systemPrompt = systemOverride || cached.systemPrompt

		if (!apiKey) {
			sendLocalBotMessage(
				targetChannelId,
				'⚠️ **Groq API Key missing!**\nPlease open **Discord Settings > Groq AI Chat** to paste your Groq API key.\nGet a key for free at https://console.groq.com/keys.',
			)
			return
		}

		sendLocalBotMessage(targetChannelId, `🤖 *Asking Groq (${model})...*`)

		const res = await queryGroq({
			apiKey,
			prompt,
			model,
			systemPrompt,
			temperature: cached.temperature,
			maxTokens: cached.maxTokens,
		})

		if (res.error) {
			sendLocalBotMessage(targetChannelId, res.error)
			return
		}

		const isEphemeral = cached.ephemeralOnly !== false
		if (isEphemeral) {
			sendLocalBotMessage(
				targetChannelId,
				`**Prompt:** ${prompt}\n\n**Groq (${model}):**\n${res.text}`,
			)
		} else {
			sendChannelMessage(targetChannelId, res.text)
		}
	}

	// Message interception for `/chat <prompt>`, `.chat <prompt>`, and custom prefix
	const unsubMessageActions = onModule(byProps('sendMessage', 'editMessage'), (mod) => {
		const target = mod?.default ?? mod
		if (!target || typeof target.sendMessage !== 'function') return

		const unpatch = revenge.patcher.instead(
			target,
			'sendMessage',
			(args: any[], orig: any) => {
				try {
					const cached = storage.cache ?? {}
					const isPrefixEnabled = cached.enablePrefix !== false
					const customPrefix = (cached.prefixString?.trim() || DEFAULT_PREFIX).toLowerCase()

					const [channelId, message] = args
					const content: string = message?.content || ''
					const trimmed = content.trim()
					const lower = trimmed.toLowerCase()

					// Check for `/chat <prompt>`, `.chat <prompt>`, or configured custom prefix
					let promptText: string | null = null

					if (lower.startsWith('/chat ') || lower === '/chat') {
						promptText = trimmed.slice(5).trim()
					} else if (isPrefixEnabled && lower.startsWith(customPrefix)) {
						promptText = trimmed.slice(customPrefix.length).trim()
					} else if (isPrefixEnabled && (lower.startsWith('.chat ') || lower === '.chat')) {
						promptText = trimmed.slice(5).trim()
					}

					if (promptText !== null) {
						if (!promptText) {
							sendLocalBotMessage(
								channelId,
								'ℹ️ **Groq AI Chat Usage:**\nType `/chat <your question>` or `.chat <your question>` to ask Groq AI!',
							)
						} else {
							void handlePrompt(promptText, channelId)
						}
						return Promise.resolve()
					}
				} catch (e) {
					console.error('[Groq AI] Error in sendMessage interceptor:', e)
				}

				return orig.apply(target, args)
			},
		)
		unpatches.push(unpatch)
	})
	unpatches.push(unsubMessageActions)

	return () => {
		for (const u of unpatches) {
			try {
				u()
			} catch {}
		}
	}
}
