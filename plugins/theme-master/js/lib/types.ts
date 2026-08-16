export interface ThemeMasterStorage {
	enabled: boolean
	specName: string
	specUrl: string
	semanticColors: Record<string, string>
}

export interface ThemeSpec {
	name?: string
	semanticColors: Record<string, string>
}
