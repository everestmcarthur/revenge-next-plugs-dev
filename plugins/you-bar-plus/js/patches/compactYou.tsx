import type { JsonStorage } from '@revenge-mod/json-storage'
import {
	DEFAULT_STORAGE,
	saveCachedModuleId,
	type YouBarPlusStorage,
} from '../lib/types'

const STATUS_NAMES = ['CustomStatusEntryRow', 'GravityCustomStatusEntryRow']
const PROFILE_NAMES = ['YouScreenUserProfileContent']

const CANDIDATE_STATUS_IDS = [16544, 16545]
const CANDIDATE_PROFILE_IDS = [16840]

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
	const React = revenge.react.React

	const saveModuleId = (
		key: 'statusRowId' | 'profileContentId',
		id: number | undefined,
	) => {
		if (typeof id !== 'number') return
		saveCachedModuleId(storage, key, id)
	}

	const getCurrentStorage = (): YouBarPlusStorage => ({
		...DEFAULT_STORAGE,
		...(storage.cache ?? {}),
	})

	// 1. Hide Custom Status Row
	const patchStatusRow = (mod: any, id?: number) => {
		if (!mod) return
		const target = mod?.default ?? mod
		if (
			!target ||
			(typeof target !== 'function' && typeof target !== 'object')
		)
			return
		if (patchedStatusTargets.has(target)) return
		patchedStatusTargets.add(target)

		if (id !== undefined) saveModuleId('statusRowId', id)

		try {
			if (typeof revenge.react?.jsxRuntime?.insteadJSX === 'function') {
				const unpatchJSX = revenge.react.jsxRuntime.insteadJSX(
					target,
					(args: any[], origJSX: any) => {
						const OrigComp = args[0]
						const WrappedStatus = (props: any) => {
							const [, forceUpdate] = React.useReducer(
								(x: number) => x + 1,
								0,
							)
							React.useEffect(() => {
								const unsub = storage.subscribe(() =>
									forceUpdate(),
								)
								return () => unsub?.()
							}, [])

							const current = getCurrentStorage()
							if (current.hideStatus) {
								return null
							}
							return React.createElement(OrigComp, props)
						}
						return origJSX(WrappedStatus, args[1], args[2])
					},
				)
				cleanups.push(unpatchJSX)
			}
		} catch {}

		try {
			if (mod && mod.default === target) {
				const unpatch = revenge.patcher.instead(
					mod,
					'default',
					(args: any[], Original: any) => {
						const current = getCurrentStorage()
						if (current.hideStatus) {
							return null
						}
						return Original
							? Original(...args)
							: target(...args)
					},
				)
				cleanups.push(unpatch)
			} else if (
				typeof target === 'object' &&
				typeof target.type === 'function'
			) {
				const unpatch = revenge.patcher.instead(
					target,
					'type',
					(args: any[], Original: any) => {
						const current = getCurrentStorage()
						if (current.hideStatus) {
							return null
						}
						return Original
							? Original(...args)
							: target.type(...args)
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
		const current = getCurrentStorage()
		if (
			!current.compactAvatar &&
			!current.hideStatus &&
			!current.compactHeader
		) {
			return res
		}

		try {
			const RN = revenge.react.ReactNative

			if (res.props) {
				const originalStyle = res.props.style || {}
				const compactedStyle = [
					originalStyle,
					current.compactHeader && {
						paddingTop: 0,
						paddingBottom: 4,
						marginTop: -4,
					},
				]

				const modifyChildren = (child: any): any => {
					if (!child) return child
					if (Array.isArray(child)) {
						return child.map(modifyChildren).filter(Boolean)
					}
					if (typeof child !== 'object' || !child.props) {
						return child
					}

					// Hide custom status if rendered inside profile content
					if (current.hideStatus) {
						const typeName =
							child.type?.name ||
							child.type?.displayName ||
							child.type?.type?.name
						if (
							typeName &&
							(STATUS_NAMES.includes(typeName) ||
								typeName.toLowerCase().includes('customstatus'))
						) {
							return null
						}
					}

					const p = child.props
					const flatStyle =
						RN?.StyleSheet?.flatten(p.style) ||
						(typeof p.style === 'object' ? p.style : {})

					const isAvatar =
						Boolean(
							p.avatar ||
								p.user?.avatar ||
								p.user?.avatarURL ||
								p.avatarUrl,
						) ||
						(flatStyle &&
							typeof flatStyle.width === 'number' &&
							flatStyle.width >= 50 &&
							flatStyle.width <= 140 &&
							Math.abs(
								flatStyle.width -
									(flatStyle.height || flatStyle.width),
							) < 10) ||
						(typeof child.type?.name === 'string' &&
							child.type.name
								.toLowerCase()
								.includes('avatar'))

					if (isAvatar && current.compactAvatar) {
						return React.cloneElement(child, {
							style: [
								p.style,
								{
									transform: [{ scale: 0.75 }],
									marginVertical: -8,
								},
							],
						})
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
		if (
			!target ||
			(typeof target !== 'function' && typeof target !== 'object')
		)
			return
		if (patchedProfileTargets.has(target)) return
		patchedProfileTargets.add(target)

		if (id !== undefined) saveModuleId('profileContentId', id)

		try {
			if (typeof revenge.react?.jsxRuntime?.insteadJSX === 'function') {
				const unpatchJSX = revenge.react.jsxRuntime.insteadJSX(
					target,
					(args: any[], origJSX: any) => {
						const OrigComp = args[0]
						const WrappedProfile = (props: any) => {
							const [, forceUpdate] = React.useReducer(
								(x: number) => x + 1,
								0,
							)
							React.useEffect(() => {
								const unsub = storage.subscribe(() =>
									forceUpdate(),
								)
								return () => unsub?.()
							}, [])

							const res = OrigComp(props)
							return transformProfileContent(res)
						}
						return origJSX(WrappedProfile, args[1], args[2])
					},
				)
				cleanups.push(unpatchJSX)
			}
		} catch {}

		try {
			if (mod && mod.default === target) {
				const unpatch = revenge.patcher.after(
					mod,
					'default',
					(_args: any[], res: any) =>
						transformProfileContent(res),
				)
				cleanups.push(unpatch)
			} else if (
				typeof target === 'object' &&
				typeof target.type === 'function'
			) {
				const unpatch = revenge.patcher.after(
					target,
					'type',
					(_args: any[], res: any) =>
						transformProfileContent(res),
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

	// 3. Fast attachment via verified candidate & cached Metro IDs
	const checkFastCache = (cache?: YouBarPlusStorage['moduleCache']) => {
		if (typeof (globalThis as any).__r !== 'function') return
		const req = (globalThis as any).__r
		const c = cache ?? storage.cache?.moduleCache

		const statusIds = new Set<number>([
			...(typeof c?.statusRowId === 'number' ? [c.statusRowId] : []),
			...CANDIDATE_STATUS_IDS,
		])

		const profileIds = new Set<number>([
			...(typeof c?.profileContentId === 'number'
				? [c.profileContentId]
				: []),
			...CANDIDATE_PROFILE_IDS,
		])

		for (const id of statusIds) {
			try {
				const mod = req(id)
				if (isStatusRow(mod)) {
					patchStatusRow(mod, id)
				}
			} catch {}
		}

		for (const id of profileIds) {
			try {
				const mod = req(id)
				if (isProfileContent(mod)) {
					patchProfileContent(mod, id)
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
