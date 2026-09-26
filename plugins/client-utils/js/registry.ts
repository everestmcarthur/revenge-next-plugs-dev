import {
	getIndexStore,
	getCurrentUserSafe,
	getInitialsAvatar,
} from './stores'
import {
	registerBuiltInCommand,
	unregisterBuiltInCommand,
} from './builtInRegistry'

export const commands = new Map<string, any>()

export const getSectionId = (pluginId: string, index: number) => {
	if (!pluginId || pluginId === 'dev.everestmcarthur.client-utils' || pluginId === 'client-utils') {
		return '999000000000000001'
	}
	let hash = 0n
	for (let i = 0; i < pluginId.length; i++) {
		hash = (hash * 31n + BigInt(pluginId.charCodeAt(i))) & 0x7fffffffffffffffn
	}
	const numStr = (hash % 8999999999999n + 1000000000000n).toString()
	return `999${numStr}${String(index % 10).padStart(2, '0')}`
}

export const buildAllSections = () => {
	const currentUser = getCurrentUserSafe()
	const pluginGroups = new Map<string, { meta: any; cmds: any[] }>()

	Array.from(commands.values()).forEach((cmd) => {
		const meta = cmd._pluginMeta || {
			id: 'dev.everestmcarthur.client-utils',
			name: 'Client Utils',
			description: 'Custom client-side slash command utilities',
		}
		const groupKey = meta.id || meta.name || 'dev.everestmcarthur.client-utils'
		if (!pluginGroups.has(groupKey)) {
			pluginGroups.set(groupKey, { meta, cmds: [] })
		}
		pluginGroups.get(groupKey)!.cmds.push(cmd)
	})

	const allSections: any[] = []
	const allCommands: any[] = []

	let sectionIndex = 1
	for (const [groupId, group] of pluginGroups.entries()) {
		const isClientUtils = groupId === 'dev.everestmcarthur.client-utils' || groupId === 'client-utils'
		const sectionId = isClientUtils
			? '999000000000000001'
			: getSectionId(groupId, sectionIndex)
		sectionIndex++

		const sectionName = group.meta.name || groupId
		const sectionIcon =
			group.meta.icon ||
			group.meta.avatar ||
			group.meta.picture ||
			group.meta.image ||
			getInitialsAvatar(sectionName)
		const sectionDesc = group.meta.description || 'Custom client-side slash commands'

		const sectionDescriptor = {
			type: 1,
			id: sectionId,
			name: sectionName,
			icon: sectionIcon,
			application: {
				id: sectionId,
				name: sectionName,
				description: sectionDesc,
				icon: sectionIcon,
				bot: {
					id: sectionId,
					username: sectionName,
					avatar: sectionIcon,
					bot: true,
				},
				flags: 0,
			},
			isUserApp: true,
			botId: sectionId,
		}

		const sectionCommandsMap: Record<string, any> = {}
		const sectionBuiltCommands = group.cmds.map((cmd, idx) => {
			const cmdId = isClientUtils
				? `9990000000000000${String(idx + 1).padStart(2, '0')}`
				: `${sectionId.slice(0, 16)}${String(idx + 1).padStart(2, '0')}`

			const discordOptions = (cmd.options || []).map((opt: any) => ({
				type: opt.type,
				name: opt.name,
				displayName: opt.displayName || opt.name,
				description: opt.description,
				displayDescription: opt.displayDescription || opt.description,
				required: !!opt.required,
				choices: opt.choices
					? opt.choices.map((c: any) => ({
							name: c.name,
							displayName: c.displayName || c.name,
							value: c.value,
						}))
					: undefined,
			}))

			const builtCmd = {
				id: cmdId,
				version: '1',
				applicationId: sectionId,
				name: cmd.name,
				untranslatedName: cmd.name,
				displayName: cmd.name,
				serverLocalizedName: cmd.name,
				type: 1,
				inputType: 3,
				description: cmd.description,
				untranslatedDescription: cmd.description,
				displayDescription: cmd.description,
				options: discordOptions,
				section: sectionDescriptor,
				dmPermission: true,
				contexts: [0, 1, 2],
				integration_types: [0, 1],
				handler: 1,
				rootCommand: {
					id: cmdId,
					type: 1,
					application_id: sectionId,
					version: '1',
					name: cmd.name,
					description: cmd.description,
					options: discordOptions,
					dm_permission: true,
					contexts: [0, 1, 2],
					integration_types: [0, 1],
					handler: 1,
					name_localized: cmd.name,
					description_localized: cmd.description,
				},
				_cmdRef: cmd,
			}

			sectionCommandsMap[cmdId] = builtCmd
			return builtCmd
		})

		allCommands.push(...sectionBuiltCommands)
		allSections.push({
			id: sectionId,
			name: sectionName,
			descriptor: sectionDescriptor,
			commands: sectionBuiltCommands,
			commandsMap: sectionCommandsMap,
		})
	}

	return { allSections, allCommands }
}

export const syncIndexStore = (logger?: any) => {
	try {
		const IndexStore = getIndexStore()
		if (!IndexStore?.indices) return
		const { allSections, allCommands } = buildAllSections()
		const currentSecIds = new Set(allSections.map((s: any) => s.id))
		const currentCmdIds = new Set(allCommands.map((c: any) => c.id))

		const targetKeys = [
			...Object.getOwnPropertySymbols(IndexStore.indices),
			...Object.keys(IndexStore.indices),
		]

		targetKeys.forEach((key) => {
			const entry = IndexStore.indices[key]
			if (entry?.result) {
				if (!entry.result.commands) entry.result.commands = {}
				if (!entry.result.sections) entry.result.sections = {}

				for (const sId of Object.keys(entry.result.sections)) {
					if (sId.startsWith('999') && !currentSecIds.has(sId)) {
						delete entry.result.sections[sId]
					}
				}
				for (const cId of Object.keys(entry.result.commands)) {
					if (cId.startsWith('999') && !currentCmdIds.has(cId)) {
						delete entry.result.commands[cId]
					}
				}

				allSections.forEach((sec: any) => {
					entry.result.sections[sec.id] = {
						descriptor: sec.descriptor,
						commands: sec.commandsMap,
					}
					sec.commands.forEach((c: any) => {
						entry.result.commands[c.id] = c
					})
				})
			}
		})

		const currentUserSym = targetKeys.find((k) => typeof k === 'symbol') || Symbol.for('currentUser')
		if (!IndexStore.indices[currentUserSym]) {
			const initialSections: Record<string, any> = {}
			const initialCommands: Record<string, any> = {}
			allSections.forEach((sec: any) => {
				initialSections[sec.id] = {
					descriptor: sec.descriptor,
					commands: sec.commandsMap,
				}
				sec.commands.forEach((c: any) => {
					initialCommands[c.id] = c
				})
			})
			IndexStore.indices[currentUserSym] = {
				result: {
					commands: initialCommands,
					sections: initialSections,
				},
			}
		} else if (IndexStore.indices[currentUserSym]?.result) {
			const curResult = IndexStore.indices[currentUserSym].result
			if (!curResult.commands) curResult.commands = {}
			if (!curResult.sections) curResult.sections = {}

			for (const sId of Object.keys(curResult.sections)) {
				if (sId.startsWith('999') && !currentSecIds.has(sId)) {
					delete curResult.sections[sId]
				}
			}
			for (const cId of Object.keys(curResult.commands)) {
				if (cId.startsWith('999') && !currentCmdIds.has(cId)) {
					delete curResult.commands[cId]
				}
			}

			allSections.forEach((sec: any) => {
				curResult.sections[sec.id] = {
					descriptor: sec.descriptor,
					commands: sec.commandsMap,
				}
				sec.commands.forEach((c: any) => {
					curResult.commands[c.id] = c
				})
			})
		}
	} catch (e) {
		logger?.error?.(`[ClientUtils] syncIndexStore error: ${e}`)
	}
}

export const registerCommand = (cmd: any, pluginMeta?: any) => {
	const meta = pluginMeta || cmd.plugin || cmd.category || cmd.section || cmd.application || {
		id: 'dev.everestmcarthur.client-utils',
		name: 'Client Utils',
		description: 'Custom client-side slash command utilities',
	}
	const rawIcon =
		meta.icon ||
		meta.avatar ||
		meta.picture ||
		meta.image ||
		cmd.icon ||
		cmd.avatar ||
		cmd.picture ||
		cmd.image
	const parsedMeta =
		typeof meta === 'string'
			? { id: meta, name: meta, icon: rawIcon }
			: {
					id: meta.id || meta.name || 'dev.everestmcarthur.client-utils',
					name: meta.name || meta.id || 'Client Utils',
					description: meta.description || 'Custom client-side slash commands',
					icon: rawIcon,
				}
	cmd._pluginMeta = parsedMeta
	commands.set(cmd.name, cmd)
	registerBuiltInCommand(cmd)
	syncIndexStore()
}

export const unregisterCommand = (name: string) => {
	commands.delete(name)
	unregisterBuiltInCommand(name)
	syncIndexStore()
}
