import { setupStoreHooks } from './storeHooks'
import { setupCacheHooks } from './cacheHooks'
import { setupExecHooks } from './execHooks'

export function setupHooks({
	cleanup,
	logger,
}: {
	cleanup: (fn: () => void) => void
	logger: any
}) {
	setupStoreHooks({ cleanup, logger })
	setupCacheHooks({ cleanup, logger })
	setupExecHooks({ cleanup, logger })
}
export { setupHooks as default }
