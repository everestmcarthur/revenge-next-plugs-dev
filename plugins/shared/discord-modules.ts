// Shared Discord module ID store for plugins.
// Features smart dynamic resolution: queries Discord's live imported path registry
// at runtime, completely avoiding breakage when Metro module IDs shift across builds.

export const discordBuild = 348203

export const rawDiscordModules = {
	'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx': 16820,
	'modules/main_tabs_v2/native/you_bar/YouBarBackground.tsx': 16810,
	'modules/main_tabs_v2/native/you_bar/YouBarNameplate.tsx': 16811,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatarDefault.tsx': 16813,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatar.tsx': 16814,
	'modules/main_tabs_v2/native/you_bar/YouBarName.tsx': 16815,
	'modules/main_tabs_v2/native/you_bar/YouBarUser.tsx': 16812,
	'modules/main_tabs_v2/native/you_bar/YouBarButton.tsx': 16819,
	'modules/main_tabs_v2/native/you_bar/YouBarConstants.tsx': 15434,
	'modules/main_tabs_v2/native/you_bar/YouBarActivityStatusExperiment.tsx': 16794,
	'modules/main_tabs_v2/native/you_bar/YouBar.tsx': 16790,
	'modules/user_profile/native/showUserProfileActionSheet.tsx': 8527,
	'modules/user_profile/native/YouScreenUserProfileContent.tsx': 17371,
	'modules/main_tabs_v2/native/tabs/you/YouScreen.tsx': 17354,
	'modules/guilds_bar/native/GuildsBarMessages.tsx': 16734,
	'modules/guilds_bar/native/hooks/useGuildsBarProps.tsx': 16718,
	'modules/guilds_bar/native/GuildsBar.tsx': 16709,
	'modules/application_commands/ApplicationCommandQueryApi.tsx': 9613,
	'modules/application_commands/ApplicationCommandBuiltIns.tsx': 9495,
	'modules/chat_input/native/accessories/ChatInputSendUtils.tsx': 12339,
	'utils/AvatarUtils.tsx': 1397,
	'modules/action_sheet/native/ActionSheetActionCreators.tsx': 4796,
	'modules/action_sheet/native/ActionSheetStore.tsx': 4516,
	'modules/action_sheet/native/showSimpleActionSheet.tsx': 7527,
	'design/components/Sheet/native/showSimpleActionSheet.native.tsx': 7528,
	'design/components/Sheet/native/SimpleActionSheet.native.tsx': 7529,
	'design/components/Sheet/native/ActionSheet.native.tsx': 7530,
	'design/components/Sheet/native/ActionSheetRow.native.tsx': 7532,
	'modules/user_profile/native/UserProfileRolesCard.tsx': 7518,
	'modules/user_profile/UserProfileRoleUtils.tsx': 7539,
	'modules/chat/native/TypingIndicator.tsx': 12306,
	'modules/chat/useTypingUsersIds.tsx': 12308,
	'stores/TypingStore.tsx': 12307,
	'modules/chat_input/native/accessories/ChatInputCharCounter.tsx': 12778,
	'modules/chat_input/native/action_buttons/ChatInputRightActions.tsx': 12779,
	'modules/chat_input/native/guard/ChatInputGuardWrapper.tsx': 12782,
	'modules/chat_input/native/ChatInput.tsx': 12300,
	'modules/chat_input/native/ChatInputNativeCommands.tsx': 12330,
	'modules/chat_input/native/FloatingChatInputContainer.tsx': 12756,
	'stores/GuildRoleStore.tsx': 2101,
	'records/GuildRoleRecord.tsx': 2102,
	'utils/GuildRoleUtils.tsx': 2105,
	'stores/GuildMemberStore.tsx': 2107,
	'modules/guild_sidebar/native/VoiceUserNameItem.tsx': 16550,
	'modules/messages/useMessageAuthor.tsx': 5075,
	'modules/messages/createMessage.tsx': 8081,
	'modules/messages/native/renderer/getTagProperties.tsx': 8382,
	'modules/messages/native/renderer/ChatManager.tsx': 11875,
	'stores/UserStore.tsx': 1372,
	'actions/MessageActionCreators.tsx': 7786,
	'modules/gateway/GatewayConnectionStore.tsx': 5582,
	'modules/markup_v2/native/transformNativeMarkupMention.tsx': 8460,
	'actions/ModalActionCreators.tsx': 4959,
	'design/components/Navigator/native/Navigator.native.tsx': 7333,
	'design/components/Navigator/native/NavigatorHeader.native.tsx': 5914,
	'modules/messages/native/long_press/LongPressMessageActionSheet.tsx': 11986,
	'modules/messages/native/long_press/showLongPressMessageActionSheet.tsx': 11985,
	'asyncRequireImpl': 1980,
} as const

export type DiscordModulePath = keyof typeof rawDiscordModules

/**
 * Smart Proxy over Discord module IDs.
 * Intercepts property lookups and queries Discord's live imported path registry
 * (`revenge.discord.utils.finders.lookupModuleWithImportedPath`), guaranteeing that
 * plugins always receive the live runtime numeric ID on whatever Discord build is running.
 */
export const discordModules = new Proxy(rawDiscordModules as Record<string, number>, {
	get(target, prop: string | symbol) {
		if (typeof prop !== 'string') return (target as any)[prop]
		try {
			const finders =
				(revenge?.discord?.utils as any)?.modules?.finders ??
				(revenge?.discord?.utils as any)?.finders
			if (typeof finders?.lookupModuleWithImportedPath === 'function') {
				const res = finders.lookupModuleWithImportedPath(prop)
				if (res && res[1] !== undefined) {
					return res[1]
				}
			}
		} catch {}
		return target[prop]
	},
})

/**
 * Resolves module exports dynamically by imported path, with fallback to Metro ID lookup.
 */
export function getDiscordModuleExports<T = any>(path: string): T | null {
	try {
		const finders =
			(revenge?.discord?.utils as any)?.modules?.finders ??
			(revenge?.discord?.utils as any)?.finders
		if (typeof finders?.lookupModuleWithImportedPath === 'function') {
			const res = finders.lookupModuleWithImportedPath(path)
			if (res && res[0]) {
				return (res[0]?.default ?? res[0]) as T
			}
		}
	} catch {}

	try {
		const id = (discordModules as any)[path]
		if (id !== undefined) {
			const raw = (globalThis as any).__r?.(id)
			return (raw?.default ?? raw) as T
		}
	} catch {}

	return null
}
