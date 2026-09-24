import { copyToClipboard, showToast } from '../shared'
import { discordModules } from '../../../shared/discord-modules'
import type { RoseUtilsSettings } from '../types'

export function initCopyRoleColor(settings: RoseUtilsSettings): () => void {
	if (!settings.copyRoleColor) return () => {}

	const cleanups: (() => void)[] = []
	let activeRole: any = null

	try {
		const r = (globalThis as any).__r
		const rolesCardId = discordModules['modules/user_profile/native/UserProfileRolesCard.tsx']
		const simpleSheetId = discordModules['modules/action_sheet/native/showSimpleActionSheet.tsx']

		const rolesCardMod = r?.(rolesCardId)
		const simpleSheetMod = r?.(simpleSheetId)

		if (rolesCardMod?.RoleItem) {
			const unpatchRoleItem = revenge.patcher.before(rolesCardMod, 'RoleItem', (args: any) => {
				try {
					const role = args[0]?.role
					if (role) activeRole = role
				} catch {}
				return args
			})
			cleanups.push(unpatchRoleItem)
		}

		if (simpleSheetMod?.showSimpleActionSheet) {
			const unpatchSheet = revenge.patcher.before(simpleSheetMod, 'showSimpleActionSheet', (args: any) => {
				try {
					const sheet = args[0]
					if (sheet && Array.isArray(sheet.options)) {
						const isRoleMenu = sheet.options.some((o: any) =>
							/copy.*role.*id|copy.*id/i.test(o?.label || o?.text || o?.title || '')
						)
						if (isRoleMenu) {
							sheet.options.push({
								label: 'Copy Role Color',
								text: 'Copy Role Color',
								onPress: () => {
									let hex = activeRole?.colorString
									if (!hex && activeRole?.color) {
										hex = '#' + activeRole.color.toString(16).padStart(6, '0')
									}
									if (!hex) hex = '#ffffff'
									copyToClipboard(hex)
									showToast(`Copied role color: ${hex}`)
								},
							})
						}
					}
				} catch {}
				return args
			})
			cleanups.push(unpatchSheet)
		}
	} catch {}

	return () => {
		for (const fn of cleanups) fn()
	}
}
