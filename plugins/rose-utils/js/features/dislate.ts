import { getLazyActionSheet, getActionSheetRow, showToast, getReact } from '../shared'
import { translateText } from './translate'
import type { RoseUtilsSettings } from '../types'

export function initDislate(settings: RoseUtilsSettings): () => void {
	if (!settings.dislate) return () => {}

	const cleanups: (() => void)[] = []
	const targetLang = settings.dislateTargetLang || 'en'
	const LazyActionSheet = getLazyActionSheet()
	const ActionSheetRow = getActionSheetRow()
	const React = getReact()

	if (LazyActionSheet && ActionSheetRow && React) {
		const unpatchSheet = revenge.patcher.before(LazyActionSheet, 'openLazy', (args: any) => {
			const [componentPromise, key, msg] = args
			if (key !== 'MessageLongPressActionSheet' || !msg?.message?.content) return args
			const message = msg.message

			componentPromise.then((instance: any) => {
				const unpatchInner = revenge.patcher.after(instance, 'default', (comp: any) => {
					try {
						const searchChildren = (node: any): any[] | null => {
							if (!node) return null
							if (Array.isArray(node)) {
								for (const item of node) {
									const res = searchChildren(item)
									if (res) return res
								}
								return null
							}
							if (node.props?.children) {
								if (Array.isArray(node.props.children)) {
									const hasRow = node.props.children.some(
										(c: any) => c?.type?.name === 'ActionSheetRow' || c?.props?.label
									)
									if (hasRow) return node.props.children
								}
								return searchChildren(node.props.children)
							}
							return null
						}

						const children = searchChildren(comp)
						if (!children) return comp

						const translateRow = React.createElement(ActionSheetRow, {
							label: 'Translate Message',
							onPress: async () => {
								if (LazyActionSheet?.hideActionSheet) LazyActionSheet.hideActionSheet()
								try {
									const res = await translateText(message.content, targetLang)
									showToast(`[${targetLang.toUpperCase()}]: ${res.translated.slice(0, 150)}`)
								} catch (e: any) {
									showToast(`Translation error: ${e?.message || e}`)
								}
							},
						})
						children.push(translateRow)
					} catch {}
					return comp
				})
				cleanups.push(unpatchInner)
			})
			return args
		})
		cleanups.push(unpatchSheet)
	}

	return () => {
		for (const fn of cleanups) fn()
	}
}
