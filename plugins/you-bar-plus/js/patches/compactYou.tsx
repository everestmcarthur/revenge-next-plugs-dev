import { discordModules } from '@shared'
import type { JsonStorage } from '@revenge-mod/json-storage'
import {
	DEFAULT_STORAGE,
	type YouBarPlusStorage,
} from '../lib/types'

export default function patchCompactYou(
	storage: JsonStorage<YouBarPlusStorage>,
): () => void {
	const cleanups: Array<() => void> = []
	const patchedTargets = new WeakSet<object>()
	const React = revenge.react.React
	const RN = revenge.react.ReactNative

	const getCurrentStorage = (): YouBarPlusStorage => ({
		...DEFAULT_STORAGE,
		...(storage.cache ?? {}),
	})

	const resolveModules = () => {
		if (typeof (globalThis as any).__r !== 'function') return null
		const req = (globalThis as any).__r

		const notifButtonId = discordModules['modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx']
		const candidates = [notifButtonId, 16488, 16464, 16476, 16427].filter(Boolean) as number[]
		let notifId: number | null = null

		for (const id of candidates) {
			try {
				const m = req(id)
				const comp = m?.YouBarNotificationsButton ?? m?.default ?? m
				const name = comp?.type?.name || comp?.name || m?.name
				if (name === 'YouBarNotificationsButton' || (comp as any)?.__isYouBarNotificationsButton || (comp as any)?.type?.__isYouBarNotificationsButton || (m as any)?.__isYouBarNotificationsButton) {
					notifId = id
					break
				}
			} catch {}
		}

		if (notifId === null) {
			const base = typeof notifButtonId === 'number' ? notifButtonId : 16464
			for (let id = base - 50; id <= base + 100; id++) {
				try {
					const m = req(id)
					const comp = m?.YouBarNotificationsButton ?? m?.default ?? m
					const name = comp?.type?.name || comp?.name || m?.name
					if (name === 'YouBarNotificationsButton' || (comp as any)?.__isYouBarNotificationsButton || (comp as any)?.type?.__isYouBarNotificationsButton || (m as any)?.__isYouBarNotificationsButton) {
						notifId = id
						break
					}
				} catch {}
			}
		}

		let constantsId: number | undefined
		try {
			const { filters, lookupModule } = revenge.modules.finders
			const cRes = lookupModule(filters.withProps('YOU_BAR_HEIGHT', 'YOU_BAR_PADDING'))
			if (cRes && cRes !== revenge.modules.finders.NotFoundResult && typeof cRes[1] === 'number') {
				constantsId = cRes[1]
			}
		} catch {}

		const baseNotif = discordModules['modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx'] || 16464
		const offset = notifId !== null ? notifId - baseNotif : 0

		return {
			avatarIds: [
				discordModules['modules/main_tabs_v2/native/you_bar/YouBarAvatarDefault.tsx'] + offset,
				discordModules['modules/main_tabs_v2/native/you_bar/YouBarAvatar.tsx'] + offset,
			],
			headerIds: [
				discordModules['modules/main_tabs_v2/native/you_bar/YouBarBackground.tsx'] + offset,
				discordModules['modules/main_tabs_v2/native/you_bar/YouBar.tsx'] + offset,
			],
			nameId: discordModules['modules/main_tabs_v2/native/you_bar/YouBarName.tsx'] + offset,
			statusId: discordModules['modules/main_tabs_v2/native/you_bar/YouBarActivityStatusExperiment.tsx'] + offset,
			constantsId: constantsId ?? (discordModules['modules/main_tabs_v2/native/you_bar/YouBarConstants.tsx'] + offset),
		}
	}

	const resolved = resolveModules()

	const syncConstants = () => {
		if (typeof (globalThis as any).__r !== 'function') return
		const req = (globalThis as any).__r
		let c: any
		if (resolved?.constantsId) {
			try {
				c = req(resolved.constantsId)
			} catch {}
		}
		if (!c?.YOU_BAR_HEIGHT) {
			try {
				const { filters, lookupModule } = revenge.modules.finders
				const res = lookupModule(filters.withProps('YOU_BAR_HEIGHT', 'YOU_BAR_PADDING'))
				if (res && res !== revenge.modules.finders.NotFoundResult) {
					c = res[0]
				}
			} catch {}
		}
		if (!c?.YOU_BAR_HEIGHT) return
		const current = getCurrentStorage()
		c.YOU_BAR_HEIGHT = current.compactHeader ? 44 : 56
		c.YOU_BAR_PADDING = current.compactHeader ? 4 : 12
		if (current.compactAvatar) {
			c.YOU_BAR_AVATAR_LARGE_PX = 45
		} else {
			c.YOU_BAR_AVATAR_LARGE_PX = 60
		}
	}

	const patchHeaderComponent = (mod: any) => {
		const target = mod?.default ?? mod
		if (!target || (typeof target !== 'function' && typeof target !== 'object')) return
		if (patchedTargets.has(target)) return
		patchedTargets.add(target)

		const prop = typeof target.type === 'function' ? 'type' : 'default'
		const holder = typeof target.type === 'function' ? target : mod

		try {
			const unpatch = revenge.patcher.instead(
				holder,
				prop,
				(args: any[], orig: any) => {
					const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)
					React.useEffect(() => {
						const unsub = storage.subscribe(() => {
							syncConstants()
							forceUpdate()
						})
						return () => unsub?.()
					}, [])

					const res = orig(...args)
					if (!res) return res
					const current = getCurrentStorage()
					if (!current.compactHeader) return res

					return React.cloneElement(res, {
						style: [
							res.props?.style,
							{
								height: 44,
								minHeight: 40,
								paddingVertical: 2,
							},
						],
					})
				},
			)
			cleanups.push(unpatch)
		} catch {}
	}

	const patchYouBarAvatar = (mod: any) => {
		const target = mod?.default ?? mod
		if (!target || (typeof target !== 'function' && typeof target !== 'object')) return
		if (patchedTargets.has(target)) return
		patchedTargets.add(target)

		const prop = typeof target.type === 'function' ? 'type' : 'default'
		const holder = typeof target.type === 'function' ? target : mod

		try {
			const unpatch = revenge.patcher.instead(
				holder,
				prop,
				(args: any[], orig: any) => {
					const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)
					React.useEffect(() => {
						const unsub = storage.subscribe(() => {
							syncConstants()
							forceUpdate()
						})
						return () => unsub?.()
					}, [])

					const res = orig(...args)
					if (!res) return res
					const current = getCurrentStorage()
					if (!current.compactAvatar) return res

					return React.createElement(
						RN?.View ?? 'View',
						{
							style: {
								transform: [{ scale: 0.75 }],
								alignItems: 'center',
								justifyContent: 'center',
								marginHorizontal: -4,
							},
						},
						res,
					)
				},
			)
			cleanups.push(unpatch)
		} catch {}
	}

	const patchYouName = (mod: any) => {
		const target = mod?.default ?? mod
		if (!target || (typeof target !== 'function' && typeof target !== 'object')) return
		if (patchedTargets.has(target)) return
		patchedTargets.add(target)

		const prop = typeof target.type === 'function' ? 'type' : 'default'
		const holder = typeof target.type === 'function' ? target : mod

		try {
			const unpatch = revenge.patcher.instead(
				holder,
				prop,
				(args: any[], orig: any) => {
					const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)
					React.useEffect(() => {
						const unsub = storage.subscribe(() => forceUpdate())
						return () => unsub?.()
					}, [])

					const res = orig(...args)
					if (!res) return res
					const current = getCurrentStorage()
					if (!current.hideStatus) return res

					if (res.props?.children && Array.isArray(res.props.children)) {
						return React.cloneElement(res, {
							children: [res.props.children[0]],
						})
					}

					return res
				},
			)
			cleanups.push(unpatch)
		} catch {}
	}

	const patchActivityModules = () => {
		if (typeof (globalThis as any).__r !== 'function') return
		const req = (globalThis as any).__r

		const statusIds = [resolved?.statusId, 16472, 16423].filter(Boolean) as number[]
		for (const id of statusIds) {
			try {
				const m = req(id)
				if (m && typeof m.default === 'function') {
					const unpatch = revenge.patcher.instead(
						m,
						'default',
						(args: any[], orig: any) => {
							const current = getCurrentStorage()
							if (current.hideStatus) return false
							return orig(...args)
						},
					)
					cleanups.push(unpatch)
				}
			} catch {}
		}

		try {
			const m10908 = req(10908)
			if (m10908 && typeof m10908.default === 'function') {
				const unpatch = revenge.patcher.instead(
					m10908,
					'default',
					(args: any[], orig: any) => {
						const current = getCurrentStorage()
						if (current.hideStatus) return null
						return orig(...args)
					},
				)
				cleanups.push(unpatch)
			}
		} catch {}
	}

	const initPatches = () => {
		syncConstants()

		if (typeof (globalThis as any).__r !== 'function' || !resolved) return
		const req = (globalThis as any).__r

		for (const id of resolved.headerIds) {
			try {
				patchHeaderComponent(req(id))
			} catch {}
		}

		for (const id of resolved.avatarIds) {
			try {
				patchYouBarAvatar(req(id))
			} catch {}
		}

		try {
			patchYouName(req(resolved.nameId))
		} catch {}

		patchActivityModules()
	}

	initPatches()

	try {
		const unsubThemed = revenge.modules.finders.getModules(
			revenge.modules.finders.filters.withName('YouBarThemed'),
			(m: any) => patchHeaderComponent(m),
			{ cached: true, returnNamespace: true },
		)
		cleanups.push(() => unsubThemed?.())
	} catch {}

	try {
		const unsubBg = revenge.modules.finders.getModules(
			revenge.modules.finders.filters.withName('YouBarBackground'),
			(m: any) => patchHeaderComponent(m),
			{ cached: true, returnNamespace: true },
		)
		cleanups.push(() => unsubBg?.())
	} catch {}

	try {
		const unsubName = revenge.modules.finders.getModules(
			revenge.modules.finders.filters.withName('YouName'),
			(m: any) => patchYouName(m),
			{ cached: true, returnNamespace: true },
		)
		cleanups.push(() => unsubName?.())
	} catch {}

	return () => {
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}
	}
}
