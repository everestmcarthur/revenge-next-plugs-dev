export function getSelectedChannelId(): string | undefined {
	try {
		return (revenge.discord.flux.Stores as any)?.SelectedChannelStore?.getChannelId?.()
	} catch {
		return undefined
	}
}

export function sendLocalBotMessage(channelId: string, content: string) {
	if (!channelId) return

	try {
		const MessageActions = (revenge.discord.actions as any)?.MessageActionCreators
		if (typeof MessageActions?.sendBotMessage === 'function') {
			MessageActions.sendBotMessage(channelId, content)
			return
		}
	} catch {}

	try {
		const mod = revenge.modules.finders.lookupModule(
			revenge.modules.finders.filters.withProps('sendBotMessage'),
			{ first: true },
		)
		const target = mod?.default ?? mod
		if (typeof target?.sendBotMessage === 'function') {
			target.sendBotMessage(channelId, content)
			return
		}
	} catch {}

	try {
		const mod = revenge.modules.finders.lookupModule(
			revenge.modules.finders.filters.withProps('createBotMessage', 'receiveMessage'),
			{ first: true },
		)
		const target = mod?.default ?? mod
		if (typeof target?.createBotMessage === 'function' && typeof target?.receiveMessage === 'function') {
			const botMsg = target.createBotMessage({
				channelId,
				content,
				loggingName: 'Groq AI',
			})
			target.receiveMessage(channelId, botMsg)
			return
		}
	} catch {}

	sendChannelMessage(channelId, `[Groq AI (Private)]\n${content}`)
}

export function sendChannelMessage(channelId: string, content: string) {
	if (!channelId) return
	try {
		const mod = revenge.modules.finders.lookupModule(
			revenge.modules.finders.filters.withProps('sendMessage', 'editMessage'),
			{ first: true },
		)
		const target = mod?.default ?? mod
		if (typeof target?.sendMessage === 'function') {
			target.sendMessage(channelId, { content })
		}
	} catch (e) {
		console.error('[Groq AI] Failed to send channel message:', e)
	}
}
