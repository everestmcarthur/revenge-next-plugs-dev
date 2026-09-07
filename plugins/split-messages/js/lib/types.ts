export interface SplitMessagesStorage {
	splitOnWords: boolean
	showCharacterCounter: boolean
	maxChunks: number
}

export const DEFAULT_STORAGE: SplitMessagesStorage = {
	splitOnWords: false,
	showCharacterCounter: true,
	maxChunks: 20,
}
