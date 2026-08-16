declare module '#lib/modules/native' {
	export interface NativeMethods {
		'radialstatus.configure': [
			[enabled: boolean, ringThickness: number, colors: Record<string, string>],
			void,
		]
		'radialstatus.setPresence': [[userId: string, status: string], void]
		'radialstatus.setMessageAuthor': [[messageId: string, authorId: string], void]
		'radialstatus.debug': [
			[],
			{
				hooksInstalled: boolean
				enabled: boolean
				ringThickness: number
				statusColors: string[]
				presenceCacheSize: number
				messageAuthorsSize: number
				diagnostics: string[]
			},
		]
	}
}

export {}
