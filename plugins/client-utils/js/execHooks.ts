import { findByImportedPath } from '../../shared/finders'
import {
	getFinders,
	getMod,
	getCurrentUserSafe,
	getSelectedChannelIdSafe,
	getChannelStore,
	parseOptionValues,
} from './stores'
import { commands } from './registry'
import { sendReply } from './reply'

export function setupExecHooks({
	cleanup,
	logger,
}: {
	cleanup: (fn: () => void) => void
	logger: any
}) {
	const filters = getFinders()?.filters

	try {
		const importedExec = findByImportedPath('modules/chat_input/native/accessories/ChatInputSendUtils.tsx')
		const ExecMod =
			importedExec?.default ||
			importedExec ||
			getMod(filters?.withProps('chatInputSendApplicationCommand'))

		if (ExecMod) {
			const origSend = ExecMod.chatInputSendApplicationCommand
			ExecMod.chatInputSendApplicationCommand = function (data: any) {
				try {
					const cmdName =
						data?.applicationCommand?.command?.name ||
						data?.applicationCommand?.name ||
						data?.command?.name ||
						data?.name
					const registered = commands.get(cmdName)

					if (registered) {
						const channelId =
							data?.params?.channel?.id ||
							data?.params?.channelId ||
							data?.channel?.id ||
							data?.channelId ||
							getSelectedChannelIdSafe()
						const chStore = getChannelStore()
						const channel = chStore?.getChannel?.(channelId) || data?.params?.channel || data?.channel
						const guildId = channel?.guild_id || channel?.getGuildId?.() || null
						const currentUser = getCurrentUserSafe()

						const parsedArgs: Record<string, any> = {
							...parseOptionValues(data?.applicationCommand?.options),
							...parseOptionValues(data?.command?.options),
							...parseOptionValues(data?.options),
							...parseOptionValues(data?.params?.options),
							...parseOptionValues(data?.applicationCommand?.optionValues),
							...parseOptionValues(data?.command?.optionValues),
							...parseOptionValues(data?.optionValues),
							...parseOptionValues(data?.params?.optionValues),
						}

						setTimeout(() => {
							try {
								const ref = data?.params?.chatInputRef?.current
								if (ref) {
									ref.clearText?.()
									ref.setText?.('')
								}
							} catch {}
						}, 50)

						const pluginName = registered._pluginMeta?.name || 'Client Utils'
						const ctx = {
							channelId,
							guildId,
							currentUser,
							reply: (options: any) =>
								sendReply(channelId, options, pluginName, cmdName, registered._pluginMeta, logger),
						}

						Promise.resolve(registered.execute(parsedArgs, ctx)).catch((err: any) => {
							sendReply(
								channelId,
								{
									content: `❌ Command Error: ${err?.message || err}`,
									ephemeral: true,
								},
								pluginName,
								cmdName,
								registered._pluginMeta,
								logger,
							)
						})

						return Promise.resolve()
					}
				} catch (e) {
					logger.error(`[ClientUtils] Execution wrapper error: ${e}`)
				}
				return origSend.apply(this, arguments)
			}

			const origHandleSendText = ExecMod.chatInputHandleSendText
			ExecMod.chatInputHandleSendText = function (data: any) {
				try {
					const rawText = (typeof data === 'string' ? data : data?.text || data?.value || '').trim()
					if (rawText.startsWith('/')) {
						const parts = rawText.slice(1).trim().split(/\s+/)
						const cmdName = parts[0]?.toLowerCase()
						const registered = commands.get(cmdName)
						if (registered) {
							const channelId =
								data?.params?.channel?.id ||
								data?.params?.channelId ||
								data?.channel?.id ||
								data?.channelId ||
								getSelectedChannelIdSafe()
							const chStore = getChannelStore()
							const channel = chStore?.getChannel?.(channelId) || data?.params?.channel || data?.channel
							const guildId = channel?.guild_id || channel?.getGuildId?.() || null
							const currentUser = getCurrentUserSafe()

							try {
								const ref = data?.params?.chatInputRef?.current
								if (ref) {
									ref.clearText?.()
									ref.setText?.('')
								}
							} catch {}

							const parsedArgs: Record<string, any> = {}
							const remaining = rawText.slice(1).trim().slice(cmdName.length).trim()
							if (remaining) {
								const opts = registered.options || []
								if (opts.length > 0) {
									parsedArgs[opts[0].name] = remaining
								}
							}

							const pluginName = registered._pluginMeta?.name || 'Client Utils'
							const ctx = {
								channelId,
								guildId,
								currentUser,
								reply: (options: any) =>
									sendReply(channelId, options, pluginName, cmdName, registered._pluginMeta, logger),
							}

							Promise.resolve(registered.execute(parsedArgs, ctx)).catch((err: any) => {
								sendReply(
									channelId,
									{
										content: `❌ Command Error: ${err?.message || err}`,
										ephemeral: true,
									},
									pluginName,
									cmdName,
									registered._pluginMeta,
									logger,
								)
							})

							return Promise.resolve()
						}
					}
				} catch (e) {
					logger.error(`[ClientUtils] handleSendText wrapper error: ${e}`)
				}
				return origHandleSendText.apply(this, arguments)
			}

			cleanup(() => {
				if (ExecMod) {
					if (origSend) ExecMod.chatInputSendApplicationCommand = origSend
					if (origHandleSendText) ExecMod.chatInputHandleSendText = origHandleSendText
				}
			})
		}
	} catch (err) {
		logger.error(`[ClientUtils] Failed to hook ExecMod: ${err}`)
	}

	try {
		const importedLegacy = findByImportedPath('modules/messages/LegacyCommands.tsx')
		const LegacyMod =
			importedLegacy?.default ||
			importedLegacy ||
			getMod(filters?.withProps('handleLegacyCommands'))

		if (LegacyMod?.handleLegacyCommands) {
			const origHandleLegacy = LegacyMod.handleLegacyCommands
			LegacyMod.handleLegacyCommands = function (text: string, context: any) {
				try {
					const trimmed = (text || '').trim()
					if (trimmed.startsWith('/')) {
						const parts = trimmed.slice(1).trim().split(/\s+/)
						const cmdName = parts[0]?.toLowerCase()
						const registered = commands.get(cmdName)
						if (registered) {
							const channelId =
								context?.channel?.id ||
								context?.channelId ||
								getSelectedChannelIdSafe()
							const chStore = getChannelStore()
							const channel = chStore?.getChannel?.(channelId) || context?.channel
							const guildId = channel?.guild_id || channel?.getGuildId?.() || null
							const currentUser = getCurrentUserSafe()

							const parsedArgs: Record<string, any> = {}
							const remaining = trimmed.slice(1).trim().slice(cmdName.length).trim()
							if (remaining) {
								const opts = registered.options || []
								if (opts.length > 0) {
									parsedArgs[opts[0].name] = remaining
								}
							}

							const pluginName = registered._pluginMeta?.name || 'Client Utils'
							const ctx = {
								channelId,
								guildId,
								currentUser,
								reply: (options: any) =>
									sendReply(channelId, options, pluginName, cmdName, registered._pluginMeta, logger),
							}

							Promise.resolve(registered.execute(parsedArgs, ctx)).catch((err: any) => {
								sendReply(
									channelId,
									{
										content: `❌ Command Error: ${err?.message || err}`,
										ephemeral: true,
									},
									pluginName,
									cmdName,
									registered._pluginMeta,
									logger,
								)
							})

							return { content: '' }
						}
					}
				} catch (e) {
					logger.error(`[ClientUtils] handleLegacyCommands hook error: ${e}`)
				}
				return origHandleLegacy.apply(this, arguments)
			}

			cleanup(() => {
				if (LegacyMod && origHandleLegacy) {
					LegacyMod.handleLegacyCommands = origHandleLegacy
				}
			})
		}
	} catch (err) {
		logger.error(`[ClientUtils] Failed to hook LegacyMod: ${err}`)
	}
}
export { setupExecHooks as default }
