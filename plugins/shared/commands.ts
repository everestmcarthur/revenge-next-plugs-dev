import { findByImportedPath, waitForImportedPath } from './finders'

export enum ApplicationCommandType {
	CHAT_INPUT = 1,
	USER = 2,
	MESSAGE = 3,
}

export enum ApplicationCommandOptionType {
	SUB_COMMAND = 1,
	SUB_COMMAND_GROUP = 2,
	STRING = 3,
	INTEGER = 4,
	BOOLEAN = 5,
	USER = 6,
	CHANNEL = 7,
	ROLE = 8,
	MENTIONABLE = 9,
	NUMBER = 10,
	ATTACHMENT = 11,
}

export enum ApplicationCommandInputType {
	BUILT_IN = 0,
	BUILT_IN_TEXT = 1,
	BUILT_IN_INTEGRATION = 2,
	BOT = 3,
	PLACEHOLDER = 4,
}

export interface SlashCommandOption {
	name: string
	description: string
	type: ApplicationCommandOptionType | number
	required?: boolean
	choices?: Array<{ name: string; value: string | number }>
}

export interface SlashCommandArgument {
	name: string
	value: any
}

export interface SlashCommandContext {
	channel?: { id: string; name?: string; guild_id?: string }
	guild?: { id: string }
}

export interface SlashCommandDefinition {
	name: string
	description: string
	options?: SlashCommandOption[]
	execute(
		args: SlashCommandArgument[],
		context: SlashCommandContext,
	): void | Promise<void>
}

const BUILT_INS_PATH =
	'modules/application_commands/ApplicationCommandBuiltIns.tsx'
const BUILT_IN_APPLICATION_ID = '-1'

let commandRegistry: any[] | null = null
const pendingCommands = new Map<string, any>()
let isWatching = false
const cleanups: Array<() => void> = []

function adoptRegistry(candidate: any): boolean {
	const array = Array.isArray(candidate?.BUILT_IN_COMMANDS)
		? candidate.BUILT_IN_COMMANDS
		: Array.isArray(candidate?.default?.BUILT_IN_COMMANDS)
		? candidate.default.BUILT_IN_COMMANDS
		: Array.isArray(candidate)
		? candidate
		: null

	if (!array || commandRegistry) return false

	commandRegistry = array

	for (const [id, entry] of pendingCommands) {
		const existingIdx = commandRegistry.findIndex(cmd => cmd?.id === id)
		if (existingIdx !== -1) commandRegistry.splice(existingIdx, 1)
		commandRegistry.push(entry)
	}
	pendingCommands.clear()
	return true
}

function ensureCommandWatcher() {
	if (isWatching) return
	isWatching = true

	// Check if already loaded by imported path
	const existing = findByImportedPath(BUILT_INS_PATH)
	if (existing && adoptRegistry(existing)) return

	// Route 1: wait for imported path
	const unsubPath = waitForImportedPath(BUILT_INS_PATH, (mod) => {
		adoptRegistry(mod)
	})
	if (typeof unsubPath === 'function') cleanups.push(unsubPath)

	// Route 2: wait for module with withProps('BUILT_IN_COMMANDS') as fallback
	try {
		const { lookupModules, waitForModules } = revenge.modules.finders
		const { withProps } = revenge.modules.finders.filters
		const filter = withProps('BUILT_IN_COMMANDS')

		for (const [exports] of lookupModules(filter)) {
			if (adoptRegistry(exports)) return
		}

		let unsubProps: (() => void) | undefined
		unsubProps = waitForModules(filter, (exports: any) => {
			if (adoptRegistry(exports)) unsubProps?.()
		})
		if (typeof unsubProps === 'function') cleanups.push(unsubProps)
	} catch {}
}

function buildCommandEntry(def: SlashCommandDefinition, id: string) {
	return {
		id,
		applicationId: BUILT_IN_APPLICATION_ID,
		type: ApplicationCommandType.CHAT_INPUT,
		inputType: ApplicationCommandInputType.BUILT_IN,
		name: def.name,
		displayName: def.name,
		untranslatedName: def.name,
		description: def.description,
		displayDescription: def.description,
		untranslatedDescription: def.description,
		options: (def.options ?? []).map(opt => ({
			...opt,
			displayName: opt.name,
			displayDescription: opt.description,
			required: opt.required ?? false,
		})),
		execute: def.execute,
	}
}

/**
 * Registers a native slash command into Discord's built-in command registry.
 * Does not depend on hardcoded module IDs and safely waits if the registry isn't loaded yet.
 * Returns an unregister function.
 */
export function registerSlashCommand(def: SlashCommandDefinition): () => void {
	ensureCommandWatcher()

	const id = `cutils-${def.name}`
	const entry = buildCommandEntry(def, id)

	if (commandRegistry) {
		const existingIdx = commandRegistry.findIndex(cmd => cmd?.id === id)
		if (existingIdx !== -1) commandRegistry.splice(existingIdx, 1)
		commandRegistry.push(entry)
	} else {
		pendingCommands.set(id, entry)
	}

	return () => {
		pendingCommands.delete(id)
		if (commandRegistry) {
			const idx = commandRegistry.findIndex(cmd => cmd?.id === id)
			if (idx !== -1) commandRegistry.splice(idx, 1)
		}
	}
}
