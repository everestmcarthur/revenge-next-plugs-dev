// Shared Discord module ID store for plugins. Module IDs shift between Discord
// builds; they're refreshed here by scripts/update-discord-module-ids.mjs from
// lvwmwm/decord's data branch (https://github.com/lvwmwm/decord/tree/data) on the
// latest build. Module paths are stable across builds; you can add/remove entries
// here and the script only updates the IDs.

export const discordBuild = 347204

export const discordModules = {
	'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx': 16650,
	'modules/main_tabs_v2/native/you_bar/YouBarBackground.tsx': 16640,
	'modules/main_tabs_v2/native/you_bar/YouBarNameplate.tsx': 16641,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatarDefault.tsx': 16643,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatar.tsx': 16644,
	'modules/main_tabs_v2/native/you_bar/YouBarName.tsx': 16645,
	'modules/main_tabs_v2/native/you_bar/YouBarUser.tsx': 16642,
	'modules/main_tabs_v2/native/you_bar/YouBarButton.tsx': 16649,
	'modules/main_tabs_v2/native/you_bar/YouBarConstants.tsx': 15304,
	'modules/main_tabs_v2/native/you_bar/YouBarActivityStatusExperiment.tsx': 16624,
	'modules/main_tabs_v2/native/you_bar/YouBar.tsx': 16620,
	'modules/user_profile/native/showUserProfileActionSheet.tsx': 8409,
	'modules/user_profile/native/YouScreenUserProfileContent.tsx': 17179,
	'modules/main_tabs_v2/native/tabs/you/YouScreen.tsx': 17162,
	'modules/guilds_bar/native/GuildsBarMessages.tsx': 16565,
	'modules/guilds_bar/native/hooks/useGuildsBarProps.tsx': 16549,
	'modules/guilds_bar/native/GuildsBar.tsx': 16540,
	'asyncRequireImpl': 1897,
} as const
