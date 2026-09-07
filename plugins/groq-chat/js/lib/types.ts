export interface GroqChatStorage {
	apiKey?: string
	defaultModel?: string
	systemPrompt?: string
	ephemeralOnly?: boolean
	enablePrefix?: boolean
	prefixString?: string
	temperature?: number
	maxTokens?: number
}

export interface GroqMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
}

export interface GroqChatCompletionResponse {
	id: string
	object: string
	created: number
	model: string
	choices: Array<{
		index: number
		message: {
			role: string
			content: string
		}
		finish_reason: string
	}>
	usage?: {
		prompt_tokens: number
		completion_tokens: number
		total_tokens: number
	}
	error?: {
		message: string
		type: string
		code?: string
	}
}

export interface GroqModelOption {
	id: string
	name: string
	description: string
}
