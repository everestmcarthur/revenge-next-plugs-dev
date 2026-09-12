// Shared Discord module ID store for plugins (workflow created by Kmio).
// Module IDs shift between Discord builds; they're refreshed here by
// scripts/update-discord-module-ids.mjs from lvwmwm/decord's data branch
// (https://github.com/lvwmwm/decord/tree/data) on the latest build. Module paths
// are stable across builds; you can add/remove entries here and the script only updates the IDs.

export const discordBuild = 346205

export const discordModules = {
	'modules/main_tabs_v2/native/you_bar/YouBarNotificationsButton.tsx': 16464,
	'modules/main_tabs_v2/native/you_bar/YouBarBackground.tsx': 16454,
	'modules/main_tabs_v2/native/you_bar/YouBarNameplate.tsx': 16455,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatarDefault.tsx': 16457,
	'modules/main_tabs_v2/native/you_bar/YouBarAvatar.tsx': 16458,
	'modules/main_tabs_v2/native/you_bar/YouBarName.tsx': 16459,
	'modules/main_tabs_v2/native/you_bar/YouBarUser.tsx': 16456,
	'modules/main_tabs_v2/native/you_bar/YouBarButton.tsx': 16463,
	'modules/main_tabs_v2/native/you_bar/YouBarConstants.tsx': 15156,
	'modules/main_tabs_v2/native/you_bar/YouBarActivityStatusExperiment.tsx': 16438,
	'modules/main_tabs_v2/native/you_bar/YouBar.tsx': 16434,
	'modules/main_tabs_v2/native/tabs/you/utils/showYouAccountActionSheet.tsx': 16440,
	'modules/main_tabs_v2/native/tabs/you/YouAccountActionSheet.tsx': 16442,
	'modules/user_profile/native/showUserProfileActionSheet.tsx': 8264,
	'modules/user_profile/native/YouScreenUserProfileContent.tsx': 16885,
	'modules/main_tabs_v2/native/tabs/you/YouScreen.tsx': 16868,
	'asyncRequireImpl': 1896,
} as const
