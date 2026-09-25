import {
	getFinders,
	getMod,
	getApplicationStore,
	getCurrentUserSafe,
	getInitialsAvatar,
	getIndexStore,
} from './stores'
import { buildAllSections } from './registry'

export function setupStoreHooks({
	cleanup,
	logger,
}: {
	cleanup: (fn: () => void) => void
	logger: any
}) {
	const filters = getFinders()?.filters
	const IndexStore = getIndexStore()

	let origQuery: any
	let origGetContextState: any
	let origGetUserState: any

	try {
		if (IndexStore) {
			origQuery = IndexStore.query
			origGetContextState = IndexStore.getContextState
			origGetUserState = IndexStore.getUserState

			IndexStore.query = function (withAffinitySuggestions: any, commandTypes: any, applicationId: any) {
				const res = origQuery ? origQuery.apply(this, arguments) : { commands: [], descriptors: [] }
				const { allSections, allCommands } = buildAllSections()
				let qText = ''
				for (let i = 0; i < arguments.length; i++) {
					const arg = arguments[i]
					if (typeof arg === 'string') {
						qText = arg.toLowerCase().trim()
						break
					} else if (arg && typeof arg === 'object' && typeof arg.text === 'string') {
						qText = arg.text.toLowerCase().trim()
						break
					}
				}

				const targetAppId =
					(applicationId && typeof applicationId === 'object' && applicationId.applicationId) ||
					(commandTypes && typeof commandTypes === 'object' && commandTypes.applicationId) ||
					(typeof applicationId === 'string' ? applicationId : null)

				if (targetAppId) {
					if (typeof targetAppId === 'string' && targetAppId.startsWith('999')) {
						const matching = allCommands.filter(
							(c: any) =>
								c.applicationId === targetAppId &&
								(!qText ||
									c.name.toLowerCase().includes(qText) ||
									c.displayName?.toLowerCase().includes(qText)),
						)
						const matchingSec = allSections.find((s: any) => s.id === targetAppId)
						return {
							...res,
							commands: matching,
							descriptors: matchingSec ? [matchingSec.descriptor] : [],
						}
					}
					return res
				}

				const matching = allCommands.filter(
					(c: any) =>
						!qText ||
						c.name.toLowerCase().includes(qText) ||
						c.displayName?.toLowerCase().includes(qText),
				)

				if (matching.length === 0) return res

				const matchingSecIds = new Set(matching.map((c: any) => c.applicationId))
				const matchingDescriptors = allSections
					.filter((s: any) => matchingSecIds.has(s.id))
					.map((s: any) => s.descriptor)

				const existingCmds = Array.isArray(res?.commands)
					? res.commands.filter((c: any) => !c?.id?.startsWith?.('999'))
					: []
				const existingDescs = Array.isArray(res?.descriptors)
					? res.descriptors.filter((d: any) => !d?.id?.startsWith?.('999'))
					: []

				return {
					...res,
					commands: [...existingCmds, ...matching],
					descriptors: [...existingDescs, ...matchingDescriptors],
				}
			}

			IndexStore.getContextState = function (type: any) {
				const res = origGetContextState ? origGetContextState.apply(this, arguments) : undefined
				if (res?.result) {
					const { allSections } = buildAllSections()
					if (!res.result.sections) res.result.sections = {}
					if (!res.result.commands) res.result.commands = {}
					allSections.forEach((sec: any) => {
						res.result.sections[sec.id] = { descriptor: sec.descriptor, commands: sec.commandsMap }
						sec.commands.forEach((c: any) => {
							res.result.commands[c.id] = c
						})
					})
				}
				return res
			}

			IndexStore.getUserState = function () {
				const res = origGetUserState ? origGetUserState.apply(this, arguments) : undefined
				if (res?.result) {
					const { allSections } = buildAllSections()
					if (!res.result.sections) res.result.sections = {}
					if (!res.result.commands) res.result.commands = {}
					allSections.forEach((sec: any) => {
						res.result.sections[sec.id] = { descriptor: sec.descriptor, commands: sec.commandsMap }
						sec.commands.forEach((c: any) => {
							res.result.commands[c.id] = c
						})
					})
				}
				return res
			}

			cleanup(() => {
				if (IndexStore) {
					if (origQuery) IndexStore.query = origQuery
					if (origGetContextState) IndexStore.getContextState = origGetContextState
					if (origGetUserState) IndexStore.getUserState = origGetUserState
				}
			})
		}
	} catch (err) {
		logger.error(`[ClientUtils] Failed to hook IndexStore: ${err}`)
	}

	let origGetApp: any
	let appStoreTarget: any
	exportHookApplicationStore()

	function exportHookApplicationStore() {
		try {
			const appStore = getApplicationStore()
			if (!appStore) return
			const proto = Object.getPrototypeOf(appStore)
			const target = typeof proto?.getApplication === 'function' ? proto : appStore
			if (target && typeof target.getApplication === 'function' && !target.getApplication.__cu_hooked) {
				origGetApp = target.getApplication
				appStoreTarget = target
				const hooked = function (appId: string) {
					if (typeof appId === 'string' && appId.startsWith('999')) {
						const { allSections } = buildAllSections()
						const foundSec = allSections.find((s: any) => s.id === appId)
						if (foundSec) return foundSec.descriptor.application
						const currentUser = getCurrentUserSafe()
						const avatar = currentUser?.avatar || '858e9559e7ec01b194a2750ad12ab57e'
						return {
							id: appId,
							name: 'Custom Plugin',
							icon: avatar,
							description: 'Custom client-side slash command utilities',
							bot: {
								id: appId,
								username: 'Custom Plugin',
								avatar: avatar,
								discriminator: '0000',
								bot: true,
							},
							flags: 0n,
							isVerified: true,
						}
					}
					return origGetApp ? origGetApp.apply(this, arguments) : undefined
				}
				hooked.__cu_hooked = true
				target.getApplication = hooked
			}
		} catch (err) {
			logger.error(`[ClientUtils] Failed to hook ApplicationStore: ${err}`)
		}
	}

	cleanup(() => {
		if (appStoreTarget && origGetApp) {
			appStoreTarget.getApplication = origGetApp
		}
	})

	try {
		const IconMod = getMod(filters?.withProps('getApplicationIconSource'))
		if (IconMod) {
			const unpatchSrc = revenge.patcher.instead(IconMod, 'getApplicationIconSource', (args: any, orig: any) => {
				const [app] = args
				const appId = app?.id || app?.applicationId || (typeof app === 'string' ? app : null)
				if (typeof appId === 'string' && appId.startsWith('999')) {
					const { allSections } = buildAllSections()
					const sec = allSections.find((s: any) => s.id === appId)
					const icon = sec?.descriptor?.icon
					if (icon && typeof icon === 'string' && icon.startsWith('http')) return { uri: icon }
					const sectionName = sec?.name || app?.name || 'Client Utils'
					return { uri: getInitialsAvatar(sectionName) }
				}
				return orig.apply(IconMod, args)
			})
			cleanup(unpatchSrc)

			const unpatchUrl = revenge.patcher.instead(IconMod, 'getApplicationIconURL', (args: any, orig: any) => {
				const [app] = args
				const appId = app?.id || app?.applicationId || (typeof app === 'string' ? app : null)
				if (typeof appId === 'string' && appId.startsWith('999')) {
					const { allSections } = buildAllSections()
					const sec = allSections.find((s: any) => s.id === appId)
					const icon = sec?.descriptor?.icon
					if (icon && typeof icon === 'string' && icon.startsWith('http')) return icon
					const sectionName = sec?.name || app?.name || 'Client Utils'
					return getInitialsAvatar(sectionName)
				}
				return orig.apply(IconMod, args)
			})
			cleanup(unpatchUrl)

			if (typeof IconMod.getUserAvatarSource === 'function') {
				const unpatchUserAvatarSrc = revenge.patcher.instead(IconMod, 'getUserAvatarSource', (args: any, orig: any) => {
					const user = args[0]
					if (typeof user?.avatar === 'string' && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://'))) {
						return { uri: user.avatar }
					}
					return orig.apply(IconMod, args)
				})
				cleanup(unpatchUserAvatarSrc)
			}

			if (typeof IconMod.getUserAvatarURL === 'function') {
				const unpatchUserAvatarUrl = revenge.patcher.instead(IconMod, 'getUserAvatarURL', (args: any, orig: any) => {
					const user = args[0]
					if (typeof user?.avatar === 'string' && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://'))) {
						return user.avatar
					}
					return orig.apply(IconMod, args)
				})
				cleanup(unpatchUserAvatarUrl)
			}
		}
	} catch (err) {
		logger.error(`[ClientUtils] Failed to hook IconMod: ${err}`)
	}
}
export { setupStoreHooks as default }
