import { findByImportedPath } from '../../shared/finders'
import { getFinders, getMod } from './stores'
import { buildAllSections } from './registry'

export function setupCacheHooks({
	cleanup,
	logger,
}: {
	cleanup: (fn: () => void) => void
	logger: any
}) {
	const filters = getFinders()?.filters

	try {
		const importedCache = findByImportedPath('modules/chat_input/native/accessories/ApplicationCommandQueryApi.tsx')
		const CacheMod =
			importedCache?.default ||
			importedCache ||
			getMod(filters?.withProps('useDiscovery', 'getCachedResults'))

		if (CacheMod) {
			const origUseDiscovery = CacheMod.useDiscovery
			const origUseCachedResults = CacheMod.useCachedResults
			const origUseQuery = CacheMod.useQuery
			const origGetCached = CacheMod.getCachedResults
			const origGetCachedSection = CacheMod.getCachedApplicationSection
			const origGetCachedCmd = CacheMod.getCachedCommand

			if (origUseDiscovery) {
				CacheMod.useDiscovery = function () {
					const res = origUseDiscovery ? origUseDiscovery.apply(this, arguments) : { commands: [], sections: [] }
					try {
						const { allSections, allCommands } = buildAllSections()
						const myDescs = allSections.map((s: any) => s.descriptor)
						const existingDescs = Array.isArray(res.sectionDescriptors)
							? res.sectionDescriptors.filter((d: any) => !d?.id?.startsWith?.('999'))
							: []
						const combinedDescs = [...myDescs, ...existingDescs]
						res.sectionDescriptors = combinedDescs

						const filterId = res.filteredSectionId
						if (filterId) {
							if (typeof filterId === 'string' && filterId.startsWith('999')) {
								const selectedSec = allSections.find((s: any) => s.id === filterId)
								if (selectedSec) {
									res.commandsByActiveSection = [
										{
											section: selectedSec.descriptor,
											data: selectedSec.commands,
										},
									]
									res.activeSections = [selectedSec.descriptor]
									res.commands = [...selectedSec.commands]
								}
							} else {
								if (Array.isArray(res.commandsByActiveSection)) {
									res.commandsByActiveSection = res.commandsByActiveSection.filter(
										(g: any) => !g.section?.id?.startsWith?.('999'),
									)
								}
								if (Array.isArray(res.activeSections)) {
									res.activeSections = res.activeSections.filter(
										(d: any) => !d?.id?.startsWith?.('999'),
									)
								}
								if (Array.isArray(res.commands)) {
									res.commands = res.commands.filter(
										(c: any) => !c?.id?.startsWith?.('999'),
									)
								}
							}
						} else {
							const existingGroups = Array.isArray(res.commandsByActiveSection)
								? res.commandsByActiveSection.filter((g: any) => !g.section?.id?.startsWith?.('999'))
								: []
							const myGroups = allSections.map((s: any) => ({
								section: s.descriptor,
								data: s.commands,
							}))
							res.commandsByActiveSection = [...myGroups, ...existingGroups]

							const existingActive = Array.isArray(res.activeSections)
								? res.activeSections.filter((d: any) => !d?.id?.startsWith?.('999'))
								: []
							res.activeSections = [...myDescs, ...existingActive]

							const existingCmds = Array.isArray(res.commands)
								? res.commands.filter((c: any) => !c?.id?.startsWith?.('999'))
								: []
							res.commands = [...allCommands, ...existingCmds]
						}
					} catch {}
					return res
				}
			}

			if (origUseCachedResults) {
				CacheMod.useCachedResults = function (arg0: any, CHAT: any, text: any) {
					const res = origUseCachedResults
						? origUseCachedResults.apply(this, arguments)
						: { commands: [], sections: [] }
					try {
						const { allSections, allCommands } = buildAllSections()
						const q = (text || '').toLowerCase().trim()
						const matching = allCommands.filter(
							(c: any) => !q || c.name.toLowerCase().includes(q) || c.displayName?.toLowerCase().includes(q),
						)
						if (matching.length > 0) {
							const matchingSecIds = new Set(matching.map((c: any) => c.applicationId))
							const matchingSections = allSections
								.filter((s: any) => matchingSecIds.has(s.id))
								.map((s: any) => s.descriptor)
							const cList = Array.isArray(res.commands) ? res.commands : []
							const sList = Array.isArray(res.sections) ? res.sections : []
							return {
								commands: [...matching, ...cList.filter((c: any) => !c.id?.startsWith('999'))],
								sections: [...matchingSections, ...sList.filter((s: any) => !s.id?.startsWith('999'))],
							}
						}
					} catch {}
					return res
				}
			}

			if (origUseQuery) {
				CacheMod.useQuery = function (context: any, obj: any, options: any) {
					const res = origUseQuery
						? origUseQuery.apply(this, arguments)
						: { commands: [], descriptors: [] }
					try {
						const { allSections, allCommands } = buildAllSections()
						const targetAppId = options?.applicationId || obj?.applicationId
						if (targetAppId) {
							if (typeof targetAppId === 'string' && targetAppId.startsWith('999')) {
								const q = (obj?.text || '').toLowerCase().trim()
								const matching = allCommands.filter(
									(c: any) =>
										c.applicationId === targetAppId &&
										(!q ||
											c.name.toLowerCase().includes(q) ||
											c.displayName?.toLowerCase().includes(q)),
								)
								const matchingSec = allSections.find((s: any) => s.id === targetAppId)
								return {
									commands: matching,
									descriptors: matchingSec ? [matchingSec.descriptor] : [],
								}
							}
							return res
						}
						const q = (obj?.text || '').toLowerCase().trim()
						const matching = allCommands.filter(
							(c: any) => !q || c.name.toLowerCase().includes(q) || c.displayName?.toLowerCase().includes(q),
						)
						if (matching.length > 0) {
							const matchingSecIds = new Set(matching.map((c: any) => c.applicationId))
							const matchingDescriptors = allSections
								.filter((s: any) => matchingSecIds.has(s.id))
								.map((s: any) => s.descriptor)
							const cList = Array.isArray(res.commands) ? res.commands : []
							const dList = Array.isArray(res.descriptors) ? res.descriptors : []
							return {
								commands: [...matching, ...cList.filter((c: any) => !c.id?.startsWith('999'))],
								descriptors: [
									...matchingDescriptors,
									...dList.filter((d: any) => !d.id?.startsWith('999')),
								],
							}
						}
					} catch {}
					return res
				}
			}

			CacheMod.getCachedResults = function (state: any, CHAT: any, query: any) {
				const orig = origGetCached ? origGetCached.apply(this, arguments) : { commands: [], sections: [] }
				const { allSections, allCommands } = buildAllSections()

				const qStr = typeof query === 'string' ? query : typeof CHAT === 'string' ? CHAT : ''
				const lq = qStr.toLowerCase().trim()

				const matching = allCommands.filter(
					(c: any) =>
						!lq ||
						c.name.toLowerCase().includes(lq) ||
						c.displayName?.toLowerCase().includes(lq),
				)

				if (matching.length === 0) {
					return orig
				}

				const matchingSecIds = new Set(matching.map((c: any) => c.applicationId))
				const matchingSections = allSections
					.filter((s: any) => matchingSecIds.has(s.id))
					.map((s: any) => s.descriptor)

				const origCmds = Array.isArray(orig?.commands) ? orig.commands : []
				const origSections = Array.isArray(orig?.sections) ? orig.sections : []

				return {
					commands: [...matching, ...origCmds.filter((c: any) => !c.id?.startsWith('999'))],
					sections: [...matchingSections, ...origSections.filter((s: any) => !s.id?.startsWith('999'))],
				}
			}

			CacheMod.getCachedApplicationSection = function (type: any, CHAT: any, appId: string) {
				if (typeof appId === 'string' && appId.startsWith('999')) {
					const { allSections } = buildAllSections()
					const found = allSections.find((s: any) => s.id === appId)
					if (found) return found.descriptor
				}
				return origGetCachedSection?.apply(this, arguments)
			}

			CacheMod.getCachedCommand = function (type: any, cmdId: string, appId: string) {
				if (typeof cmdId === 'string' && cmdId.startsWith('999')) {
					const { allSections, allCommands } = buildAllSections()
					const foundCmd = allCommands.find((c: any) => c.id === cmdId)
					if (foundCmd) {
						const foundSec = allSections.find((s: any) => s.id === foundCmd.applicationId)
						return {
							application: foundSec?.descriptor?.application,
							command: foundCmd,
							section: foundSec?.descriptor,
						}
					}
				}
				return origGetCachedCmd?.apply(this, arguments)
			}

			if (CacheMod.useCommandsForApplication) {
				const origUseCmds = CacheMod.useCommandsForApplication
				CacheMod.useCommandsForApplication = function (context: any, appId: string, options: any) {
					if (typeof appId === 'string' && appId.startsWith('999')) {
						const { allSections } = buildAllSections()
						const sec = allSections.find((s: any) => s.id === appId)
						return sec?.commands || []
					}
					return origUseCmds ? origUseCmds.apply(this, arguments) : []
				}
			}

			if (CacheMod.useAccessibleCommandsForApplication) {
				const origUseAccCmds = CacheMod.useAccessibleCommandsForApplication
				CacheMod.useAccessibleCommandsForApplication = function (channel: any, appId: string, options: any) {
					if (typeof appId === 'string' && appId.startsWith('999')) {
						const { allSections } = buildAllSections()
						const sec = allSections.find((s: any) => s.id === appId)
						return sec?.commands || []
					}
					return origUseAccCmds ? origUseAccCmds.apply(this, arguments) : []
				}
			}

			cleanup(() => {
				if (CacheMod) {
					if (origGetCached) CacheMod.getCachedResults = origGetCached
					if (origGetCachedSection) CacheMod.getCachedApplicationSection = origGetCachedSection
					if (origGetCachedCmd) CacheMod.getCachedCommand = origGetCachedCmd
					if (origUseDiscovery) CacheMod.useDiscovery = origUseDiscovery
					if (origUseCachedResults) CacheMod.useCachedResults = origUseCachedResults
					if (origUseQuery) CacheMod.useQuery = origUseQuery
				}
			})
		}
	} catch (err) {
		logger.error(`[ClientUtils] Failed to hook CacheMod: ${err}`)
	}
}
export { setupCacheHooks as default }
