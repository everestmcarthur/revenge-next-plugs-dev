import { getModule, getFilters, getClientUtils } from '../shared'
import type { RoseUtilsSettings } from '../types'

export function initGifRoulette(settings: RoseUtilsSettings): () => void {
	if (!settings.gifRoulette) return () => {}

	const clientUtils = getClientUtils()
	if (!clientUtils?.registerCommand) return () => {}

	const getRandomFavoriteGif = (): string | null => {
		try {
			const rawStore = (globalThis as any).__r?.(1220)
			const store = rawStore?.default || rawStore || getModule(getFilters().withProps('frecencyWithoutFetchingLatest'))
			const gifsObj = store?.frecencyWithoutFetchingLatest?.favoriteGifs?.gifs
			if (!gifsObj) return null
			const keys = Object.keys(gifsObj)
			if (keys.length === 0) return null
			return keys[Math.floor(Math.random() * keys.length)]
		} catch {
			return null
		}
	}

	clientUtils.registerCommand(
		{
			name: 'gifroulette',
			displayName: 'gifroulette',
			description: 'Sends a random GIF from your Discord favorites',
			options: [
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
				const isEphemeral = args.ephemeral === 'true' || args.ephemeral === true || args.ephemeral === 'True'
				const gif = getRandomFavoriteGif()
				if (!gif) {
					ctx.reply({
						ephemeral: true,
						content: 'You do not have any favorite GIFs saved in Discord.',
					})
					return
				}

				ctx.reply({
					ephemeral: isEphemeral,
					content: gif,
				})
			},
		},
		{
			id: 'dev.everestmcarthur.rose-utils',
			name: 'Rose Utils',
			description: 'Rose Utils commands',
		}
	)

	return () => {
		clientUtils.unregisterCommand('gifroulette')
	}
}
