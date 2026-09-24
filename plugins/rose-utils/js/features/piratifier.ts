import { getModule, getFilters, getClientUtils } from '../shared'
import type { RoseUtilsSettings } from '../types'

const DICTIONARY: Record<string, string> = {
	hello: 'ahoy',
	hi: 'ahoy',
	hey: 'avast',
	friend: 'matey',
	friends: 'shipmates',
	you: 'ye',
	your: 'yer',
	yours: 'yers',
	my: 'me',
	mine: 'me own',
	are: 'be',
	is: 'be',
	am: 'be',
	was: 'were',
	were: 'be',
	there: 'thar',
	where: 'whar',
	yes: 'aye',
	yeah: 'aye',
	yep: 'aye aye',
	no: 'nay',
	nope: 'nay',
	never: "ne'er",
	ever: "e'er",
	over: "o'er",
	of: "o'",
	and: "an'",
	with: "wi'",
	money: 'doubloons',
	gold: 'booty',
	treasure: 'booty',
	stop: 'avast',
	look: 'ahoy',
	see: 'spy',
	people: 'scallywags',
	guy: 'lad',
	girl: 'lass',
	boy: 'lad',
	woman: 'wench',
	food: 'grub',
	drink: 'grog',
	beer: 'rum',
	wine: 'grog',
	water: 'fresh water',
	ocean: 'seven seas',
	sea: 'deep blue',
	ship: 'vessel',
	boat: 'dinghy',
	car: 'carriage',
	house: 'cabin',
	home: 'port',
	bed: 'hammock',
	sleep: 'catch some zees',
	tired: 'weary',
	good: 'grand',
	great: 'mighty fine',
	bad: 'rotten',
	cool: 'swashbucklin\'',
	awesome: 'stunnin\'',
	crazy: 'mad as a cutlass',
	funny: 'comical',
	lol: 'har har',
	lmao: 'har har har',
	haha: 'har har',
	wow: 'shiver me timbers',
	thanks: 'ye have me gratitude',
	thank: 'tip me tricorne to',
	bye: 'fare thee well',
	goodbye: 'until next tide',
}

const EXCLAMATIONS = [
	'Ahoy!',
	'Arr!',
	'Arrrgh!',
	'Shiver me timbers!',
	'Blimey!',
	'Avast!',
	'Har har!',
	'By Blackbeard!',
]

const SUFFIXES = [
	', arr!',
	', matey!',
	', ye scallywag!',
	', mark me words!',
	', says I!',
	', har!',
]

export function piratifyText(text: string): string {
	if (!text || !text.trim()) return text
	const words = text.split(/\b/)
	for (let i = 0; i < words.length; i++) {
		const lower = words[i].toLowerCase()
		if (DICTIONARY[lower]) {
			const repl = DICTIONARY[lower]
			if (words[i][0] && words[i][0] === words[i][0].toUpperCase()) {
				words[i] = repl.charAt(0).toUpperCase() + repl.slice(1)
			} else {
				words[i] = repl
			}
		}
	}
	let result = words.join('')
	result = result.replace(/\b(\w+)ing\b/g, '$1in\'')

	if (Math.random() < 0.25) {
		const exc = EXCLAMATIONS[Math.floor(Math.random() * EXCLAMATIONS.length)]
		result = `${exc} ${result}`
	}
	if (Math.random() < 0.35) {
		const suf = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]
		result = result.replace(/[.!?]+$/, '') + suf
	}
	return result
}

export function initPiratifier(settings: RoseUtilsSettings): () => void {
	if (!settings.piratifier) return () => {}

	const cleanups: (() => void)[] = []
	const clientUtils = getClientUtils()

	if (clientUtils?.registerCommand) {
		clientUtils.registerCommand(
			{
				name: 'piratify',
				displayName: 'piratify',
				description: 'Translate text to pirate speech',
				options: [
					{
						type: 3,
						name: 'text',
						displayName: 'text',
						description: 'The message to piratify',
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
							content: 'Please enter text to piratify.',
						})
						return
					}
					const converted = piratifyText(input)
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
			clientUtils.unregisterCommand('piratify')
		})
	}

	if (settings.piratifyConvertOutgoing) {
		const raw = (globalThis as any).__r?.(7696)
		const MessageActions = raw?.default || raw || getModule(getFilters().withProps('sendMessage', 'editMessage'))
		if (MessageActions) {
			if (typeof MessageActions.sendMessage === 'function') {
				const unpatch = revenge.patcher.before(MessageActions, 'sendMessage', (args: any) => {
					if (args[1] && typeof args[1].content === 'string' && !args[1]._piratified) {
						args[1].content = piratifyText(args[1].content)
						args[1]._piratified = true
					}
					return args
				})
				cleanups.push(unpatch)
			}
			if (typeof MessageActions._sendMessage === 'function') {
				const unpatch = revenge.patcher.before(MessageActions, '_sendMessage', (args: any) => {
					if (args[1] && typeof args[1].content === 'string' && !args[1]._piratified) {
						args[1].content = piratifyText(args[1].content)
						args[1]._piratified = true
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
