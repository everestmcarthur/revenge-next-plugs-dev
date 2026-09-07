import type { GroqModelOption, GroqChatStorage } from './types'

export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
export const DEFAULT_PREFIX = '.chat'
export const DEFAULT_TEMPERATURE = 0.7
export const DEFAULT_MAX_TOKENS = 2048

export const DEFAULT_SYSTEM_PROMPT =
	'You are a helpful, witty, and concise AI assistant inside Discord. Provide direct and formatted markdown responses.'

export const DEFAULT_STORAGE: GroqChatStorage = {
	apiKey: '',
	defaultModel: DEFAULT_MODEL,
	systemPrompt: DEFAULT_SYSTEM_PROMPT,
	ephemeralOnly: true,
	enablePrefix: true,
	prefixString: DEFAULT_PREFIX,
	temperature: DEFAULT_TEMPERATURE,
	maxTokens: DEFAULT_MAX_TOKENS,
}

export const GROQ_MODELS: GroqModelOption[] = [
	{
		id: 'llama-3.3-70b-versatile',
		name: 'Llama 3.3 70B (Versatile)',
		description: 'Most capable model, high intelligence and reasoning.',
	},
	{
		id: 'llama-3.1-8b-instant',
		name: 'Llama 3.1 8B (Instant)',
		description: 'Ultra fast responses, ideal for quick questions.',
	},
	{
		id: 'deepseek-r1-distill-llama-70b',
		name: 'DeepSeek R1 Distill 70B',
		description: 'Advanced reasoning and mathematical / coding skills.',
	},
	{
		id: 'gemma2-9b-it',
		name: 'Gemma 2 9B IT',
		description: 'Google Gemma 2 model optimized for conversational turns.',
	},
	{
		id: 'mixtral-8x7b-32768',
		name: 'Mixtral 8x7B (32k)',
		description: 'MoE model with wide general domain performance.',
	},
]

export const PROMPT_PRESETS = [
	{
		label: 'Default Assistant',
		prompt: 'You are a helpful, witty, and concise AI assistant inside Discord. Provide direct and formatted markdown responses.',
	},
	{
		label: 'Coding & Tech Expert',
		prompt: 'You are an expert software engineer. Provide high-quality, bug-free code snippets with concise technical explanations.',
	},
	{
		label: 'Concise & Direct',
		prompt: 'Be extremely concise. Answer questions directly without pleasantries, disclaimers, or excessive explanation.',
	},
	{
		label: 'Casual Discord Friend',
		prompt: 'You are a chill friend in Discord chat. Speak casually, use lowercase when fitting, and keep it brief.',
	},
]
