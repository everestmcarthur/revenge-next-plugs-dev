import { initAuthStore } from '../stores/AuthorizationStore'
import { initCacheStore } from '../stores/CacheStore'

export default function patcher(): () => void {
	const patches: (() => void)[] = []
	patches.push(initAuthStore())
	patches.push(initCacheStore())

	return () => {
		for (const x of patches) {
			try {
				x()
			} catch {}
		}
	}
}

