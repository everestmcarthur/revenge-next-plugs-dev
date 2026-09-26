import { unsubAuthStore } from '../stores/AuthorizationStore'
import { unsubCacheStore } from '../stores/CacheStore'

export default function patcher(): () => void {
	const patches: (() => void)[] = []
	patches.push(unsubAuthStore)
	patches.push(unsubCacheStore)

	return () => {
		for (const x of patches) {
			try {
				x()
			} catch {}
		}
	}
}
