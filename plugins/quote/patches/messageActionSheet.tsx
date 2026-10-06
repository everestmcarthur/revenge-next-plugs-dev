import React from 'react'
import { checkQuoteAllowed, generateQuoteCard } from '../api'
import { getActionSheetActionCreators, hideActionSheet } from '../components'
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
	attachment?: any
	channelId?: string
}

let activeTargetContext: TargetData | null = null

function updateActiveContext(data: Partial<TargetData>) {
	if (!activeTargetContext) {
		activeTargetContext = {
			channelId: getSelectedChannelIdSafe(),
		}
	}
	if (data.message) activeTargetContext.message = data.message
	if (data.user) activeTargetContext.user = data.user
	if (data.attachment) activeTargetContext.attachment = data.attachment
	const currentChan = getSelectedChannelIdSafe()
	activeTargetContext.channelId =
		currentChan || data.channelId || activeTargetContext.channelId
}

function getActiveContext(): TargetData {
	const currentChan = getSelectedChannelIdSafe()
	return {
		...(activeTargetContext || {}),
		channelId: currentChan || activeTargetContext?.channelId || '',
	}
}

async function executeQuoteAction(
	targetDataResolver?: () => TargetData,
): Promise<void> {
	try {
		hideActionSheet()
	} catch {}

	try {
		const targetData = targetDataResolver
			? targetDataResolver()
			: getActiveContext()
		const currentChannelId =
			getSelectedChannelIdSafe() ||
			targetData.channelId ||
			targetData.message?.channel_id ||
			''

		let info: ExtractedMessageInfo | undefined

		if (targetData.message) {
			info = extractMessageInfo(
				targetData.message,
				currentChannelId,
				targetData.attachment,
			)
		} else if (targetData.user) {
			info = extractUserInfo(targetData.user, currentChannelId)
		} else {
			// Fallback: check MessageStore for current channel's last message
			const rev = getRevenge()
			const store =
				rev?.everest?.getMessageStore?.() ||
				rev?.modules?.finders?.lookupModule?.(
					rev?.modules?.finders?.filters?.withProps?.('getMessages'),
				)?.[0]
			if (currentChannelId && store?.getMessages) {
				const msgs = store.getMessages(currentChannelId)
				const list = msgs?.toArray
					? msgs.toArray()
					: msgs?._array || (Array.isArray(msgs) ? msgs : [])
				if (list.length > 0) {
					info = extractMessageInfo(
						list[list.length - 1],
						currentChannelId,
						targetData.attachment,
					)
				}
			}
			if (!info) {
				showToast('No message or user found to quote')
				return
			}
		}

		const s = getStoredSettings()
		const def = s.defaultSettings ?? defaultSettings.defaultSettings

		const generateAndHandle = async (action: 'send' | 'copy') => {
			showToast({ content: 'Generating quote...', variant: 'info' })

			const checkPromise = checkQuoteAllowed(
				info!.targetUserId,
				info!.hasSpoilers,
				false,
			)

			const cardPromise = generateQuoteCard({
				text: info!.text || '...',
				avatar: info!.avatarUrl,
				username: info!.username,
				display_name: info!.displayName,
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
				showToast({
					content:
						check.reason ||
						'This user has disallowed quotes of their messages.',
					variant: 'critical',
				})
				return
			}

			if (res.success && res.url) {
				const finalUrl = res.ziplineUrl || res.url
				if (action === 'send') {
					sendQuoteToChannel(currentChannelId, finalUrl)
					showToast({ content: 'Quote sent!', variant: 'success' })
				} else {
					copyToClipboard(finalUrl)
				}
			} else {
				showToast({
					content: res.error || 'Failed to generate quote',
					variant: 'critical',
				})
			}
		}

		if (s?.instantQuote !== false) {
			await generateAndHandle('send')
			return
		}

		// Non-instant mode: use Discord native Alert
		const rev = getRevenge()
		const Alert = rev?.react?.ReactNative?.Alert
		Alert?.alert(
			'Make it a Quote',
			`Quote by ${info.displayName || info.username}`,
			[
				{
					text: 'Send Quote',
					onPress: () => generateAndHandle('send'),
				},
				{
					text: 'Copy URL',
					onPress: () => generateAndHandle('copy'),
				},
				{ text: 'Cancel', style: 'cancel' },
			],
		)
	} catch (err) {
		console.error('[Quote] Auto-send quote failed:', err)
		showToast({ content: 'Failed to create quote', variant: 'critical' })
	}
}

function buildQuoteRow(targetDataResolver: () => TargetData): any {
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
		onPress: () => executeQuoteAction(targetDataResolver),
	})
}

function injectIntoActionGroups(
	actionGroups: any[],
	targetDataResolver: () => TargetData,
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

	const row = buildQuoteRow(targetDataResolver)
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
					c?.type?.displayName === 'ActionSheetRow' ||
					(typeof c?.props?.label === 'string' &&
						(typeof c?.props?.onPress === 'function' ||
							typeof c?.props?.action === 'function')),
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
							const user = props?.user || props?.userId || props?.member
							const attachment =
								props?.item || props?.attachment || props?.media
							const channelId =
								getSelectedChannelIdSafe() ||
								props?.channel?.id ||
								props?.channelId ||
								message?.channel_id

							updateActiveContext({ message, user, attachment, channelId })

							if (message) {
								if (!isSentMessage(message)) return
								if (
									message.type != null &&
									!USER_MESSAGE_TYPES.has(message.type)
								)
									return
								injectIntoActionGroups(actionGroups, getActiveContext)
							} else if (user || attachment) {
								injectIntoActionGroups(actionGroups, getActiveContext)
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

					// Never hook full UserProfile sheet / modal screens (only hook action sheets and overflow menus)
					if (
						/UserProfile(Modal|Sheet)?\d*$/i.test(strKey) &&
						!/overflow|action|context|menu/i.test(strKey)
					) {
						return args
					}

					const message =
						data?.message ||
						data?.channelMessage ||
						data?.targetMessage ||
						data?.item?.message ||
						data?.attachment?.message
					let user = data?.user || data?.userId || data?.member
					const userIdFromKey = strKey.match(
						/(?:UserProfile|UserActionSheet)(\d+)/i,
					)?.[1]
					if (!user && userIdFromKey) {
						user = userIdFromKey
					}

					const attachment = data?.item || data?.attachment || data?.media
					const channelId =
						getSelectedChannelIdSafe() ||
						data?.channel?.id ||
						data?.channelId ||
						message?.channel_id

					// FRESH UPDATE every time openLazy is called!
					activeTargetContext = {
						message: message || undefined,
						user: user || undefined,
						attachment: attachment || undefined,
						channelId,
					}

					const isMessage =
						Boolean(message) ||
						Boolean(attachment) ||
						/message|media|attachment|image/i.test(strKey)
					const isUser = Boolean(user) || /user|profile|overflow/i.test(strKey)

					if (!isMessage && !isUser) return args

					args[0] = componentPromise.then((instance: any) => {
						if (!instance) return instance

						const isMemo =
							typeof instance.default === 'object' && instance.default !== null
						const target = isMemo ? instance.default : instance
						const prop = isMemo ? 'type' : 'default'

						if (typeof target[prop] !== 'function') return instance
						if (instance.__quotePatched) return instance
						instance.__quotePatched = true

						// 1. Hook target[prop] BEFORE to capture props of THIS specific render
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
											const pUser =
												compProps.user ||
												compProps.userId ||
												compProps.member ||
												compProps.author
											const pAtt =
												compProps.item ||
												compProps.attachment ||
												compProps.media
											const pChan =
												getSelectedChannelIdSafe() ||
												compProps.channel?.id ||
												compProps.channelId ||
												pMsg?.channel_id

											updateActiveContext({
												message: pMsg,
												user: pUser,
												attachment: pAtt,
												channelId: pChan,
											})
										}
									} catch (e) {
										console.error('[Quote] sheet render before hook error:', e)
									}
									return compArgs
								},
							)
							patches.push(unpatchBefore)
						}

						// 2. Hook target[prop] AFTER to inject the quote row
						const unpatchTarget = patcher.after(target, prop, (comp: any) => {
							if (!comp) return comp

							try {
								const lateUser =
									comp?.props?.user ||
									comp?.props?.userId ||
									comp?.props?.member ||
									comp?.props?.author
								const lateMessage =
									comp?.props?.message || comp?.props?.channelMessage
								const lateAtt = comp?.props?.item || comp?.props?.attachment

								if (lateMessage || lateUser || lateAtt) {
									updateActiveContext({
										message: lateMessage,
										user: lateUser,
										attachment: lateAtt,
										channelId: getSelectedChannelIdSafe(),
									})
								}

								// 1. Options list (UserProfileOverflow / ContextMenu)
								const options =
									comp?.props?.options || comp?.props?.content?.props?.options
								if (Array.isArray(options)) {
									if (
										!options.some((o: any) => o?.label === 'Make it a Quote')
									) {
										options.push({
											label: 'Make it a Quote',
											onPress: () => executeQuoteAction(getActiveContext),
										})
									}
									return comp
								}

								// 2. Items list (UserProfileOverflowMenu)
								const items =
									comp?.props?.items || comp?.props?.children?.props?.items
								if (Array.isArray(items)) {
									const list = Array.isArray(items[0]) ? items[0] : items
									if (!list.some((o: any) => o?.label === 'Make it a Quote')) {
										list.push({
											label: 'Make it a Quote',
											action: () => executeQuoteAction(getActiveContext),
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
									injectIntoActionGroups(groups, getActiveContext)
									return comp
								}

								// 4. Recursive search children
								const children = searchChildren(comp)
								if (children && Array.isArray(children)) {
									injectIntoActionGroups(children, getActiveContext)
									return comp
								}

								// 5. Single group fallback
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
									const row = buildQuoteRow(getActiveContext)
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
						return instance
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
