import { getReactNative, getModule } from '../shared'
import type { RoseUtilsSettings } from '../types'

export function initCustomUserTags(settings: RoseUtilsSettings): () => void {
	if (!settings.customUserTags) return () => {}

	const cleanups: (() => void)[] = []
	const RN = getReactNative()
	const processColor = RN?.processColor ?? ((c: any) => c)
	const tagList = settings.customUserTagsList || {}

	const patchTarget = (mod: any) => {
		if (!mod || typeof mod.default !== 'function') return
		const unpatch = revenge.patcher.instead(mod, 'default', (args: any, orig: any) => {
			const ret = orig(...args)
			try {
				const arg0 = args?.[0]
				const authorId = arg0?.message?.author?.id || arg0?.author?.id || arg0?.userId
				if (authorId && tagList[authorId]) {
					const custom = tagList[authorId]
					return {
						...ret,
						tagText: custom.tag || ret?.tagText,
						tagTextColor: custom.color ? processColor(custom.color) : ret?.tagTextColor,
						tagBackgroundColor: custom.color ? processColor(custom.color) : ret?.tagBackgroundColor,
						tagVerified: custom.badge !== undefined ? custom.badge : ret?.tagVerified,
					}
				}
			} catch {}
			return ret
		})
		cleanups.push(unpatch)
	}

	try {
		const unsub = revenge.modules.finders.getModules(
			revenge.modules.finders.filters.withName('getTagProperties'),
			(mod: any) => {
				patchTarget(mod)
			},
			{ returnNamespace: true }
		)
		cleanups.push(unsub)
	} catch {}

	try {
		const existing = getModule(revenge.modules.finders.filters.withName('getTagProperties'))
		if (existing) {
			patchTarget(existing)
		}
	} catch {}

	return () => {
		for (const fn of cleanups) fn()
	}
}
