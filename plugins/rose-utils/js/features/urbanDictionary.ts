import { getClientUtils } from '../shared'
import type { RoseUtilsSettings } from '../types'

export function initUrbanDictionary(settings: RoseUtilsSettings): () => void {
	if (!settings.urbanDictionary) return () => {}

	const clientUtils = getClientUtils()
	if (!clientUtils?.registerCommand) return () => {}

	clientUtils.registerCommand(
		{
			name: 'urban',
			displayName: 'urban',
			description: 'Look up a slang term on Urban Dictionary',
			options: [
				{
					type: 3,
					name: 'term',
					displayName: 'term',
					description: 'The word or phrase to look up',
					required: true,
				},
				{
					type: 3,
					name: 'ephemeral',
					displayName: 'ephemeral',
					description: 'Show only to you (default: yes)',
					required: false,
					choices: [
						{ name: 'yes', displayName: 'Yes', value: 'yes' },
						{ name: 'no', displayName: 'No', value: 'no' },
					],
				},
			],
			execute: async (args: any, ctx: any) => {
				const term = (args.term || '').trim()
				const isEphemeral = args.ephemeral !== 'no'
				if (!term) {
					ctx.reply({
						ephemeral: true,
						content: '❌ Please provide a term to look up.',
					})
					return
				}

				try {
					const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`)
					if (!res.ok) throw new Error(`HTTP ${res.status}`)
					const data = await res.json()
					const item = data?.list?.[0]
					if (!item) {
						ctx.reply({
							ephemeral: isEphemeral,
							content: `❌ No definition found on Urban Dictionary for **${term}**.`,
						})
						return
					}

					const clean = (s: string) => (s || '').replace(/\[|\]/g, '').slice(0, 1024)
					const definition = clean(item.definition)
					const example = clean(item.example)

					const fields = [
						{ name: 'Definition', value: definition || 'None', inline: false },
					]
					if (example) {
						fields.push({ name: 'Example', value: `*${example}*`, inline: false })
					}

					ctx.reply({
						ephemeral: isEphemeral,
						content: '',
						embed: {
							type: 'rich',
							title: `Urban Dictionary: ${item.word}`,
							url: item.permalink || `https://www.urbandictionary.com/define.php?term=${encodeURIComponent(term)}`,
							color: 0x1b2936,
							fields,
							footer: {
								text: `👍 ${item.thumbs_up ?? 0}  |  👎 ${item.thumbs_down ?? 0}`,
							},
						},
					})
				} catch (e: any) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: `❌ Error querying Urban Dictionary: ${e?.message || e}`,
					})
				}
			},
		},
		{
			id: 'dev.everestmcarthur.rose-utils',
			name: 'Rose Utils',
			description: 'Rose Utils commands',
		}
	)

	return () => {
		clientUtils.unregisterCommand('urban')
	}
}
