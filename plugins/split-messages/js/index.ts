import { intoChunks } from './lib/split'
import Settings from './ui/Settings'
import { DEFAULT_STORAGE, type SplitMessagesStorage } from './lib/types'

const MAX_CHUNKS = 20

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms))
}

export default plugin<{ jsonStorage: SplitMessagesStorage }>({
	jsonStorage: {
		load: true,
		default: DEFAULT_STORAGE,
	},

	start(api) {
		if (api.plugin.startedLate) {
			try {
				api.plugin.requireReload()
			} catch {}
		}

		const everest = (globalThis as any).__everest
		everest?.setActivePlugin?.(api.plugin.manifest.id)
		everest?.registerPlugin?.({
			id: api.plugin.manifest.id,
			name: api.plugin.manifest.name,
			icon: api.plugin.manifest.icon,
			author: api.plugin.manifest.author,
			description: api.plugin.manifest.description,
			version: api.plugin.manifest.version,
			getStatus: () => api.plugin.status,
			getErrors: () => api.plugin.errors,
		})

		const cleanups: Array<() => void> = []
		const { filters, lookupModule, getModules } = revenge.modules.finders

		const getUserStore = () => (revenge.discord.flux.Stores as any)?.UserStore
		const getChannelStore = () => (revenge.discord.flux.Stores as any)?.ChannelStore

		const maxLength = () => {
			try {
				return getUserStore()?.getCurrentUser?.()?.premiumType === 2 ? 4000 : 2000
			} catch {
				return 2000
			}
		}

		const delayFor = (channelId: string) => {
			try {
				const channel = getChannelStore()?.getChannel?.(channelId)
				return Math.max((channel?.rateLimitPerUser ?? 0) * 1000, 1000)
			} catch {
				return 1000
			}
		}

		// 1. Patch getMaxMessageLength
		const patchMaxLength = (mod: any) => {
			const target = mod?.default ?? mod
			if (typeof target?.getMaxMessageLength === 'function') {
				try {
					const unpatch = revenge.patcher.instead(
						target,
						'getMaxMessageLength',
						() => 2 ** 30,
					)
					cleanups.push(unpatch)
				} catch (e) {
					api.logger.error(`[SplitMessages] Failed to patch getMaxMessageLength: ${e}`)
				}
			}
		}

		try {
			const maxLengthFilter = filters.withProps('getMaxMessageLength')
			const matches = lookupModule(maxLengthFilter)
			for (const m of matches || []) patchMaxLength(m)
			const unsub = getModules(maxLengthFilter, (m) => patchMaxLength(m), { returnNamespace: true })
			cleanups.push(() => unsub?.())
		} catch (e) {
			api.logger.error(`[SplitMessages] Error finding maxLength module: ${e}`)
		}

		// 2. Patch MessageActions (sendMessage & editMessage)
		const sendChunks = async (channelId: string, chunks: string[], template: any, messageActions: any) => {
			for (const chunk of chunks) {
				await sleep(delayFor(channelId))
				await messageActions._sendMessage?.(
					channelId,
					{
						invalidEmojis: template?.invalidEmojis,
						validNonShortcutEmojis: template?.validNonShortcutEmojis,
						tts: false,
						content: chunk,
					},
					{},
				)
			}
		}

		const withArg = (args: any[], index: number, value: any) => {
			const clone = args.slice()
			clone[index] = value
			return clone
		}

		const patchMessageActions = (mod: any) => {
			const target = mod?.default ?? mod
			if (!target) return

			if (typeof target.sendMessage === 'function') {
				try {
					const unpatchSend = revenge.patcher.instead(
						target,
						'sendMessage',
						(args: any[], orig: any) => {
							const [channelId, message, , options] = args
							const content: string = message?.content ?? ''
							const limit = maxLength()
							const hasAttachments = !!options?.attachmentsToUpload?.length

							if (content.length <= limit && !hasAttachments) {
								return orig.apply(target, args)
							}

							const splitOnWords = !!api.jsonStorage.cache?.splitOnWords
							const maxChunks = api.jsonStorage.cache?.maxChunks || MAX_CHUNKS

							const chunks = content ? intoChunks(content, limit, splitOnWords) : []
							if (!chunks || chunks.length === 0 || chunks.length > maxChunks) {
								try {
									const { Alert } = revenge.react.ReactNative
									Alert.alert('Message Too Long', `Message exceeds chunk limit (${maxChunks} chunks).`)
								} catch {}
								return
							}

							return (async () => {
								if (hasAttachments) {
									await sendChunks(channelId, chunks, message, target)
									if (chunks.length) await sleep(delayFor(channelId))
									await orig.apply(target, withArg(args, 1, { ...message, content: '' }))
									return
								}

								const first = { ...message, content: chunks.shift() }
								await orig.apply(target, withArg(args, 1, first))
								await sendChunks(channelId, chunks, message, target)
							})()
						},
					)
					cleanups.push(unpatchSend)
				} catch (e) {
					api.logger.error(`[SplitMessages] Failed to patch sendMessage: ${e}`)
				}
			}

			if (typeof target.editMessage === 'function') {
				try {
					const unpatchEdit = revenge.patcher.instead(
						target,
						'editMessage',
						(args: any[], orig: any) => {
							const [channelId, , message] = args
							const content: string = message?.content ?? ''
							const limit = maxLength()

							if (content.length <= limit) {
								return orig.apply(target, args)
							}

							const splitOnWords = !!api.jsonStorage.cache?.splitOnWords
							const maxChunks = api.jsonStorage.cache?.maxChunks || MAX_CHUNKS

							const chunks = intoChunks(content, limit, splitOnWords)
							if (!chunks || chunks.length === 0 || chunks.length > maxChunks) {
								try {
									const { Alert } = revenge.react.ReactNative
									Alert.alert('Message Too Long', `Message exceeds chunk limit (${maxChunks} chunks).`)
								} catch {}
								return
							}

							return (async () => {
								const result = await orig.apply(target, withArg(args, 2, { ...message, content: chunks.shift() }))
								await sendChunks(channelId, chunks, message, target)
								return result
							})()
						},
					)
					cleanups.push(unpatchEdit)
				} catch (e) {
					api.logger.error(`[SplitMessages] Failed to patch editMessage: ${e}`)
				}
			}
		}

		try {
			const msgActionsFilter = filters.withProps('sendMessage', 'editMessage')
			const actionMatches = lookupModule(msgActionsFilter)
			for (const m of actionMatches || []) patchMessageActions(m)
			const unsubActions = getModules(msgActionsFilter, (m) => patchMessageActions(m), { returnNamespace: true })
			cleanups.push(() => unsubActions?.())
		} catch (e) {
			api.logger.error(`[SplitMessages] Error finding MessageActions: ${e}`)
		}

		api.cleanup(() => {
			for (const fn of cleanups) {
				try {
					fn()
				} catch {}
			}
		})
	},

	SettingsComponent: Settings,
})
