declare module '#lib/modules/native' {
	export interface NativeMethods {
		'radialstatus.configure': [
			[enabled: boolean, ringThickness: number, colors: Record<string, string>],
			void,
		]
		'radialstatus.setPresence': [[userId: string, status: string], void]
	}
}

export {}
