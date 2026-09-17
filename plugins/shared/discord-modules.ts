// Shared Discord module ID store for plugins. Module IDs shift between Discord
// builds; they're refreshed here by scripts/update-discord-module-ids.mjs from
// lvwmwm/decord's data branch (https://github.com/lvwmwm/decord/tree/data) on the
// latest build. Module paths are stable across builds; you can add/remove entries
// here and the script only updates the IDs.

export const discordBuild = 347203

export const discordModules = {
	'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx': 16553,
	'modules/main_tabs_v2/native/you_bar/YouBarBackground.tsx': 16543,
	'modules/main_tabs_v2/native/you_bar/YouBarNameplate.tsx': 16544,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatarDefault.tsx': 16546,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatar.tsx': 16547,
	'modules/main_tabs_v2/native/you_bar/YouBarName.tsx': 16548,
	'modules/main_tabs_v2/native/you_bar/YouBarUser.tsx': 16545,
	'modules/main_tabs_v2/native/you_bar/YouBarButton.tsx': 16552,
	'modules/main_tabs_v2/native/you_bar/YouBarConstants.tsx': 15210,
	'modules/main_tabs_v2/native/you_bar/YouBarActivityStatusExperiment.tsx': 16527,
	'modules/main_tabs_v2/native/you_bar/YouBar.tsx': 16523,
	'modules/user_profile/native/showUserProfileActionSheet.tsx': 8327,
	'modules/user_profile/native/YouScreenUserProfileContent.tsx': 17048,
	'modules/main_tabs_v2/native/tabs/you/YouScreen.tsx': 17031,
	'modules/guilds_bar/native/GuildsBarMessages.tsx': 16468,
	'modules/guilds_bar/native/hooks/useGuildsBarProps.tsx': 16452,
	'modules/guilds_bar/native/GuildsBar.tsx': 16443,
	'asyncRequireImpl': 1897,
} as const
