export interface Author {
	name: string
	id?: string
}

interface BackgroundDefinition {
	url: string
	blur?: number
	opacity?: number
}

export interface VendettaThemeManifest {
	spec: 2
	name: string
	description?: string
	authors?: Author[]
	semanticColors?: Record<string, (string | false)[]>
	rawColors?: Record<string, string>
	background?: {
		url: string
		blur?: number
		alpha?: number
	}
}

interface SemanticReference {
	type: 'color' | 'raw'
	value: string
	opacity?: number
}

export interface BunnyColorManifest {
	type: 'color'
	spec: 3
	name?: string
	main: {
		type: 'dark' | 'light'
		semantic?: Record<string, string | SemanticReference>
		raw?: Record<string, string>
		background?: BackgroundDefinition
	}
}

export type ColorManifest = BunnyColorManifest | VendettaThemeManifest

export interface VdThemeInfo {
	id: string
	selected: boolean
	data: ColorManifest
}

export type FontMap = Record<string, string>

export interface FontDefinition {
	spec: 1
	name: string
	description?: string
	main: FontMap
	source?: string
}

export interface ThemeMasterStorage {
	themes: Record<string, VdThemeInfo>
	fonts: Record<string, FontDefinition>
	selectedThemeId: string | null
	selectedFontName: string | null
	overrideThemeType?: 'auto' | 'dark' | 'light'
	showChatBackground?: boolean
}
