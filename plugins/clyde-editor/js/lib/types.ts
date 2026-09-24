export interface ClydePreset {
	id: string
	name: string
	avatar: string
	banner?: string
	bio: string
	tagText: string
	tagTextColor?: string
	tagBackgroundColor?: string
	tagVerified?: boolean
	color?: string
}

export interface ClydeEditorStorage {
	destroyClyde: boolean
	name: string
	avatar: string
	banner: string
	bio: string
	tagText: string
	tagTextColor: string
	tagBackgroundColor: string
	tagVerified: boolean
	color: string
	selectedPreset: string
}

export const CLYDE_DEFAULTS: ClydeEditorStorage = {
	destroyClyde: false,
	name: 'Clyde',
	avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
	banner: '',
	bio: "I'm your friendly Discord bot companion!",
	tagText: 'APP',
	tagTextColor: '#FFFFFF',
	tagBackgroundColor: '#5865F2',
	tagVerified: true,
	color: '#5865F2',
	selectedPreset: 'clyde',
}
