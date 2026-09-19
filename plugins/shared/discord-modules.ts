// Shared Discord module ID store for plugins. Module IDs shift between Discord
// builds; they're refreshed here by scripts/update-discord-module-ids.mjs from
// lvwmwm/decord's data branch (https://github.com/lvwmwm/decord/tree/data) on the
// latest build. Module paths are stable across builds; you can add/remove entries
// here and the script only updates the IDs.

export const discordBuild = 347205

export const discordModules = {
	'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx': 16726,
	'modules/main_tabs_v2/native/you_bar/YouBarBackground.tsx': 16716,
	'modules/main_tabs_v2/native/you_bar/YouBarNameplate.tsx': 16717,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatarDefault.tsx': 16719,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatar.tsx': 16720,
	'modules/main_tabs_v2/native/you_bar/YouBarName.tsx': 16721,
	'modules/main_tabs_v2/native/you_bar/YouBarUser.tsx': 16718,
	'modules/main_tabs_v2/native/you_bar/YouBarButton.tsx': 16725,
	'modules/main_tabs_v2/native/you_bar/YouBarConstants.tsx': 15359,
	'modules/main_tabs_v2/native/you_bar/YouBarActivityStatusExperiment.tsx': 16700,
	'modules/main_tabs_v2/native/you_bar/YouBar.tsx': 16696,
	'modules/user_profile/native/showUserProfileActionSheet.tsx': 8447,
	'modules/user_profile/native/YouScreenUserProfileContent.tsx': 17256,
	'modules/main_tabs_v2/native/tabs/you/YouScreen.tsx': 17239,
	'modules/guilds_bar/native/GuildsBarMessages.tsx': 16641,
	'modules/guilds_bar/native/hooks/useGuildsBarProps.tsx': 16625,
	'modules/guilds_bar/native/GuildsBar.tsx': 16616,
	'modules/application_commands/ApplicationCommandQueryApi.tsx': 9529,
	'modules/chat_input/native/accessories/ChatInputSendUtils.tsx': 12248,
	'utils/AvatarUtils.tsx': 1397,
	'asyncRequireImpl': 1980,
} as const
