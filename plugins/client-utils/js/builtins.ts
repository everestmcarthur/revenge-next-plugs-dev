import { registerUserCommands } from './commands/user'
import { registerGuildCommands } from './commands/guild'
import { registerUpdaterCommands } from './commands/updater'

export function registerBuiltinCommands() {
	registerUserCommands()
	registerGuildCommands()
	registerUpdaterCommands()
}
