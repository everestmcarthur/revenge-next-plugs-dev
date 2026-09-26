import { setupStoreHooks } from './storeHooks'
import { setupCacheHooks } from './cacheHooks'
import { setupExecHooks } from './execHooks'
import { setupBuiltInCommandsRegistry } from './builtInRegistry'

export function setupHooks({
	cleanup,
	logger,
}: {
	cleanup: (fn: () => void) => void
	logger: any
}) {
	setupBuiltInCommandsRegistry(cleanup)
	setupStoreHooks({ cleanup, logger })
	setupCacheHooks({ cleanup, logger })
	setupExecHooks({ cleanup, logger })
}
export { setupHooks as default }
