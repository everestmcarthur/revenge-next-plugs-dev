import { definePlugin } from '@revenge-mod/plugins/definePlugin'
import { setupHooks } from './hooks'
import { registerBuiltinCommands } from './builtins'
import {
	registerCommand,
	unregisterCommand,
	commands,
	syncIndexStore,
} from './registry'

const clientUtilsApi = {
	registerCommand,
	unregisterCommand,
	commands,
	syncIndexStore,
	version: '1.0.23',
}

export default definePlugin({
	manifest: {
		id: 'dev.everestmcarthur.client-utils',
		name: 'Client Utils',
		description: 'Custom client-side slash command engine and utilities.',
		version: '1.0.23',
		author: 'Rosie & Everest',
		icon: 'ic_message_edit',
	} as any,

	onStart({ cleanup, logger }) {
		logger.info('[ClientUtils] Initializing modular slash command engine...')

		setupHooks({ cleanup, logger })
		registerBuiltinCommands()

		const everest = (globalThis as any).revenge?.everest
		if (everest?.registerPlugin) {
			try {
				everest.registerPlugin({
					id: 'dev.everestmcarthur.client-utils',
					name: 'Client Utils',
					icon: 'HammerIcon',
					author: 'Rosie & Everest',
					description: 'Custom client-side slash command engine and built-in Discord utilities.',
					version: { nums: [1, 0, 0], label: null },
				})
			} catch {}
		}

		;(globalThis as any).__c_utils = clientUtilsApi
		if (typeof (revenge?.plugins as any) !== 'undefined') {
			;(revenge.plugins as any).clientUtils = clientUtilsApi
		}

		cleanup(() => {
			delete (globalThis as any).__c_utils
			if ((revenge?.plugins as any)?.clientUtils) {
				delete (revenge.plugins as any).clientUtils
			}
			logger.info('[ClientUtils] Stopped cleanly.')
		})
	},
})
