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
