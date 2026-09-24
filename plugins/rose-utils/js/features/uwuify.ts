import { getModule, getFilters, getClientUtils } from '../shared'
import type { RoseUtilsSettings } from '../types'

const FACES = ['(・`ω´・)', ';;w;;', 'OwO', 'UwU', '>w<', '^w^', '(｡♥‿♥｡)']

export function uwuifyText(text: string): string {
	if (!text) return text
	let res = text
		.replace(/(?:r|l)/g, 'w')
		.replace(/(?:R|L)/g, 'W')
		.replace(/n([aeiou])/g, 'ny$1')
		.replace(/N([aeiou])/g, 'Ny$1')
		.replace(/N([AEIOU])/g, 'NY$1')
		.replace(/ove/g, 'uv')
		.replace(/!+/g, ' ')

	const words = res.split(' ')
	for (let i = 0; i < words.length; i++) {
		if (Math.random() < 0.2 && words[i].length > 2 && /^[a-zA-Z]/.test(words[i])) {
			const first = words[i].charAt(0)
			words[i] = `${first}-${words[i]}`
		}
		if (Math.random() < 0.15) {
			words[i] = `${words[i]} ${FACES[Math.floor(Math.random() * FACES.length)]}`
		}
	}
	return words.join(' ')
}

export function initUwUify(settings: RoseUtilsSettings): () => void {
	if (!settings.uwuify) return () => {}

	const cleanups: (() => void)[] = []
	const clientUtils = getClientUtils()

	if (clientUtils?.registerCommand) {
		clientUtils.registerCommand(
			{
				name: 'uwuify',
				displayName: 'uwuify',
				description: 'UwUify text and send it',
				options: [
					{
						type: 3,
						name: 'text',
						displayName: 'text',
						description: 'The message to UwUify',
						required: true,
					},
					{
						type: 3,
						name: 'ephemeral',
						displayName: 'ephemeral',
						description: 'Show response only to you (optional)',
						required: false,
						choices: [
							{ name: 'True', displayName: 'True', value: 'true' },
						],
					},
				],
				execute: async (args: any, ctx: any) => {
					const input = args.text || args.content || args.message || ''
					if (!input) {
						ctx.reply({
							ephemeral: true,
							content: 'Please enter text to uwuify.',
						})
						return
					}
					const converted = uwuifyText(input)
					const isEphemeral = args.ephemeral === 'true' || args.ephemeral === true || args.ephemeral === 'True'
					ctx.reply({
						ephemeral: isEphemeral,
						content: converted,
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
			clientUtils.unregisterCommand('uwuify')
		})
	}

	if (settings.uwuifyConvertOutgoing) {
		const raw = (globalThis as any).__r?.(7696)
		const MessageActions = raw?.default || raw || getModule(getFilters().withProps('sendMessage', 'editMessage'))
		if (MessageActions) {
			if (typeof MessageActions.sendMessage === 'function') {
				const unpatch = revenge.patcher.before(MessageActions, 'sendMessage', (args: any) => {
					if (args[1] && typeof args[1].content === 'string' && !args[1]._uwuified) {
						args[1].content = uwuifyText(args[1].content)
						args[1]._uwuified = true
					}
					return args
				})
				cleanups.push(unpatch)
			}
			if (typeof MessageActions._sendMessage === 'function') {
				const unpatch = revenge.patcher.before(MessageActions, '_sendMessage', (args: any) => {
					if (args[1] && typeof args[1].content === 'string' && !args[1]._uwuified) {
						args[1].content = uwuifyText(args[1].content)
						args[1]._uwuified = true
					}
					return args
				})
				cleanups.push(unpatch)
			}
		}
	}

	return () => {
		for (const fn of cleanups) fn()
	}
}
