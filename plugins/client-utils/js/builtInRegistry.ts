import { findByImportedPath, waitForImportedPath } from '../../shared/finders'
import {
	parseOptionValues,
	getSelectedChannelIdSafe,
	getCurrentUserSafe,
} from './stores'
import { sendReply } from './reply'

const BUILT_INS_PATH =
	'modules/application_commands/ApplicationCommandBuiltIns.tsx'

let builtInRegistryArray: any[] | null = null
const registeredCommandsMap = new Map<string, any>()

function syncBuiltIns() {
	if (!builtInRegistryArray || !Array.isArray(builtInRegistryArray)) return

	for (const [name, registered] of registeredCommandsMap) {
		const id = `cu-${name}`
		const entry = {
			id,
			applicationId: '-1',
			type: 1, // CHAT_INPUT
			inputType: 1, // BUILT_IN_TEXT (Required for mobile autocomplete)
			name,
			displayName: registered.displayName || name,
			untranslatedName: name,
			description: registered.description || '',
			displayDescription: registered.displayDescription || registered.description || '',
			untranslatedDescription: registered.description || '',
			options: (registered.options || []).map((opt: any) => ({
				type: opt.type,
				name: opt.name,
				displayName: opt.displayName || opt.name,
				description: opt.description || '',
				displayDescription: opt.displayDescription || opt.description || '',
				required: !!opt.required,
				choices: opt.choices,
			})),
			execute: (args: any, ctx: any) => {
				const channelId =
					ctx?.channel?.id || ctx?.channelId || getSelectedChannelIdSafe()
				const currentUser = getCurrentUserSafe()
				const pluginName = registered._pluginMeta?.name || 'Client Utils'

				const parsedArgs = parseOptionValues(args)
				const callCtx = {
					channelId,
					guildId: ctx?.guild?.id || ctx?.guild_id || null,
					currentUser,
					reply: (options: any) =>
						sendReply(channelId, options, pluginName, name, registered._pluginMeta),
				}

				return Promise.resolve(registered.execute(parsedArgs, callCtx)).catch(
					(err: any) => {
						sendReply(
							channelId,
							{
								content: `❌ Command Error: ${err?.message || err}`,
								ephemeral: true,
							},
							pluginName,
							name,
							registered._pluginMeta,
						)
					},
				)
			},
		}

		const existing = builtInRegistryArray.findIndex(
			(c: any) => c?.id === id || c?.name === name,
		)
		if (existing !== -1) builtInRegistryArray.splice(existing, 1)
		builtInRegistryArray.push(entry)
	}
}

export function registerBuiltInCommand(registered: any) {
	registeredCommandsMap.set(registered.name, registered)
	syncBuiltIns()
}

export function unregisterBuiltInCommand(name: string) {
	registeredCommandsMap.delete(name)
	if (builtInRegistryArray && Array.isArray(builtInRegistryArray)) {
		const id = `cu-${name}`
		const idx = builtInRegistryArray.findIndex(
			(c: any) => c?.id === id || c?.name === name,
		)
		if (idx !== -1) builtInRegistryArray.splice(idx, 1)
	}
}

export function setupBuiltInCommandsRegistry(cleanup: (fn: () => void) => void) {
	const direct = findByImportedPath(BUILT_INS_PATH)
	if (direct?.BUILT_IN_COMMANDS && Array.isArray(direct.BUILT_IN_COMMANDS)) {
		builtInRegistryArray = direct.BUILT_IN_COMMANDS
		syncBuiltIns()
	}

	const unsub = waitForImportedPath(BUILT_INS_PATH, (exports: any) => {
		const b = exports?.BUILT_IN_COMMANDS || exports?.default?.BUILT_IN_COMMANDS
		if (b && Array.isArray(b)) {
			builtInRegistryArray = b
			syncBuiltIns()
		}
	})
	if (unsub) cleanup(unsub)

	// Fallback lookup via withProps
	try {
		const { lookupModule, waitForModules, filters } = revenge.modules.finders
		const filter = filters.withProps('BUILT_IN_COMMANDS')
		const res = lookupModule(filter)
		const found = res?.[0]?.BUILT_IN_COMMANDS
		if (found && Array.isArray(found)) {
			builtInRegistryArray = found
			syncBuiltIns()
		}

		const unsubProps = waitForModules(filter, (mod: any) => {
			const b = mod?.BUILT_IN_COMMANDS || mod?.default?.BUILT_IN_COMMANDS
			if (b && Array.isArray(b)) {
				builtInRegistryArray = b
				syncBuiltIns()
			}
		})
		if (typeof unsubProps === 'function') cleanup(unsubProps)
	} catch {}

	cleanup(() => {
		if (builtInRegistryArray && Array.isArray(builtInRegistryArray)) {
			for (const name of registeredCommandsMap.keys()) {
				const id = `cu-${name}`
				const idx = builtInRegistryArray.findIndex(
					(c: any) => c?.id === id || c?.name === name,
				)
				if (idx !== -1) builtInRegistryArray.splice(idx, 1)
			}
		}
		registeredCommandsMap.clear()
		builtInRegistryArray = null
	})
}
