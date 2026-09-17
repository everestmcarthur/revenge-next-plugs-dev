import { discordModules } from '@shared'
import type { JsonStorage } from '@revenge-mod/json-storage'
import { saveCachedModuleId, type YouBarPlusStorage } from '../lib/types'

let cachedFastListInstance: any = null

export function requestGuildsBarUpdate() {
	if (cachedFastListInstance?.forceUpdate) {
		try {
			cachedFastListInstance.forceUpdate()
		} catch {}
	}
}

export default function patchHideBuiltinDm(
	storage: JsonStorage<YouBarPlusStorage>,
): () => void {
	const cleanups: Array<() => void> = []

	const shouldHideBuiltinDm = () => {
		const s = storage.cache
		return s?.showDMButton !== false && s?.hideBuiltinDM !== false
	}

	const req = (globalThis as any).__r
	if (typeof req !== 'function') return () => {}

	// 1. Patch FastList prototype to capture GuildsBar FastList and ensure sections[0] = 0
	try {
		const fastListMod = req(7175)
		const FL = fastListMod?.default ?? fastListMod
		if (FL?.prototype?.render) {
			const origRender = FL.prototype.render
			FL.prototype.render = function (...args: any[]) {
				if (this.props?.nativeID === 'guilds-bar-fast-list') {
					cachedFastListInstance = this
					if (shouldHideBuiltinDm()) {
						if (Array.isArray(this.props.sections) && this.props.sections[0] === 1) {
							this.props.sections[0] = 0
						}
						const origItemSize = this.props.itemSize
						if (typeof origItemSize === 'function' && !origItemSize.__ybPatched) {
							const patchedItemSize = (s: number, i: number) => {
								if (s === 0 && shouldHideBuiltinDm()) return 0
								return origItemSize(s, i)
							}
							;(patchedItemSize as any).__ybPatched = true
							this.props.itemSize = patchedItemSize
						}
						const origRenderItem = this.props.renderItem
						if (typeof origRenderItem === 'function' && !origRenderItem.__ybPatched) {
							const patchedRenderItem = (s: number, i: number) => {
								if (s === 0 && shouldHideBuiltinDm()) return null
								return origRenderItem(s, i)
							}
							;(patchedRenderItem as any).__ybPatched = true
							this.props.renderItem = patchedRenderItem
						}
					}
				}
				return origRender.apply(this, args)
			}
			cleanups.push(() => {
				FL.prototype.render = origRender
				cachedFastListInstance = null
			})
		}
	} catch (e) {
		console.error('[YouBar+] Error patching FastList prototype:', e)
	}

	// 2. Patch GuildsBarMessages component (16403)
	const patchGuildsBarMessages = (mod: any, id?: number) => {
		const target = mod?.default ?? mod
		if (!target) return
		const key = typeof target === 'function' ? undefined : 'type'
		try {
			const unpatch = revenge.patcher.instead(
				target,
				key as any,
				(args: any[], orig: any) => {
					if (shouldHideBuiltinDm()) {
						return null
					}
					return orig(...args)
				},
			)
			cleanups.push(unpatch)
			if (typeof id === 'number' && storage) {
				saveCachedModuleId(storage, 'guildsBarMessagesId' as any, id)
			}
		} catch (e) {
			console.error('[YouBar+] Error patching GuildsBarMessages:', e)
		}
	}

	const messagesId =
		storage.cache?.moduleCache?.guildsBarMessagesId ??
		discordModules['modules/guilds_bar/native/GuildsBarMessages.tsx'] ??
		16403

	try {
		const mod = req(messagesId)
		if (mod) patchGuildsBarMessages(mod, messagesId)
	} catch {}

	// 3. Patch useGuildsBarProps hook (16387)
	const patchUseGuildsBarProps = (mod: any, id?: number) => {
		if (!mod) return
		const target = mod
		const key = 'default'
		try {
			const unpatch = revenge.patcher.after(
				target,
				key,
				(res: any) => {
					if (!res?.listDataProps) return res
					if (shouldHideBuiltinDm()) {
						if (Array.isArray(res.listDataProps.sections) && res.listDataProps.sections[0] === 1) {
							res.listDataProps.sections[0] = 0
						}
						const origItemSize = res.listDataProps.itemSize
						if (typeof origItemSize === 'function' && !origItemSize.__ybPatched) {
							const patched = (s: number, i: number) => {
								if (s === 0 && shouldHideBuiltinDm()) return 0
								return origItemSize(s, i)
							}
							;(patched as any).__ybPatched = true
							res.listDataProps.itemSize = patched
						}
						const origSectionSize = res.listDataProps.sectionSize
						if (typeof origSectionSize === 'function' && !origSectionSize.__ybPatched) {
							const patched = (s: number) => {
								if (s === 0 && shouldHideBuiltinDm()) return 0
								return origSectionSize(s)
							}
							;(patched as any).__ybPatched = true
							res.listDataProps.sectionSize = patched
						}
						const origRenderItem = res.listDataProps.renderItem
						if (typeof origRenderItem === 'function' && !origRenderItem.__ybPatched) {
							const patched = (s: number, i: number) => {
								if (s === 0 && shouldHideBuiltinDm()) return null
								return origRenderItem(s, i)
							}
							;(patched as any).__ybPatched = true
							res.listDataProps.renderItem = patched
						}
					}
					return res
				},
			)
			cleanups.push(unpatch)
			if (typeof id === 'number' && storage) {
				saveCachedModuleId(storage, 'useGuildsBarPropsId' as any, id)
			}
		} catch (e) {
			console.error('[YouBar+] Error patching useGuildsBarProps:', e)
		}
	}

	const propsId =
		storage.cache?.moduleCache?.useGuildsBarPropsId ??
		discordModules['modules/guilds_bar/native/hooks/useGuildsBarProps.tsx'] ??
		16387

	try {
		const mod = req(propsId)
		if (mod) patchUseGuildsBarProps(mod, propsId)
	} catch {}

	// 4. Patch GuildsBar component (16378)
	const patchGuildsBar = (mod: any, id?: number) => {
		const target = mod?.default ?? mod
		if (!target) return
		const key = typeof target === 'function' ? undefined : 'type'

		function patchFastListNode(node: any) {
			if (!node) return
			if (node.props?.nativeID === 'guilds-bar-fast-list') {
				if (shouldHideBuiltinDm()) {
					if (Array.isArray(node.props.sections) && node.props.sections[0] === 1) {
						node.props.sections[0] = 0
					}
					const origItemSize = node.props.itemSize
					if (typeof origItemSize === 'function' && !origItemSize.__ybPatched) {
						const patched = (s: number, i: number) => {
							if (s === 0 && shouldHideBuiltinDm()) return 0
							return origItemSize(s, i)
						}
						;(patched as any).__ybPatched = true
						node.props.itemSize = patched
					}
				}
				return
			}
			if (Array.isArray(node)) {
				for (const child of node) patchFastListNode(child)
			} else if (node.props?.children) {
				patchFastListNode(node.props.children)
			}
		}

		try {
			const unpatch = revenge.patcher.after(
				target,
				key as any,
				(res: any) => {
					patchFastListNode(res)
					return res
				},
			)
			cleanups.push(unpatch)
			if (typeof id === 'number' && storage) {
				saveCachedModuleId(storage, 'guildsBarId' as any, id)
			}
		} catch (e) {
			console.error('[YouBar+] Error patching GuildsBar:', e)
		}
	}

	const guildsBarId =
		storage.cache?.moduleCache?.guildsBarId ??
		discordModules['modules/guilds_bar/native/GuildsBar.tsx'] ??
		16378

	try {
		const mod = req(guildsBarId)
		if (mod) patchGuildsBar(mod, guildsBarId)
	} catch {}

	return () => {
		for (const fn of cleanups) {
			try {
				fn()
			} catch {}
		}
	}
}
