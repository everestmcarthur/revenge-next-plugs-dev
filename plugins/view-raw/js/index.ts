import React from 'react'
import { discordModules } from '../../shared/discord-modules'
import RawPage from './ui/RawPage'
import Settings from './ui/Settings'

export default plugin({
	start(api) {
		const cleanups: Array<() => void> = []

		const getLazyActionSheet = () => {
			try {
				const mod = revenge.modules.metro.getInitializedModuleExports(
					discordModules['modules/action_sheet/native/ActionSheetActionCreators.tsx'],
				)
				if (mod?.openLazy || mod?.default?.openLazy) {
					return mod.default?.openLazy ? mod.default : mod
				}
			} catch {}
			const { filters, lookupModule } = revenge.modules.finders
			const matches = lookupModule(
				filters.withProps('openLazy', 'hideActionSheet'),
			)
			const m = Array.isArray(matches) ? matches[0] : matches
			return m?.default || m
		}

		const getNavigation = () => {
			const { filters, lookupModule } = revenge.modules.finders
			const matches = lookupModule(
				filters.withProps('push', 'pop', 'pushLazy'),
			)
			const m = Array.isArray(matches) ? matches[0] : matches
			return m?.default || m
		}

		const getNavigator = () => {
			try {
				const mod = revenge.modules.metro.getInitializedModuleExports(
					discordModules['design/components/Navigator/native/Navigator.native.tsx'],
				)
				if (mod?.Navigator) return mod.Navigator
			} catch {}
			const { filters, lookupModule } = revenge.modules.finders
			const matches = lookupModule(filters.withProps('Navigator'))
			const m = Array.isArray(matches) ? matches[0] : matches
			return m?.Navigator || m
		}

		const getModalCloseButton = () => {
			try {
				const mod = revenge.modules.metro.getInitializedModuleExports(
					discordModules['design/components/Navigator/native/NavigatorHeader.native.tsx'],
				)
				if (mod?.getHeaderCloseButton) return mod.getHeaderCloseButton
			} catch {}
			const { filters, lookupModule } = revenge.modules.finders
			const matches =
				lookupModule(filters.withProps('getHeaderCloseButton')) ||
				lookupModule(filters.withProps('getRenderCloseButton'))
			const m = Array.isArray(matches) ? matches[0] : matches
			return m?.getHeaderCloseButton || m?.getRenderCloseButton
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

		// Hook LazyActionSheet.openLazy
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
								key === 'MessageLongPressActionSheet' &&
								data?.message &&
								componentPromise?.then
							) {
								const activeMsg = data.message

								componentPromise.then((instance: any) => {
									if (!instance || instance.__viewRawPatched) return
									instance.__viewRawPatched = true

									const unpatchDefault = revenge.patcher.after(
										instance,
										'default',
										(comp: any) => {
											if (!comp) return comp

											try {
												const children = searchChildren(comp)
												if (!children) return comp

												const alreadyHas = children.some(
													(c: any) =>
														c?.key === 'view-raw' ||
														c?.props?.label === 'View Raw',
												)
												if (alreadyHas) return comp

												const ActionSheetRow =
													revenge.discord.design.Design?.ActionSheetRow
												const bubbleAssetId =
													revenge.assets?.getAssetIdByName?.(
														'ic_chat_bubble_32px',
													) ??
													revenge.assets?.getAssetIdByName?.('ic_message_copy')

												const icon =
													ActionSheetRow?.Icon && bubbleAssetId
														? React.createElement(ActionSheetRow.Icon, {
																source: bubbleAssetId,
															})
														: undefined

												const rawBtn = React.createElement(
													ActionSheetRow || 'View',
													{
														key: 'view-raw',
														label: 'View Raw',
														icon,
														onPress: () => openRawPage(activeMsg),
													},
												)

												children.push(rawBtn)
											} catch (e) {
												api.logger.error(
													`[ViewRaw] Error injecting button: ${e}`,
												)
											}

											return comp
										},
									)
									cleanups.push(unpatchDefault)
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
							if (args.message_id) {
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

				cleanups.push(() => {
					clientUtils.unregisterCommand('viewraw')
				})
			}
		} catch (err) {
			api.logger.warn(`[ViewRaw] Could not register slash command: ${err}`)
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
