import React from 'react'
import RawPage from './ui/RawPage'
import Settings from './ui/Settings'
import { findByImportedPath } from '../../shared/finders'

export default plugin({
	start(api) {
		const cleanups: Array<() => void> = []

		const everest = (globalThis as any).__everest ?? (revenge as any)?.everest
		everest?.setActivePlugin?.(api.plugin.manifest.id)
		everest?.registerPlugin?.({
			id: api.plugin.manifest.id,
			name: api.plugin.manifest.name,
			icon: api.plugin.manifest.icon,
			author: api.plugin.manifest.author,
			description: api.plugin.manifest.description,
			version: api.plugin.manifest.version,
			getStatus: () => api.plugin.status,
			getErrors: () => api.plugin.errors,
		})

		const getLazyActionSheet = () => {
			const imported = findByImportedPath('modules/action_sheet/native/ActionSheetActionCreators.tsx')
			if (imported?.openLazy || imported?.default?.openLazy) {
				return imported.default?.openLazy ? imported.default : imported
			}
			const { filters, lookupModule } = revenge.modules.finders
			const matches = lookupModule(
				filters.withProps('openLazy', 'hideActionSheet'),
			)
			const m = Array.isArray(matches) ? matches[0] : matches
			return m?.default || m
		}

		const getNavigation = () => {
			if (typeof everest?.getNavigation === 'function') {
				return everest.getNavigation()
			}
			const imported = findByImportedPath('actions/ModalActionCreators.tsx')
			if (imported?.push || imported?.default?.push) {
				return imported.default?.push ? imported.default : imported
			}
			const { filters, lookupModule } = revenge.modules.finders
			const matches = lookupModule(
				filters.withProps('push', 'pop', 'pushLazy'),
			)
			const m = Array.isArray(matches) ? matches[0] : matches
			return m?.default || m
		}

		const getNavigator = () => {
			if (typeof everest?.getNavigator === 'function') {
				return everest.getNavigator()
			}
			const imported = findByImportedPath('design/components/Navigator/native/Navigator.native.tsx')
			if (imported?.Navigator) return imported.Navigator
			if (imported?.default?.Navigator) return imported.default.Navigator
			const { filters, lookupModule } = revenge.modules.finders
			const matches = lookupModule(filters.withProps('Navigator'))
			const m = Array.isArray(matches) ? matches[0] : matches
			return m?.Navigator || m
		}

		const getModalCloseButton = () => {
			if (typeof everest?.getModalCloseButton === 'function') {
				return everest.getModalCloseButton()
			}
			const imported = findByImportedPath('design/components/Navigator/native/NavigatorHeader.native.tsx')
			if (imported?.getHeaderCloseButton) return imported.getHeaderCloseButton
			if (imported?.default?.getHeaderCloseButton) return imported.default.getHeaderCloseButton
			const { filters, lookupModule } = revenge.modules.finders
			const matches =
				lookupModule(filters.withProps('getHeaderCloseButton')) ||
				lookupModule(filters.withProps('getRenderCloseButton'))
			const m = Array.isArray(matches) ? matches[0] : matches
			return m?.getHeaderCloseButton || m?.getRenderCloseButton
		}

		const getActionSheetRow = () => {
			return (
				revenge.discord?.design?.Design?.ActionSheetRow ||
				revenge.modules?.finders?.lookupModule?.(
					revenge.modules.finders.filters.withProps('ActionSheetRow'),
				)?.[0]?.ActionSheetRow
			)
		}

		const openRawPage = (msg: any) => {
			const lazySheet = getLazyActionSheet()
			try {
				lazySheet?.hideActionSheet?.()
			} catch {}

			const Navigation = getNavigation()
			const Navigator = getNavigator()
			const closeButton = getModalCloseButton()

			if (Navigation?.push && Navigator) {
				try {
					Navigation.push(() =>
						React.createElement(Navigator, {
							initialRouteName: 'RawPage',
							goBackOnBackPress: true,
							screens: {
								RawPage: {
									title: 'ViewRaw',
									headerLeft: closeButton
										? closeButton(() => Navigation.pop())
										: undefined,
									render: () => React.createElement(RawPage, { message: msg }),
								},
							},
						}),
					)
					return
				} catch (e) {
					api.logger.warn(`[ViewRaw] Navigation.push error: ${e}`)
				}
			}
		}

		const createRawButton = (msg: any) => {
			const ActionSheetRow = getActionSheetRow()
			const bubbleAssetId =
				revenge.assets?.getAssetIdByName?.('ic_chat_bubble_32px') ??
				revenge.assets?.getAssetIdByName?.('ic_message_copy')

			const icon =
				ActionSheetRow?.Icon && bubbleAssetId
					? React.createElement(ActionSheetRow.Icon, {
							source: bubbleAssetId,
					  })
					: undefined

			return React.createElement(
				ActionSheetRow || 'View',
				{
					key: 'view-raw',
					label: 'View Raw',
					icon,
					onPress: () => openRawPage(msg),
				},
			)
		}

		const injectIntoActionGroups = (actionGroups: any[], msg: any) => {
			if (!Array.isArray(actionGroups) || actionGroups.length === 0) return false

			// Check if any element in actionGroups already has view-raw
			const hasButton = actionGroups.some(
				(item: any) =>
					item?.key === 'view-raw' ||
					(Array.isArray(item?.props?.children) &&
						item.props.children.some((c: any) => c?.key === 'view-raw')),
			)
			if (hasButton) return true

			const btn = createRawButton(msg)

			// Strategy A: If actionGroups contains groups whose props.children is an array
			for (const group of actionGroups) {
				if (Array.isArray(group?.props?.children)) {
					group.props.children.push(btn)
					return true
				}
			}

			// Strategy B: If actionGroups is an array of row elements directly
			const hasRowProps = actionGroups.some(
				(el: any) => typeof el?.props?.label === 'string' || typeof el?.props?.onPress === 'function',
			)
			if (hasRowProps) {
				actionGroups.push(btn)
				return true
			}

			// Strategy C: If ActionSheetRow.Group exists, append a new Group
			const ActionSheetRow = getActionSheetRow()
			if (ActionSheetRow?.Group) {
				actionGroups.push(
					React.createElement(ActionSheetRow.Group, { key: 'view-raw-group' }, btn),
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
							typeof c?.props?.label === 'string',
					)
					if (hasRow) return node.props.children
				}
				return searchChildren(node.props.children)
			}
			return null
		}

		// Method 1: Register via revenge.tralwdwdd.ActionSheetPatcher if available
		try {
			const tralwdwddPatcher = (revenge as any)?.tralwdwdd?.ActionSheetPatcher
			if (typeof tralwdwddPatcher?.registerActionSheetPatch === 'function') {
				const unsub = tralwdwddPatcher.registerActionSheetPatch(
					'MessageLongPressActionSheet',
					(actionGroups: any, props: any) => {
						try {
							if (props?.message) {
								injectIntoActionGroups(actionGroups, props.message)
							}
						} catch (e) {
							api.logger.error(`[ViewRaw] tralwdwdd patch error: ${e}`)
						}
					},
				)
				if (typeof unsub === 'function') cleanups.push(unsub)
			}
		} catch (e) {
			api.logger.warn(`[ViewRaw] tralwdwdd patcher not available: ${e}`)
		}

		// Method 2: Direct hook on ActionSheetActionCreators.openLazy
		try {
			const LazyActionSheet = getLazyActionSheet()
			if (LazyActionSheet && typeof LazyActionSheet.openLazy === 'function') {
				const unpatchOpenLazy = revenge.patcher.before(
					LazyActionSheet,
					'openLazy',
					(args: any[]) => {
						try {
							const componentPromise = args?.[0]
							const key = args?.[1]
							const data = args?.[2]

							if (
								(key === 'MessageLongPressActionSheet' || (data?.message && !String(key).includes('User'))) &&
								data?.message &&
								componentPromise?.then
							) {
								const activeMsg = data.message

								componentPromise.then((instance: any) => {
									if (!instance || instance.__viewRawPatched) return
									instance.__viewRawPatched = true

									const isMemo = typeof instance.default === 'object' && instance.default !== null
									const target = isMemo ? instance.default : instance
									const prop = isMemo ? 'type' : 'default'

									const unpatchTarget = revenge.patcher.after(
										target,
										prop,
										(comp: any) => {
											if (!comp) return comp

											try {
												// Try finding action groups in tree
												const groups = revenge.utils?.tree?.findInTree?.(
													comp,
													(x: any) =>
														Array.isArray(x) &&
														x.length > 0 &&
														(x[0]?.type?.name === 'ActionSheetRowGroup' ||
															x.some((c: any) => typeof c?.props?.label === 'string')),
												)
												if (Array.isArray(groups)) {
													injectIntoActionGroups(groups, activeMsg)
													return comp
												}

												const children = searchChildren(comp)
												if (children) {
													injectIntoActionGroups(children, activeMsg)
												}
											} catch (e) {
												api.logger.error(
													`[ViewRaw] Error injecting button: ${e}`,
												)
											}

											return comp
										},
									)
									cleanups.push(unpatchTarget)
								})
							}
						} catch (e) {
							api.logger.error(`[ViewRaw] Error in openLazy before: ${e}`)
						}

						return args
					},
				)
				cleanups.push(unpatchOpenLazy)
			}
		} catch (e) {
			api.logger.error(`[ViewRaw] Failed to hook openLazy: ${e}`)
		}

		// Register Client Utils slash command if present
		const registerViewRawCommand = () => {
			try {
				const clientUtils =
					(revenge as any)?.plugins?.clientUtils ??
					(globalThis as any).__c_utils
				if (clientUtils?.registerCommand) {
					clientUtils.registerCommand(
						{
							name: 'viewraw',
							displayName: 'viewraw',
							description: 'Inspect raw Discord JSON payload of a message',
							options: [
								{
									type: 3, // String
									name: 'message_id',
									displayName: 'message_id',
									description: 'ID of the message to inspect (defaults to last message)',
									required: false,
								},
							],
							execute: async (args: any, ctx: any) => {
								const { filters, lookupModule } = revenge.modules.finders
								const msgStoreMod = lookupModule(
									filters.withProps('getMessages', 'getMessage'),
								)
								const msgStore = Array.isArray(msgStoreMod)
									? msgStoreMod[0]
									: msgStoreMod

								let targetMsg: any
								if (args?.message_id) {
									targetMsg = msgStore?.getMessage?.(
										ctx.channelId,
										args.message_id,
									)
								} else {
									const channelMessages = msgStore
										?.getMessages?.(ctx.channelId)
										?.toArray?.()
									targetMsg = channelMessages?.[channelMessages.length - 1]
								}

								if (!targetMsg) {
									return ctx.reply({
										ephemeral: true,
										content:
											'❌ Could not locate message in current channel cache.',
									})
								}

								openRawPage(targetMsg)
								ctx.reply({
									ephemeral: true,
									content: `🔍 Opened raw inspector for message \`${targetMsg.id}\`.`,
								})
							},
						},
						{
							id: 'dev.everestmcarthur.view-raw',
							name: 'ViewRaw',
							description: 'Raw Discord message payload inspector',
						},
					)
					return true
				}
			} catch (err) {
				api.logger.warn(`[ViewRaw] Could not register slash command: ${err}`)
			}
			return false
		}

		if (!registerViewRawCommand()) {
			const interval = setInterval(() => {
				if (registerViewRawCommand()) {
					clearInterval(interval)
				}
			}, 1000)
			cleanups.push(() => {
				clearInterval(interval)
				const clientUtils =
					(revenge as any)?.plugins?.clientUtils ??
					(globalThis as any).__c_utils
				clientUtils?.unregisterCommand?.('viewraw')
			})
		} else {
			cleanups.push(() => {
				const clientUtils =
					(revenge as any)?.plugins?.clientUtils ??
					(globalThis as any).__c_utils
				clientUtils?.unregisterCommand?.('viewraw')
			})
		}

		api.cleanup(() => {
			for (const fn of cleanups) {
				try {
					fn()
				} catch {}
			}
		})
	},

	SettingsComponent: Settings,
})
