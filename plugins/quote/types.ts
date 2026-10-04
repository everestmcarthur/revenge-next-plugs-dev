export type BlockSetting = 'all' | 'spoilers' | 'never'
export type CustomQuoteSetting =
	| 'allowCustomQuotes'
	| 'forceDisableCustomQuotes'

export interface DefaultQuoteSettings {
	light: boolean
	color: boolean
	bold: boolean
	flip: boolean
	new: boolean
	gif: boolean
	watermark: boolean
	watermarkText: string
}

export interface ZiplineConfig {
	enabled: boolean
	host: string
	token: string
}

export interface MIQUserConfig {
	userId?: string
	blockMode: BlockSetting
	allowCustomQuotes: boolean
	forceDisableCustomQuotes: boolean
	defaultSettings: DefaultQuoteSettings
	updatedAt?: string | null
}

export interface QuoteRequestOptions {
	text: string
	avatar: string
	username: string
	display_name: string
	color: boolean | string
	bold: boolean
	light: boolean
	flip: boolean
	new: boolean
	gif: boolean
	watermark: string
}

export interface StoredSettings {
	apiUrl?: string
	blockMode: BlockSetting
	allowCustomQuotes: boolean
	forceDisableCustomQuotes: boolean
	instantQuote: boolean
	zipline: ZiplineConfig
	defaultSettings: DefaultQuoteSettings
}
