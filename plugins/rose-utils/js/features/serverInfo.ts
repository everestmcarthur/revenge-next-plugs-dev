import { getModule, getModuleExport, getFilters, getLazyActionSheet, getReact, getReactNative } from '../shared'
import type { RoseUtilsSettings } from '../types'

export function initServerInfo(settings: RoseUtilsSettings): () => void {
	if (!settings.serverInfo) return () => {}

	const React = getReact()
	const RN = getReactNative()
	if (!React) return () => {}

	const LazyActionSheet = getLazyActionSheet()
	const GuildStore = getModule(getFilters().withProps('getGuild'))
	const GuildMemberCountStore = getModule(getFilters().withProps('getMemberCount'))

	const modExp = getModuleExport(getFilters().withName('getGuildsBarGuildMenuItems'))
	const targetObj = modExp.exports
	if (!targetObj || typeof targetObj.default !== 'function') return () => {}

	const ServerInfoSheet = ({ guildId }: { guildId: string }) => {
		const guild = GuildStore?.getGuild?.(guildId)
		const memberCount = GuildMemberCountStore?.getMemberCount?.(guildId) || 'Unknown'
		const createdDate = guildId ? new Date(Number(BigInt(guildId) >> 22n) + 1420070400000).toLocaleDateString() : 'Unknown'

		const ViewComp = RN?.View || 'View'
		const TextComp = RN?.Text || 'Text'

		return React.createElement(
			ViewComp,
			{
				style: {
					padding: 20,
					backgroundColor: '#2f3136',
					borderRadius: 16,
					margin: 16,
				},
			},
			React.createElement(
				TextComp,
				{
					style: {
						color: '#ffffff',
						fontSize: 18,
						fontWeight: 'bold',
						marginBottom: 12,
					},
				},
				guild?.name || 'Server Information'
			),
			React.createElement(
				TextComp,
				{ style: { color: '#b9bbbe', fontSize: 14, marginBottom: 6 } },
				`Server ID: ${guildId}`
			),
			React.createElement(
				TextComp,
				{ style: { color: '#b9bbbe', fontSize: 14, marginBottom: 6 } },
				`Members: ${memberCount}`
			),
			React.createElement(
				TextComp,
				{ style: { color: '#b9bbbe', fontSize: 14, marginBottom: 6 } },
				`Owner: <@${guild?.ownerId || 'Unknown'}>`
			),
			React.createElement(
				TextComp,
				{ style: { color: '#b9bbbe', fontSize: 14, marginBottom: 6 } },
				`Created: ${createdDate}`
			)
		)
	}

	const unpatch = revenge.patcher.after(targetObj, 'default', (ret: any) => {
		try {
			if (!Array.isArray(ret)) return ret
			const guildId = ret[0]?.guildId || ret[0]?.props?.guildId
			const serverInfoItem = {
				label: 'Server Info',
				action: () => {
					if (LazyActionSheet?.openLazy) {
						LazyActionSheet.openLazy(
							Promise.resolve({ default: () => React.createElement(ServerInfoSheet, { guildId: String(guildId || '') }) }),
							`server-info-sheet-${guildId}`,
							{ guildId: String(guildId || '') }
						)
					}
				},
			}
			return [...ret, serverInfoItem]
		} catch {
			return ret
		}
	})

	return () => {
		unpatch()
	}
}
