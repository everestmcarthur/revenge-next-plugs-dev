export interface ThemeAuthor {
	name: string
	id?: string
}

export type SemanticColorValue =
	| string
	| string[]
	| {
			dark?: string
			light?: string
			darker?: string
			midnight?: string
			userProfileThemes?: {
				dark?: string
				light?: string
			}
	  }

export interface ThemeData {
	name: string
	description?: string
	version?: string
	authors?: ThemeAuthor[]
	spec?: number
	semanticColors?: Record<string, SemanticColorValue>
	rawColors?: Record<string, string>
	background?: {
		url?: string
		alpha?: number
		blur?: number
	}
	fonts?: Record<string, string>
	plus?: Record<string, any>
}

export interface InstalledTheme {
	id: string
	selected: boolean
	data: ThemeData
	installedAt?: number
}

export interface FontDefinition {
	spec: 1
	name: string
	description?: string
	previewText?: string
	source?: string
	main: Record<string, string>
}

export interface InstalledFont {
	id: string
	name: string
	selected: boolean
	data: FontDefinition
	installedAt?: number
}

export interface ThemeifyStorage {
	selectedThemeId: string | null
	themes: Record<string, InstalledTheme>
	selectedFontName: string | null
	fonts: Record<string, InstalledFont>
	overrideThemeType?: 'auto' | 'dark' | 'darker' | 'midnight' | 'light'
}
