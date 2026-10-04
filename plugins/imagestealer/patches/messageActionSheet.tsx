import {
	getActionSheetActionCreators,
	hideActionSheet,
	openLazyActionSheet,
} from '../components'
import { extractStealableAssets } from '../extractor'
import StealerActionSheet, {
	STEALER_ACTION_SHEET_KEY,
} from '../ui/StealerActionSheet'
import type React from 'react'
import type { StealableAsset } from '../types'

function getRevenge(): any {
	try {
		if (typeof revenge !== 'undefined') return revenge
	} catch {}
	return (globalThis as any).revenge
}

function getActionSheetRow(): any {
	const rev = getRevenge()
	return (
		rev?.discord?.design?.Design?.ActionSheetRow ||
		rev?.modules?.finders?.lookupModule?.(
			rev.modules.finders.filters.withProps('ActionSheetRow'),
		)?.[0]?.ActionSheetRow
	)
}

function getStealerIconAsset(): any {
	const rev = getRevenge()
	return (
		rev?.assets?.getAssetIdByName?.('DownloadIcon') ??
		rev?.assets?.getAssetIdByName?.('ic_download_24px') ??
		rev?.assets?.getAssetIdByName?.('ic_reaction_add_24px') ??
		399
	)
}

export function openStealerSheet(
	assets: StealableAsset[],
	messageId?: string,
	channelId?: string,
): void {
	if (!assets || assets.length === 0) return
	try {
		hideActionSheet('MessageLongPressActionSheet')
	} catch {}
	openLazyActionSheet(
		async () => ({
			default: (props: any) => (
				<StealerActionSheet
					{...props}
					assets={assets}
					messageId={messageId}
					channelId={channelId}
				/>
			),
		}),
		STEALER_ACTION_SHEET_KEY,
	)
}

function createStealerRow(
	assets: StealableAsset[],
	message: any,
): React.ReactElement | null {
	const ActionSheetRow = getActionSheetRow()
	if (!ActionSheetRow) return null

	const count = assets.length
	const label =
		count === 1 ? 'Steal Emoji / Sticker' : `Steal Emojis & Stickers (${count})`
	const icon = getStealerIconAsset()

	return (
		<ActionSheetRow
			key="imagestealer-steal-row"
			label={label}
			icon={icon}
			onPress={() => openStealerSheet(assets, message?.id, message?.channel_id)}
		/>
	)
}

export function patchMessageActionSheet(): () => void {
	const rev = getRevenge()
	const patcher = rev?.patcher
	const actions = getActionSheetActionCreators()
	const patches: Array<() => void> = []

	// 1. tralwdwdd.ActionSheetPatcher integration
	try {
		const tralwdwdd = rev?.tralwdwdd?.ActionSheetPatcher
		if (typeof tralwdwdd?.registerActionSheetPatch === 'function') {
			const unsub = tralwdwdd.registerActionSheetPatch(
				'MessageLongPressActionSheet',
				(actionGroups: any, props: any) => {
					try {
						const message = props?.message
						if (!message) return
						const assets = extractStealableAssets(message)
						if (assets.length === 0) return

						const row = createStealerRow(assets, message)
						if (!row) return

						if (Array.isArray(actionGroups)) {
							for (const group of actionGroups) {
								if (Array.isArray(group)) {
									group.push(row)
									return
								}
								if (Array.isArray(group?.props?.children)) {
									group.props.children.push(row)
									return
								}
							}
							actionGroups.push([row])
						}
					} catch (e) {
						console.error('[ImageStealer] tralwdwdd patch error:', e)
					}
				},
			)
			if (typeof unsub === 'function') patches.push(unsub)
		}
	} catch (err) {
		console.warn('[ImageStealer] tralwdwdd skipped:', err)
	}

	// 2. ActionSheetActionCreators.openLazy hook
	if (actions?.openLazy && patcher?.before) {
		const unpatchOpenLazy = patcher.before(
			actions,
			'openLazy',
			(args: any[]) => {
				try {
					const componentPromise = args?.[0]
					const key = args?.[1]
					const data = args?.[2]

					if (!componentPromise?.then) return args
					const strKey = String(key || '')
					if (/channel|forum|guild-action-sheet-leave/i.test(strKey))
						return args

					const message = data?.message
					if (!message && !/message/i.test(strKey)) return args

					componentPromise.then((instance: any) => {
						if (!instance || instance.__imageStealerPatched) return
						instance.__imageStealerPatched = true

						const isMemo =
							typeof instance.default === 'object' && instance.default !== null
						const target = isMemo ? instance.default : instance
						const prop = isMemo ? 'type' : 'default'

						if (typeof target[prop] !== 'function') return

						const unpatchTarget = patcher.after(target, prop, (comp: any) => {
							if (!comp) return comp
							try {
								const activeMsg =
									message || comp?.props?.message || comp?.props?.channelMessage
								if (!activeMsg) return comp

								const assets = extractStealableAssets(activeMsg)
								if (assets.length === 0) return comp

								const row = createStealerRow(assets, activeMsg)
								if (!row) return comp

								// Helper to inject into child lists
								const inject = (node: any): boolean => {
									if (!node) return false
									if (Array.isArray(node)) {
										node.push(row)
										return true
									}
									if (Array.isArray(node?.props?.children)) {
										node.props.children.push(row)
										return true
									}
									return false
								}

								if (!inject(comp?.props?.children)) {
									if (Array.isArray(comp)) comp.push(row)
								}
							} catch (e) {
								console.error('[ImageStealer] error injecting row:', e)
							}
							return comp
						})
						if (typeof unpatchTarget === 'function') patches.push(unpatchTarget)
					})
				} catch (e) {
					console.error('[ImageStealer] openLazy hook error:', e)
				}
				return args
			},
		)
		if (typeof unpatchOpenLazy === 'function') patches.push(unpatchOpenLazy)
	}

	return () => {
		for (const p of patches) {
			try {
				p()
			} catch {}
		}
	}
}
