export * from './types'
export * from '../builders'

import type { ClientCommand } from './types'

/**
 * Registers a client-side slash command with Client Utils.
 * Returns an unregister cleanup function.
 */
export function registerCommand(command: ClientCommand, pluginMeta?: any): () => void {
	const utils = (globalThis as any).__c_utils || (revenge?.plugins as any)?.clientUtils
	if (!utils) {
		console.warn(`[ClientUtils] Client Utils plugin is not active. Command registration skipped: /${command.name}`)
		return () => {}
	}
	utils.registerCommand(command, pluginMeta)
	return () => utils.unregisterCommand(command.name)
}

/**
 * Checks whether the Client Utils plugin runtime is loaded and ready.
 */
export function isClientUtilsReady(): boolean {
	return !!((globalThis as any).__c_utils || (revenge?.plugins as any)?.clientUtils)
}
