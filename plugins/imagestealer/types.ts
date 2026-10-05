export type AssetType = 'emoji' | 'sticker' | 'attachment' | 'avatar' | 'banner'

export interface StealableAsset {
	id: string
	name: string
	url: string
	animated: boolean
	type: AssetType
	originalMessageId?: string
	originalAuthor?: string
}

export interface VaultItem {
	id: string
	name: string
	url: string
	animated: boolean
	type: AssetType
	serverId?: string
	addedAt: number
}

export interface GuildEmojiSlotInfo {
	guildId: string
	guildName: string
	iconUrl?: string
	staticCount: number
	animatedCount: number
	maxStatic: number
	maxAnimated: number
	canUpload: boolean
	isStaticFull: boolean
	isAnimatedFull: boolean
}

export interface ZiplineConfig {
	enabled: boolean
	host: string
	token: string
}

export type SendFormat = 'cdn' | 'markdown' | 'attachment'

export interface StoredSettings {
	apiUrl: string
	sendFormat: SendFormat
	autoCompress: boolean
	syncWithCloud: boolean
	nitroBypass: boolean
	zipline: ZiplineConfig
	vault: VaultItem[]
	stashServers: string[]
}
