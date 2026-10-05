import React from 'react'
import {
	downloadAsset,
	getManageableGuilds,
	saveCloudflareVault,
	uploadEmojiToGuild,
} from '../api'
import {
	copyToClipboard,
	getActionSheetActionCreators,
	getCurrentUserId,
	hideActionSheet,
	openLazyActionSheet,
	showToast,
} from '../components'
import { extractStealableAssets } from '../extractor'
import { addVaultItemToStorage, getStoredSettings } from '../storage'
import type { StealableAsset } from '../types'
import StealerActionSheet, {
	STEALER_ACTION_SHEET_KEY,
} from '../ui/StealerActionSheet'

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

function getSelectedChannelIdSafe(): string {
	try {
		const rev = getRevenge()
		const store = rev?.everest?.getSelectedChannelStore?.()
		if (typeof store?.getChannelId === 'function') {
			const id = store.getChannelId()
			if (id) return id
		}
		const finders = rev?.modules?.finders
		if (finders?.lookupModule && finders?.filters?.withProps) {
			const mods = finders.lookupModule(
				finders.filters.withProps(
					'getChannelId',
					'getCurrentlySelectedChannelId',
				),
			)
			if (mods?.[0]?.getChannelId) {
				const id = mods[0].getChannelId()
				if (id) return id
			}
		}
	} catch {}
	return ''
}

interface TargetData {
	message?: any
	item?: any
	attachment?: any
	user?: any
	channelId?: string
	assets: StealableAsset[]
}

let activeTargetContext: TargetData | null = null

function updateActiveContext(data: Partial<TargetData>) {
	if (!activeTargetContext) {
		activeTargetContext = {
			channelId: getSelectedChannelIdSafe(),
			assets: [],
		}
	}
	if (data.message) activeTargetContext.message = data.message
	if (data.item) activeTargetContext.item = data.item
	if (data.attachment) activeTargetContext.attachment = data.attachment
	if (data.user) activeTargetContext.user = data.user
	if (data.assets && data.assets.length > 0)
		activeTargetContext.assets = data.assets

	const currentChan = getSelectedChannelIdSafe()
	activeTargetContext.channelId =
		currentChan || data.channelId || activeTargetContext.channelId
}

function getActiveContext(): TargetData {
	const currentChan = getSelectedChannelIdSafe()
	return {
		...(activeTargetContext || { assets: [] }),
		channelId: currentChan || activeTargetContext?.channelId || '',
	}
}

function promptServerUpload(asset: StealableAsset) {
	const rev = getRevenge()
	const RN = rev?.react?.ReactNative
	const Alert = RN?.Alert
	const guilds = getManageableGuilds().filter(g =>
		asset.animated ? !g.isAnimatedFull : !g.isStaticFull,
	)

	if (guilds.length === 0) {
		showToast({
			content: 'No servers with free emoji slots found',
			variant: 'critical',
		})
		return
	}

	if (guilds.length === 1) {
		const g = guilds[0]
		showToast({
			content: `Uploading :${asset.name}: to ${g.guildName}...`,
			variant: 'info',
		})
		uploadEmojiToGuild(g.guildId, asset.name, asset.url).then(res => {
			if (res.success) {
				showToast({
					content: `Uploaded :${asset.name}: to ${g.guildName}!`,
					variant: 'success',
				})
			} else {
				showToast({
					content: res.error || 'Upload failed',
					variant: 'critical',
				})
			}
		})
		return
	}

	const buttons = guilds.slice(0, 5).map(g => ({
		text: `${g.guildName.slice(0, 20)} (${asset.animated ? g.animatedCount : g.staticCount}/${asset.animated ? g.maxAnimated : g.maxStatic})`,
		onPress: () => {
			showToast({
				content: `Uploading :${asset.name}: to ${g.guildName}...`,
				variant: 'info',
			})
			uploadEmojiToGuild(g.guildId, asset.name, asset.url).then(res => {
				if (res.success) {
					showToast({
						content: `Uploaded :${asset.name}: to ${g.guildName}!`,
						variant: 'success',
					})
				} else {
					showToast({
						content: res.error || 'Upload failed',
						variant: 'critical',
					})
				}
			})
		},
	}))
	buttons.push({ text: 'Cancel', style: 'cancel' as const })
	Alert?.alert('Upload to Server', `Select server for :${asset.name}:`, buttons)
}

export function openStealerSheet(assets: StealableAsset[]): void {
	if (!assets || assets.length === 0) {
		showToast({
			content: 'No stealable emojis, stickers, or media found',
			variant: 'critical',
		})
		return
	}
	try {
		hideActionSheet()
	} catch {}

	try {
		openLazyActionSheet(StealerActionSheet, STEALER_ACTION_SHEET_KEY, {
			assets,
		})
		return
	} catch (err) {
		console.warn(
			'[ImageStealer] openLazyActionSheet failed, using Alert fallback:',
			err,
		)
	}

	const rev = getRevenge()
	const RN = rev?.react?.ReactNative
	const Alert = RN?.Alert

	if (assets.length === 1) {
		const asset = assets[0]
		const title = `Steal :${asset.name}:`
		const desc = `${asset.type.toUpperCase()}${asset.animated ? ' (ANIMATED)' : ''}`

		Alert?.alert(title, desc, [
			{
				text: 'Save to Gallery',
				onPress: () => downloadAsset(asset.url, asset.name, asset.animated),
			},
			{
				text: 'Save to Vault',
				onPress: async () => {
					addVaultItemToStorage({
						id: asset.id,
						name: asset.name,
						url: asset.url,
						animated: asset.animated,
						type: asset.type,
						addedAt: Date.now(),
					})
					const userId = getCurrentUserId()
					const s = getStoredSettings()
					if (userId && s.syncWithCloud) {
						saveCloudflareVault(userId, s.vault)
					}
					showToast({
						content: `Saved :${asset.name}: to Vault!`,
						variant: 'success',
					})
				},
			},
			{
				text: 'Upload to Server',
				onPress: () => promptServerUpload(asset),
			},
			{
				text: 'Copy URL',
				onPress: () =>
					copyToClipboard(asset.url, `Copied :${asset.name}: link!`),
			},
			{ text: 'Cancel', style: 'cancel' },
		])
		return
	}

	// Multiple assets: show instant high-speed bulk actions
	Alert?.alert('ImageStealer', `Found ${assets.length} emojis & stickers`, [
		{
			text: `Save All to Gallery (${assets.length})`,
			onPress: async () => {
				for (const a of assets) {
					await downloadAsset(a.url, a.name, a.animated)
				}
			},
		},
		{
			text: `Save All to Vault (${assets.length})`,
			onPress: async () => {
				for (const a of assets) {
					addVaultItemToStorage({
						id: a.id,
						name: a.name,
						url: a.url,
						animated: a.animated,
						type: a.type,
						addedAt: Date.now(),
					})
				}
				const userId = getCurrentUserId()
				const s = getStoredSettings()
				if (userId && s.syncWithCloud) {
					saveCloudflareVault(userId, s.vault)
				}
				showToast({
					content: `Saved all ${assets.length} items to Vault!`,
					variant: 'success',
				})
			},
		},
		{
			text: 'Choose Item...',
			onPress: () => {
				const buttons = assets.slice(0, 6).map(a => ({
					text: `:${a.name}:`,
					onPress: () => openStealerSheet([a]),
				}))
				buttons.push({ text: 'Cancel', style: 'cancel' as const })
				Alert?.alert(
					'Select Item to Steal',
					'Choose which emoji or sticker to steal:',
					buttons,
				)
			},
		},
		{ text: 'Cancel', style: 'cancel' },
	])
}

function buildStealerRow(targetDataResolver: () => TargetData): any {
	const ActionSheetRow = getActionSheetRow()
	if (!ActionSheetRow) return null

	const iconAsset = getStealerIconAsset()
	const icon =
		ActionSheetRow.Icon && iconAsset
			? React.createElement(ActionSheetRow.Icon, { source: iconAsset })
			: undefined

	const onPress = () => {
		try {
			hideActionSheet()
		} catch {}
		setTimeout(() => {
			const ctx = targetDataResolver()
			let assets = ctx.assets
			if (!assets || assets.length === 0) {
				const fallback = ctx.message || ctx.item || ctx.attachment || ctx.user
				assets = extractStealableAssets(fallback)
			}
			openStealerSheet(assets)
		}, 60)
	}

	return React.createElement(ActionSheetRow, {
		key: 'imagestealer-steal-row',
		label: 'Steal Emojis & Stickers',
		icon,
		onPress,
	})
}

function injectIntoActionGroups(
	actionGroups: any[],
	targetDataResolver: () => TargetData,
): boolean {
	if (!Array.isArray(actionGroups) || actionGroups.length === 0) return false

	const hasRow = actionGroups.some(
		(item: any) =>
			item?.key === 'imagestealer-steal-row' ||
			item?.key === 'imagestealer-group' ||
			(Array.isArray(item?.props?.children) &&
				item.props.children.some(
					(c: any) =>
						c?.key === 'imagestealer-steal-row' ||
						c?.key === 'imagestealer-group',
				)),
	)
	if (hasRow) return true

	const row = buildStealerRow(targetDataResolver)
	if (!row) return false

	for (const group of actionGroups) {
		if (Array.isArray(group?.props?.children)) {
			group.props.children.unshift(row)
			return true
		}
	}

	const hasRowProps = actionGroups.some(
		(el: any) =>
			typeof el?.props?.label === 'string' ||
			typeof el?.props?.onPress === 'function',
	)
	if (hasRowProps) {
		actionGroups.unshift(row)
		return true
	}

	const ActionSheetRow = getActionSheetRow()
	const Group = ActionSheetRow?.Group
	const wrapped = Group
		? React.createElement(Group, { key: 'imagestealer-group' }, row)
		: row
	actionGroups.unshift(wrapped)
	return true
}

function searchChildren(element: any): any[] | null {
	if (!element || typeof element !== 'object') return null
	const children = element?.props?.children
	if (!children) return null
	if (Array.isArray(children)) {
		if (
			children.some(
				(c: any) =>
					c?.type?.name === 'ActionSheetRowGroup' ||
					c?.props?.label ||
					c?.props?.onPress,
			)
		) {
			return children
		}
		for (const c of children) {
			const found = searchChildren(c)
			if (found) return found
		}
	} else if (typeof children === 'object') {
		return searchChildren(children)
	}
	return null
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
			const sheetNames = [
				'MessageLongPressActionSheet',
				'MediaViewerActionSheet',
				'MediaActionSheet',
				'MediaLongPressActionSheet',
				'AttachmentActionSheet',
				'ImageActionSheet',
			]
			for (const name of sheetNames) {
				const unsub = tralwdwdd.registerActionSheetPatch(
					name,
					(actionGroups: any, props: any) => {
						try {
							const message =
								props?.message ||
								props?.channelMessage ||
								props?.targetMessage ||
								props?.item?.message ||
								props?.attachment?.message
							const item = props?.item || props?.attachment || props?.media
							const channelId =
								getSelectedChannelIdSafe() ||
								props?.channel?.id ||
								props?.channelId ||
								message?.channel_id
							const assets = extractStealableAssets(message || item || props)

							updateActiveContext({ message, item, channelId, assets })

							if (assets.length > 0 || message || item) {
								injectIntoActionGroups(actionGroups, getActiveContext)
							}
						} catch (e) {
							console.error('[ImageStealer] tralwdwdd patch error:', e)
						}
					},
				)
				if (typeof unsub === 'function') patches.push(unsub)
			}
		}
	} catch (err) {
		console.warn('[ImageStealer] tralwdwdd skipped:', err)
	}

	// 2. ActionSheetActionCreators.openLazy integration (universal derived-promise pattern)
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

					const message =
						data?.message ||
						data?.channelMessage ||
						data?.targetMessage ||
						data?.item?.message ||
						data?.attachment?.message
					const item = data?.item || data?.attachment || data?.media
					const channelId =
						getSelectedChannelIdSafe() ||
						data?.channel?.id ||
						data?.channelId ||
						message?.channel_id

					const initialAssets = extractStealableAssets(message || item || data)
					updateActiveContext({
						message,
						item,
						channelId,
						assets: initialAssets,
					})

					args[0] = componentPromise.then((instance: any) => {
						if (!instance) return instance

						const isMemo =
							typeof instance.default === 'object' && instance.default !== null
						const target = isMemo ? instance.default : instance
						const prop = isMemo ? 'type' : 'default'

						if (typeof target[prop] !== 'function') return instance
						if (instance.__stealerPatched) return instance
						instance.__stealerPatched = true

						// 1. Hook target[prop] BEFORE to capture props of this specific sheet render
						if (patcher?.before) {
							const unpatchBefore = patcher.before(
								target,
								prop,
								(compArgs: any[]) => {
									try {
										const compProps = compArgs?.[0]
										if (compProps) {
											const pMsg =
												compProps.message ||
												compProps.channelMessage ||
												compProps.targetMessage ||
												compProps.item?.message ||
												compProps.attachment?.message
											const pItem =
												compProps.item ||
												compProps.attachment ||
												compProps.media
											const pChan =
												getSelectedChannelIdSafe() ||
												compProps.channel?.id ||
												compProps.channelId ||
												pMsg?.channel_id
											const extracted = extractStealableAssets(
												pMsg || pItem || compProps,
											)

											updateActiveContext({
												message: pMsg,
												item: pItem,
												channelId: pChan,
												assets: extracted,
											})
										}
									} catch (e) {
										console.error('[ImageStealer] sheet before hook error:', e)
									}
									return compArgs
								},
							)
							patches.push(unpatchBefore)
						}

						// 2. Hook target[prop] AFTER to inject Steal row
						const unpatchTarget = patcher.after(target, prop, (comp: any) => {
							if (!comp) return comp

							try {
								const lateMessage =
									comp?.props?.message || comp?.props?.channelMessage
								const lateItem = comp?.props?.item || comp?.props?.attachment
								if (lateMessage || lateItem) {
									const extracted = extractStealableAssets(
										lateMessage || lateItem,
									)
									updateActiveContext({
										message: lateMessage,
										item: lateItem,
										channelId: getSelectedChannelIdSafe(),
										assets: extracted,
									})
								}

								// Options list (UserProfileOverflow / ContextMenu)
								const options =
									comp?.props?.options || comp?.props?.content?.props?.options
								if (Array.isArray(options)) {
									if (
										!options.some(
											(o: any) => o?.label === 'Steal Emojis & Stickers',
										)
									) {
										options.push({
											label: 'Steal Emojis & Stickers',
											onPress: () => {
												const ctx = getActiveContext()
												openStealerSheet(ctx.assets)
											},
										})
									}
									return comp
								}

								// Items list
								const items =
									comp?.props?.items || comp?.props?.children?.props?.items
								if (Array.isArray(items)) {
									const list = Array.isArray(items[0]) ? items[0] : items
									if (
										!list.some(
											(o: any) => o?.label === 'Steal Emojis & Stickers',
										)
									) {
										list.push({
											label: 'Steal Emojis & Stickers',
											action: () => {
												const ctx = getActiveContext()
												openStealerSheet(ctx.assets)
											},
										})
									}
									return comp
								}

								const findInTree = (rev as any)?.utils?.tree?.findInTree

								// Action groups array in React tree
								const groups = findInTree?.(
									comp,
									(x: any) =>
										Array.isArray(x) &&
										x.length > 0 &&
										(x[0]?.type?.name === 'ActionSheetRowGroup' ||
											x.some(
												(c: any) =>
													typeof c?.props?.label === 'string' ||
													typeof c?.props?.onPress === 'function',
											)),
								)
								if (Array.isArray(groups)) {
									injectIntoActionGroups(groups, getActiveContext)
									return comp
								}

								// Recursive search children
								const children = searchChildren(comp)
								if (children && Array.isArray(children)) {
									injectIntoActionGroups(children, getActiveContext)
									return comp
								}

								// Single group fallback
								const isRowGroup = (node: any) => {
									const t = node?.type
									const n =
										t?.name ||
										t?.displayName ||
										t?.type?.name ||
										t?.type?.displayName ||
										''
									return /ActionSheetRowGroup$/.test(n)
								}
								const groupParent = findInTree?.(comp, (node: any) => {
									const ch = node?.props?.children
									if (!ch) return false
									return Array.isArray(ch)
										? ch.some(isRowGroup)
										: isRowGroup(ch)
								})

								if (groupParent) {
									const row = buildStealerRow(getActiveContext)
									if (row) {
										const ActionSheetRow = getActionSheetRow()
										const Group = ActionSheetRow?.Group
										const wrapped = Group
											? React.createElement(
													Group,
													{ key: 'imagestealer-group' },
													row,
												)
											: row
										if (Array.isArray(groupParent.props.children)) {
											groupParent.props.children.unshift(wrapped)
										} else {
											groupParent.props.children = [
												wrapped,
												groupParent.props.children,
											]
										}
									}
									return comp
								}
							} catch (err) {
								console.error('[ImageStealer] sheet injection error:', err)
							}

							return comp
						})

						patches.push(unpatchTarget)
						return instance
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
