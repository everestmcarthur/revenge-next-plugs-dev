import React from 'react'
import { checkQuoteAllowed, generateQuoteCard } from '../api'
import {
	getActionSheetActionCreators,
	hideActionSheet,
	openLazyActionSheet,
} from '../components'
import QuoteActionSheet, { ACTION_SHEET_KEY } from '../QuoteActionSheet'
import {
	extractMessageInfo,
	extractUserInfo,
	getSelectedChannelIdSafe,
	sendQuoteToChannel,
	showToast,
} from '../quotes'
import { defaultSettings, getStoredSettings } from '../storage'
import type { ExtractedMessageInfo } from '../quotes'

const USER_MESSAGE_TYPES = new Set([0, 19, 20, 23, 26, 41, 45, 47, 68])

function isSentMessage(m: any): boolean {
	return !m?.state || m.state === 'SENT'
}

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

function getQuoteIconAsset(): any {
	const rev = getRevenge()
	return (
		rev?.assets?.getAssetIdByName?.('QuoteIcon') ??
		rev?.assets?.getAssetIdByName?.('ic_chat_bubble_32px') ??
		399
	)
}

interface TargetData {
	message?: any
	user?: any
	channelId?: string
}

async function executeQuoteAction(targetData: TargetData): Promise<void> {
	try {
		hideActionSheet()
	} catch {}

	try {
		const channelId = targetData.channelId || getSelectedChannelIdSafe() || ''
		let info: ExtractedMessageInfo

		if (targetData.message) {
			info = extractMessageInfo(targetData.message, channelId)
		} else if (targetData.user) {
			info = extractUserInfo(targetData.user, channelId)
		} else {
			showToast('No message or user found to quote')
			return
		}

		const s = getStoredSettings()
		const shouldAutoSend = s?.instantQuote !== false

		if (!shouldAutoSend) {
			setTimeout(() => {
				openLazyActionSheet(
					() => React.createElement(QuoteActionSheet, { initialInfo: info }),
					ACTION_SHEET_KEY,
					{},
				)
			}, 150)
			return
		}

		// Auto-send mode
		showToast('Generating quote...')
		const def = s.defaultSettings ?? defaultSettings.defaultSettings

		// Run permission check and card generation in parallel for maximum speed
		const checkPromise = checkQuoteAllowed(
			info.targetUserId,
			info.hasSpoilers,
			false,
		)

		const cardPromise = generateQuoteCard({
			text: info.text || '...',
			avatar: info.avatarUrl,
			username: info.username,
			display_name: info.displayName,
			color: Boolean(def.color),
			watermark: def.watermark ? def.watermarkText || 'Make It A Quote' : '',
			bold: Boolean(def.bold),
			light: Boolean(def.light),
			flip: Boolean(def.flip),
			new: Boolean(def.new),
			gif: Boolean(def.gif),
		})

		const [check, res] = await Promise.all([checkPromise, cardPromise])

		if (!check.allowed) {
			showToast(
				check.reason || 'This user has disallowed quotes of their messages.',
			)
			return
		}

		if (res.success && res.url) {
			const finalUrl = res.ziplineUrl || res.url
			sendQuoteToChannel(info.channelId, finalUrl)
		} else {
			showToast(res.error || 'Failed to generate quote')
		}
	} catch (err) {
		console.error('[Quote] Auto-send quote failed:', err)
		showToast('Failed to create quote')
	}
}

function buildQuoteRow(targetData: TargetData): any {
	const ActionSheetRow = getActionSheetRow()
	if (!ActionSheetRow) return null

	const quoteIconAsset = getQuoteIconAsset()
	const icon =
		ActionSheetRow.Icon && quoteIconAsset
			? React.createElement(ActionSheetRow.Icon, { source: quoteIconAsset })
			: undefined

	return React.createElement(ActionSheetRow, {
		key: 'make-it-a-quote',
		label: 'Make it a Quote',
		icon,
		onPress: () => executeQuoteAction(targetData),
	})
}

function injectIntoActionGroups(
	actionGroups: any[],
	targetData: TargetData,
): boolean {
	if (!Array.isArray(actionGroups) || actionGroups.length === 0) return false

	// Check if already injected
	const hasRow = actionGroups.some(
		(item: any) =>
			item?.key === 'make-it-a-quote' ||
			item?.key === 'make-it-a-quote-group' ||
			(Array.isArray(item?.props?.children) &&
				item.props.children.some(
					(c: any) =>
						c?.key === 'make-it-a-quote' || c?.key === 'make-it-a-quote-group',
				)),
	)
	if (hasRow) return true

	const row = buildQuoteRow(targetData)
	if (!row) return false

	// Strategy A: If actionGroups contains groups whose props.children is an array (Rosie's view-raw pattern)
	for (const group of actionGroups) {
		if (Array.isArray(group?.props?.children)) {
			group.props.children.push(row)
			return true
		}
	}

	// Strategy B: If actionGroups is an array of row elements directly
	const hasRowProps = actionGroups.some(
		(el: any) =>
			typeof el?.props?.label === 'string' ||
			typeof el?.props?.onPress === 'function',
	)
	if (hasRowProps) {
		actionGroups.push(row)
		return true
	}

	// Strategy C: If ActionSheetRow.Group exists, append a new Group
	const ActionSheetRow = getActionSheetRow()
	const Group = ActionSheetRow?.Group
	if (Group) {
		actionGroups.push(
			React.createElement(Group, { key: 'make-it-a-quote-group' }, row),
		)
		return true
	}

	return false
}

function searchChildren(node: any): any[] | null {
	if (!node) return null
	if (Array.isArray(node)) {
		for (let i = 0; i < node.length; i++) {
			const res = searchChildren(node[i])
			if (res) return res
		}
		return null
	}
	if (node.props?.children) {
		if (Array.isArray(node.props.children)) {
			const hasRow = node.props.children.some(
				(c: any) =>
					c?.type?.name === 'ActionSheetRow' ||
					typeof c?.props?.label === 'string' ||
					typeof c?.props?.onPress === 'function',
			)
			if (hasRow) return node.props.children
		}
		return searchChildren(node.props.children)
	}
	return null
}

export function patchMessageActionSheet(): () => void {
	const patches: Array<() => void> = []
	const revenge = getRevenge()
	const patcher = revenge?.patcher
	const actions = getActionSheetActionCreators()

	// 1. Integration with tralwdwdd.ActionSheetPatcher
	try {
		const tralwdwdd = revenge?.tralwdwdd?.ActionSheetPatcher
		if (typeof tralwdwdd?.registerActionSheetPatch === 'function') {
			const sheetNames = [
				'MessageLongPressActionSheet',
				'UserActionSheet',
				'GuildProfileActionSheet',
				'UserProfileSheet',
				'UserProfileModalActionSheet',
			]
			for (const name of sheetNames) {
				const unsub = tralwdwdd.registerActionSheetPatch(
					name,
					(actionGroups: any, props: any) => {
						try {
							const message = props?.message
							const user = props?.user || props?.userId || props?.member
							const channelId =
								props?.channel?.id ||
								message?.channel_id ||
								getSelectedChannelIdSafe()

							if (message) {
								if (!isSentMessage(message)) return
								if (
									message.type != null &&
									!USER_MESSAGE_TYPES.has(message.type)
								)
									return
								injectIntoActionGroups(actionGroups, { message, channelId })
							} else if (user) {
								injectIntoActionGroups(actionGroups, { user, channelId })
							}
						} catch (e) {
							console.error('[Quote] tralwdwdd patch error:', e)
						}
					},
				)
				if (typeof unsub === 'function') patches.push(unsub)
			}
		}
	} catch (err) {
		console.warn('[Quote] tralwdwdd integration skipped:', err)
	}

	// 2. Integration with ActionSheetActionCreators.openLazy (Rosie's view-raw pattern)
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
					let user = data?.user || data?.userId || data?.member
					const userIdFromKey = strKey.match(
						/(?:UserProfile|UserActionSheet)(\d+)/i,
					)?.[1]
					if (!user && userIdFromKey) {
						user = userIdFromKey
					}

					const channelId =
						message?.channel_id ||
						data?.channel?.id ||
						getSelectedChannelIdSafe()

					const isMessage = Boolean(message) || /message/i.test(strKey)
					const isUser = Boolean(user) || /user|profile|overflow/i.test(strKey)

					if (!isMessage && !isUser) return args

					const targetData: TargetData = {
						message: message || undefined,
						user: user || undefined,
						channelId,
					}

					componentPromise.then((instance: any) => {
						if (!instance || instance.__quotePatched) return
						instance.__quotePatched = true

						const isMemo =
							typeof instance.default === 'object' && instance.default !== null
						const target = isMemo ? instance.default : instance
						const prop = isMemo ? 'type' : 'default'

						if (typeof target[prop] !== 'function') return

						const unpatchTarget = patcher.after(target, prop, (comp: any) => {
							if (!comp) return comp

							try {
								// Resolve any late-bound user or message from comp.props
								const lateUser =
									comp?.props?.user ||
									comp?.props?.userId ||
									comp?.props?.member ||
									comp?.props?.author
								if (lateUser && !targetData.user) {
									targetData.user = lateUser
								}
								const lateMessage =
									comp?.props?.message || comp?.props?.channelMessage
								if (lateMessage && !targetData.message) {
									targetData.message = lateMessage
								}

								// 1. Check for options list (UserProfileOverflow / ContextMenu)
								const options =
									comp?.props?.options || comp?.props?.content?.props?.options
								if (Array.isArray(options)) {
									if (
										!options.some((o: any) => o?.label === 'Make it a Quote')
									) {
										options.push({
											label: 'Make it a Quote',
											onPress: () => executeQuoteAction(targetData),
										})
									}
									return comp
								}

								// 2. Check for items list (UserProfileOverflowMenu)
								const items =
									comp?.props?.items || comp?.props?.children?.props?.items
								if (Array.isArray(items)) {
									const list = Array.isArray(items[0]) ? items[0] : items
									if (!list.some((o: any) => o?.label === 'Make it a Quote')) {
										list.push({
											label: 'Make it a Quote',
											action: () => executeQuoteAction(targetData),
										})
									}
									return comp
								}

								const findInTree = revenge?.utils?.tree?.findInTree

								// 3. Action groups array in React tree
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
									injectIntoActionGroups(groups, targetData)
									return comp
								}

								// 2. Recursive search children
								const children = searchChildren(comp)
								if (children && Array.isArray(children)) {
									injectIntoActionGroups(children, targetData)
									return comp
								}

								// 3. Bleelblep's single group fallback
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
									const row = buildQuoteRow(targetData)
									if (row) {
										const ActionSheetRow = getActionSheetRow()
										const Group = ActionSheetRow?.Group
										const wrapped = Group
											? React.createElement(
													Group,
													{ key: 'make-it-a-quote-group' },
													row,
												)
											: row
										const ch = groupParent.props.children
										if (Array.isArray(ch)) {
											ch.push(wrapped)
										} else {
											groupParent.props.children = [ch, wrapped]
										}
									}
								}
							} catch (e) {
								console.error('[Quote] Error injecting quote row:', e)
							}

							return comp
						})

						patches.push(unpatchTarget)
					})
				} catch (err) {
					console.error('[Quote] openLazy hook error:', err)
				}

				return args
			},
		)

		patches.push(unpatchOpenLazy)
	}

	return () => {
		for (const unpatch of patches) {
			try {
				unpatch()
			} catch {}
		}
		patches.length = 0
	}
}
