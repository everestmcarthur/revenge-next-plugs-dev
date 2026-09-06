import type { JsonStorage } from '@revenge-mod/json-storage'
import type { YouBarPlusStorage } from '../lib/types'

export default function patchCompactYou(
	storage: JsonStorage<YouBarPlusStorage>,
): () => void {
	const cleanups: Array<() => void> = []

	// 1. Hide Custom Status Row
	const patchStatusRow = (mod: any) => {
		const target = mod?.default ?? mod
		if (!target) return

		try {
			const unpatch = revenge.patcher.instead(
				target,
				typeof target === 'function' ? undefined : ('type' as any),
				(args: any[], Original: any) => {
					if (storage.cache?.hideStatus) {
						return null
					}
					return Original ? Original(...args) : target(...args)
				},
			)
			cleanups.push(unpatch)
		} catch (e) {
			console.error('[YouBar+] Failed to patch status row:', e)
		}
	}

	// 2. Compact Avatar & Header in YouScreenUserProfileContent
	const patchProfileContent = (mod: any) => {
		const target = mod?.default ?? mod
		if (!target) return

		try {
			const unpatch = revenge.patcher.after(
				target,
				typeof target === 'function' ? undefined : ('type' as any),
				(args: any[], res: any) => {
					if (!res) return res
					const current = storage.cache
					if (
						!current?.compactAvatar &&
						!current?.hideStatus &&
						!current?.compactHeader
					) {
						return res
					}

					try {
						const React = revenge.react.React

						if (res.props) {
							const originalStyle = res.props.style || {}
							const compactedStyle = [
								originalStyle,
								current.compactHeader && {
									paddingTop: 0,
									paddingBottom: 4,
								},
							]

							const modifyChildren = (child: any): any => {
								if (!child) return child
								if (Array.isArray(child))
									return child.map(modifyChildren)
								if (
									typeof child !== 'object' ||
									!child.props
								)
									return child

								const p = child.props
								if (
									p.avatar ||
									p.user?.avatar ||
									(typeof p.style === 'object' &&
										p.style?.width >= 64 &&
										p.style?.height >= 64)
								) {
									if (current.compactAvatar) {
										return React.cloneElement(child, {
											style: [
												p.style,
												{
													transform: [
														{ scale: 0.75 },
													],
													marginVertical: -8,
												},
											],
										})
									}
								}

								if (p.children) {
									return React.cloneElement(child, {
										children: modifyChildren(p.children),
									})
								}

								return child
							}

							return React.cloneElement(res, {
								style: compactedStyle,
								children: modifyChildren(res.props.children),
							})
						}
					} catch (e) {
						console.error(
							'[YouBar+] Compact profile transform error:',
							e,
						)
					}

					return res
				},
			)
			cleanups.push(unpatch)
		} catch (e) {
			console.error(
				'[YouBar+] Failed to patch YouScreenUserProfileContent:',
				e,
			)
		}
	}

	// Apply patches using finders and direct Metro module IDs
	const statusNames = ['CustomStatusEntryRow', 'GravityCustomStatusEntryRow']
	const profileNames = ['YouScreenUserProfileContent']

	for (const name of statusNames) {
		try {
			const filter = revenge.modules.finders.filters.createFilterGenerator(
				([n]: [string], _id: any, exports: any) =>
					exports?.name === n ||
					exports?.displayName === n ||
					exports?.default?.name === n ||
					exports?.default?.displayName === n,
				([n]: [string]) => `typeName(${n})`,
				revenge.modules.finders.filters.FilterScopes.All,
			)(name)

			const matches = revenge.modules.finders.lookupModule(filter)
			for (const m of matches || []) patchStatusRow(m)

			const unsub = revenge.modules.finders.getModules(
				filter,
				(m) => patchStatusRow(m),
				{ returnNamespace: true },
			)
			cleanups.push(() => unsub?.())
		} catch {}
	}

	for (const name of profileNames) {
		try {
			const filter = revenge.modules.finders.filters.createFilterGenerator(
				([n]: [string], _id: any, exports: any) =>
					exports?.name === n ||
					exports?.displayName === n ||
					exports?.default?.name === n ||
					exports?.default?.displayName === n,
				([n]: [string]) => `typeName(${n})`,
				revenge.modules.finders.filters.FilterScopes.All,
			)(name)

			const matches = revenge.modules.finders.lookupModule(filter)
			for (const m of matches || []) patchProfileContent(m)

			const unsub = revenge.modules.finders.getModules(
				filter,
				(m) => patchProfileContent(m),
				{ returnNamespace: true },
			)
			cleanups.push(() => unsub?.())
		} catch {}
	}

	// Direct Metro ID fallbacks for instant attachment
	if (typeof (globalThis as any).__r === 'function') {
		const req = (globalThis as any).__r
		try {
			const s1 = req(16063)
			if (s1) patchStatusRow(s1)
			const s2 = req(16064)
			if (s2) patchStatusRow(s2)
			const p1 = req(16347)
			if (p1) patchProfileContent(p1)
		} catch {}
	}

	return () => {
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}
	}
}
