import { registerCommand } from '../registry'
import { ephemeralOption } from './options'
import { isEphemeralArg } from '../stores'

export function registerUpdaterCommands() {
	registerCommand({
		name: 'updatechecker',
		description: 'Check for plugin updates on device and download available updates',
		options: [ephemeralOption],
		execute: async (args: any, ctx: any) => {
			const isEphemeral = isEphemeralArg(args.ephemeral)
			try {
				const repos = (globalThis as any).revenge?.hidden?.plugins?.repositories
				if (!repos?.refreshAllRepos || !repos?.listAllUpdates) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: '❌ Plugin repository manager is not available.',
					})
					return
				}

				await repos.refreshAllRepos()
				const updatesResult = await repos.listAllUpdates()
				const updates = Array.isArray(updatesResult)
					? updatesResult
					: updatesResult?.updates || []

				if (updates.length === 0) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: '',
						embed: {
							type: 'rich',
							title: 'Plugin Updates',
							description: '✅ All plugins are up to date!',
							color: 0x57f287,
						},
					})
					return
				}

				if (repos.updateAllPlugins) {
					await repos.updateAllPlugins()
				}

				const pList = (globalThis as any).revenge?.hidden?.plugins?.internal?.pList
				const updatedNames = updates
					.map((u: any) => {
						const id = u.id || u.manifest?.id || u.name
						const pluginObj = pList?.get ? pList.get(id) : null
						const name = pluginObj?.manifest?.name || u.name || id || 'Plugin'
						const avail = Array.isArray(u.available)
							? u.available.join('.')
							: u.available?.nums
								? u.available.nums.join('.')
								: u.available || u.version || 'Latest'
						return `• **${name}** (v${avail})`
					})
					.join('\n')

				ctx.reply({
					ephemeral: isEphemeral,
					content: '',
					embed: {
						type: 'rich',
						title: 'Plugin Updates Downloaded',
						description: `Downloaded updates for **${updates.length}** plugin(s):\n\n${updatedNames}\n\n*Reload Discord to apply the updates.*`,
						color: 0x5865f2,
					},
				})
			} catch (e: any) {
				ctx.reply({
					ephemeral: isEphemeral,
					content: `❌ Failed to check for updates: ${e?.message || e}`,
				})
			}
		},
	})
}
