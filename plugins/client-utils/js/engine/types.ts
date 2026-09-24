export enum ApplicationCommandOptionType {
	SUB_COMMAND = 1,
	SUB_COMMAND_GROUP = 2,
	STRING = 3,
	INTEGER = 4,
	BOOLEAN = 5,
	USER = 6,
	CHANNEL = 7,
	ROLE = 8,
	MENTIONABLE = 9,
	NUMBER = 10,
	ATTACHMENT = 11,
}

export type ResponseFormat = 'text' | 'embed' | 'cv2'

export interface CommandOptionChoice {
	name: string
	displayName: string
	value: string | number
}

export interface CommandOption {
	type: ApplicationCommandOptionType | number
	name: string
	displayName?: string
	description: string
	displayDescription?: string
	required?: boolean
	choices?: CommandOptionChoice[]
	options?: CommandOption[]
}

export interface CommandSection {
	id?: string
	name?: string
	icon?: string
}

export interface EmbedField {
	name: string
	value: string
	inline?: boolean
}

export interface EmbedImage {
	url: string
	proxyURL?: string
	width?: number
	height?: number
}

export interface EmbedAuthor {
	name: string
	url?: string
	iconURL?: string
	proxyIconURL?: string
}

export interface EmbedFooter {
	text: string
	iconURL?: string
	proxyIconURL?: string
}

export interface DiscordEmbed {
	type?: string
	title?: string
	description?: string
	url?: string
	color?: number
	timestamp?: string
	fields?: EmbedField[]
	image?: EmbedImage
	thumbnail?: EmbedImage
	author?: EmbedAuthor
	footer?: EmbedFooter
}

export interface ReplyOptions {
	content?: string
	ephemeral?: boolean | string | number
	format?: ResponseFormat
	name?: string
	username?: string
	authorName?: string
	icon?: string
	picture?: string
	avatar?: string
	image?: string
	imageUrl?: string
	embed?: DiscordEmbed | any
	embeds?: (DiscordEmbed | any)[]
	components?: any[]
	attachments?: any[]
}

export interface CommandContext {
	channelId: string
	guildId?: string | null
	currentUser: any
	reply: (options: string | ReplyOptions) => void
}

export interface ClientCommand {
	name: string
	description: string
	options?: CommandOption[]
	section?: CommandSection
	execute: (args: Record<string, any>, ctx: CommandContext) => Promise<void> | void
	_pluginId?: string
	_pluginMeta?: any
}

export interface ClientUtilsStorage {
	defaultResponseFormat: ResponseFormat
	showSectionIcons: boolean
}
