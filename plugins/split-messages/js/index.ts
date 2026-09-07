import { intoChunks } from './lib/split'
import Settings from './ui/Settings'
import { DEFAULT_STORAGE, type SplitMessagesStorage } from './lib/types'

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms))
}

const SAFE_MAX_LENGTH = 100000

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

		const getRealLimit = () => {
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

		// 1. Raise constants (stops Discord composer from blocking long text / showing popup)
		try {
			const constantsMatches = lookupModule(filters.withProps('MAX_MESSAGE_LENGTH'))
			for (const consts of constantsMatches || []) {
				if (consts && typeof consts === 'object' && typeof consts.MAX_MESSAGE_LENGTH === 'number') {
					const origMax = consts.MAX_MESSAGE_LENGTH
					const origPremium = consts.MAX_MESSAGE_LENGTH_PREMIUM

					consts.MAX_MESSAGE_LENGTH = SAFE_MAX_LENGTH
					consts.MAX_MESSAGE_LENGTH_PREMIUM = SAFE_MAX_LENGTH

					cleanups.push(() => {
						try {
							consts.MAX_MESSAGE_LENGTH = origMax
							consts.MAX_MESSAGE_LENGTH_PREMIUM = origPremium
						} catch {}
					})
				}
			}
		} catch (e) {
			api.logger.error(`[SplitMessages] Failed to override length constants: ${e}`)
		}

		// 2. Patch getMaxMessageLength function
		const patchMaxLength = (mod: any) => {
			if (!mod || typeof mod !== 'object') return

			if (typeof mod.getMaxMessageLength === 'function') {
				try {
					const unpatch = revenge.patcher.instead(
						mod,
						'getMaxMessageLength',
						() => SAFE_MAX_LENGTH,
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
			api.logger.error(`[SplitMessages] Error searching for maxLength module: ${e}`)
		}

		// 3. Patch MessageActions (sendMessage via `before` hook)
		const patchMessageActions = (mod: any) => {
			if (!mod || typeof mod !== 'object') return
			const target = mod.default ?? mod

			if (typeof target.sendMessage === 'function') {
				try {
					const unpatchSend = revenge.patcher.before(
						target,
						'sendMessage',
						(args: any[]) => {
							try {
								const channelId = args[0]
								const message = args[1]
								const options = args[3]
								const content: string = message?.content ?? ''
								const limit = getRealLimit()
								const hasAttachments = !!options?.attachmentsToUpload?.length

								if (content.length <= limit && !hasAttachments) return

								const splitOnWords = !!api.jsonStorage.cache?.splitOnWords
								const maxChunks = api.jsonStorage.cache?.maxChunks || 100

								const chunks = content ? intoChunks(content, limit, splitOnWords) : []
								if (!chunks || chunks.length === 0) return

								if (chunks.length > maxChunks) {
									args[1].content = ''
									try {
										const { Alert } = revenge.react.ReactNative
										Alert.alert('Message Too Long', `The message exceeds the maximum chunk limit (${maxChunks} chunks).`)
									} catch {}
									return
								}

								if (hasAttachments) {
									args[1].content = ''
									void (async () => {
										for (const chunk of chunks) {
											await sleep(delayFor(channelId))
											await target._sendMessage?.(
												channelId,
												{
													invalidEmojis: message.invalidEmojis,
													validNonShortcutEmojis: message.validNonShortcutEmojis,
													tts: false,
													content: chunk,
												},
												{},
											)
										}
									})()
									return
								}

								// Mutate first chunk into args[1].content so native sendMessage handles chunk 0 seamlessly!
								args[1].content = chunks.shift()

								// Send remaining chunks sequentially
								if (chunks.length > 0) {
									void (async () => {
										for (const chunk of chunks) {
											await sleep(delayFor(channelId))
											await target._sendMessage?.(
												channelId,
												{
													invalidEmojis: message.invalidEmojis,
													validNonShortcutEmojis: message.validNonShortcutEmojis,
													tts: false,
													content: chunk,
												},
												{},
											)
										}
									})()
								}
							} catch (err) {
								console.error('[SplitMessages] Error in sendMessage before hook:', err)
							}
						},
					)
					cleanups.push(unpatchSend)
				} catch (e) {
					api.logger.error(`[SplitMessages] Failed to patch sendMessage: ${e}`)
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
			api.logger.error(`[SplitMessages] Error searching for MessageActions: ${e}`)
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
