import type { JsonStorage } from '@revenge-mod/json-storage'
import { saveCachedModuleId, type YouBarPlusStorage } from '../lib/types'

const STATUS_NAMES = ['CustomStatusEntryRow', 'GravityCustomStatusEntryRow']
const PROFILE_NAMES = ['YouScreenUserProfileContent']

function isStatusRow(exports: any): boolean {
	if (!exports) return false
	const t = exports?.default ?? exports
	const name =
		t?.name ||
		t?.displayName ||
		t?.type?.name ||
		t?.type?.displayName ||
		exports?.name ||
		exports?.displayName
	return STATUS_NAMES.includes(name)
}

function isProfileContent(exports: any): boolean {
	if (!exports) return false
	const t = exports?.default ?? exports
	const name =
		t?.name ||
		t?.displayName ||
		t?.type?.name ||
		t?.type?.displayName ||
		exports?.name ||
		exports?.displayName
	return PROFILE_NAMES.includes(name)
}

export default function patchCompactYou(
	storage: JsonStorage<YouBarPlusStorage>,
): () => void {
	const cleanups: Array<() => void> = []
	const patchedStatusTargets = new WeakSet<object>()
	const patchedProfileTargets = new WeakSet<object>()

	const saveModuleId = (key: 'statusRowId' | 'profileContentId', id: number | undefined) => {
		if (typeof id !== 'number') return
		saveCachedModuleId(storage, key, id)
	}

	// 1. Hide Custom Status Row
	const patchStatusRow = (mod: any, id?: number) => {
		if (!mod) return
		const target = mod?.default ?? mod
		if (!target || (typeof target !== 'function' && typeof target !== 'object')) return
		if (patchedStatusTargets.has(target)) return
		patchedStatusTargets.add(target)

		if (id !== undefined) saveModuleId('statusRowId', id)

		try {
			if (typeof revenge.react?.jsxRuntime?.insteadJSX === 'function') {
				const unpatch = revenge.react.jsxRuntime.insteadJSX(
					target,
					(args, jsx) => {
						if (storage.cache?.hideStatus) {
							return null
						}
						return jsx(...args)
					},
				)
				cleanups.push(unpatch)
				return
			}
		} catch {}

		try {
			if (mod && mod.default === target) {
				const unpatch = revenge.patcher.instead(
					mod,
					'default',
					(args: any[], Original: any) => {
						if (storage.cache?.hideStatus) {
							return null
						}
						return Original ? Original(...args) : target(...args)
					},
				)
				cleanups.push(unpatch)
			} else if (typeof target === 'object' && typeof target.type === 'function') {
				const unpatch = revenge.patcher.instead(
					target,
					'type',
					(args: any[], Original: any) => {
						if (storage.cache?.hideStatus) {
							return null
						}
						return Original ? Original(...args) : target.type(...args)
					},
				)
				cleanups.push(unpatch)
			}
		} catch (e) {
			console.error('[YouBar+] Failed to patch status row:', e)
		}
	}

	// 2. Compact Avatar & Header in YouScreenUserProfileContent
	const transformProfileContent = (res: any) => {
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
	}

	const patchProfileContent = (mod: any, id?: number) => {
		if (!mod) return
		const target = mod?.default ?? mod
		if (!target || (typeof target !== 'function' && typeof target !== 'object')) return
		if (patchedProfileTargets.has(target)) return
		patchedProfileTargets.add(target)

		if (id !== undefined) saveModuleId('profileContentId', id)

		try {
			if (typeof revenge.react?.jsxRuntime?.afterJSX === 'function') {
				const unpatch = revenge.react.jsxRuntime.afterJSX(
					target,
					(element: any) => transformProfileContent(element),
				)
				cleanups.push(unpatch)
				return
			}
		} catch {}

		try {
			if (mod && mod.default === target) {
				const unpatch = revenge.patcher.after(
					mod,
					'default',
					(_args: any[], res: any) => transformProfileContent(res),
				)
				cleanups.push(unpatch)
			} else if (typeof target === 'object' && typeof target.type === 'function') {
				const unpatch = revenge.patcher.after(
					target,
					'type',
					(_args: any[], res: any) => transformProfileContent(res),
				)
				cleanups.push(unpatch)
			}
		} catch (e) {
			console.error(
				'[YouBar+] Failed to patch YouScreenUserProfileContent:',
				e,
			)
		}
	}

	// 3. Fast attachment via verified cached Metro IDs
	const checkFastCache = (cache?: YouBarPlusStorage['moduleCache']) => {
		if (typeof (globalThis as any).__r !== 'function') return
		const req = (globalThis as any).__r
		const c = cache ?? storage.cache?.moduleCache

		if (typeof c?.statusRowId === 'number') {
			try {
				const mod = req(c.statusRowId)
				if (isStatusRow(mod)) {
					patchStatusRow(mod, c.statusRowId)
				}
			} catch {}
		}

		if (typeof c?.profileContentId === 'number') {
			try {
				const mod = req(c.profileContentId)
				if (isProfileContent(mod)) {
					patchProfileContent(mod, c.profileContentId)
				}
			} catch {}
		}
	}

	// Synchronous fast cache check
	checkFastCache()

	// Also check once storage resolves from disk
	storage
		.get()
		.then((data) => {
			checkFastCache(data?.moduleCache)
		})
		.catch(() => {})

	// 4. Dynamic discovery using finders with componentName filter
	for (const name of STATUS_NAMES) {
		try {
			const filter = revenge.modules.finders.filters.createFilterGenerator(
				([n]: [string], _id: any, exports: any) => {
					const def = exports?.default
					return (
						exports?.name === n ||
						exports?.displayName === n ||
						exports?.type?.name === n ||
						exports?.type?.displayName === n ||
						def?.name === n ||
						def?.displayName === n ||
						def?.type?.name === n ||
						def?.type?.displayName === n
					)
				},
				([n]: [string]) => `componentName(${n})`,
				revenge.modules.finders.filters.FilterScopes.All,
			)(name)

			const res = revenge.modules.finders.lookupModule(filter)
			if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
				patchStatusRow(res[0], res[1] as number | undefined)
			}

			const unsub = revenge.modules.finders.getModules(
				filter,
				(m, id) => patchStatusRow(m, id as number | undefined),
				{ cached: true, returnNamespace: true },
			)
			cleanups.push(() => unsub?.())
		} catch {}
	}

	for (const name of PROFILE_NAMES) {
		try {
			const filter = revenge.modules.finders.filters.createFilterGenerator(
				([n]: [string], _id: any, exports: any) => {
					const def = exports?.default
					return (
						exports?.name === n ||
						exports?.displayName === n ||
						exports?.type?.name === n ||
						exports?.type?.displayName === n ||
						def?.name === n ||
						def?.displayName === n ||
						def?.type?.name === n ||
						def?.type?.displayName === n
					)
				},
				([n]: [string]) => `componentName(${n})`,
				revenge.modules.finders.filters.FilterScopes.All,
			)(name)

			const res = revenge.modules.finders.lookupModule(filter)
			if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
				patchProfileContent(res[0], res[1] as number | undefined)
			}

			const unsub = revenge.modules.finders.getModules(
				filter,
				(m, id) => patchProfileContent(m, id as number | undefined),
				{ cached: true, returnNamespace: true },
			)
			cleanups.push(() => unsub?.())
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

