import type { GroqChatCompletionResponse, GroqMessage } from './types'
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_SYSTEM_PROMPT } from './constants'

export interface QueryGroqOptions {
	apiKey: string
	prompt: string
	model?: string
	systemPrompt?: string
	temperature?: number
	maxTokens?: number
}

export async function queryGroq(options: QueryGroqOptions): Promise<{ text: string; error?: string }> {
	const { apiKey, prompt, model, systemPrompt, temperature, maxTokens } = options

	if (!apiKey || !apiKey.trim()) {
		return {
			text: '',
			error: '⚠️ **Groq API Key missing!** Please set your API key in **Settings > Groq AI Chat** to use `/chat`. You can get a free API key at https://console.groq.com/keys.',
		}
	}

	const selectedModel = model?.trim() || DEFAULT_MODEL
	const sys = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : DEFAULT_SYSTEM_PROMPT
	const temp = typeof temperature === 'number' ? temperature : DEFAULT_TEMPERATURE
	const maxT = typeof maxTokens === 'number' ? maxTokens : DEFAULT_MAX_TOKENS

	const messages: GroqMessage[] = [
		{ role: 'system', content: sys },
		{ role: 'user', content: prompt },
	]

	try {
		const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey.trim()}`,
			},
			body: JSON.stringify({
				model: selectedModel,
				messages,
				temperature: temp,
				max_tokens: maxT,
			}),
		})

		const data: GroqChatCompletionResponse = await res.json()

		if (!res.ok) {
			const errMsg = data?.error?.message || `HTTP ${res.status} ${res.statusText}`
			if (res.status === 401) {
				return {
					text: '',
					error: `❌ **Invalid Groq API Key!** (401 Unauthorized)\nPlease check your API key in **Settings > Groq AI Chat**.\n\n*Error details:* \`${errMsg}\``,
				}
			}
			if (res.status === 429) {
				return {
					text: '',
					error: `⏳ **Groq Rate Limit Exceeded!** (429)\nPlease wait a few moments or try a smaller model like \`llama-3.1-8b-instant\`.\n\n*Error details:* \`${errMsg}\``,
				}
			}
			return {
				text: '',
				error: `❌ **Groq API Error (${res.status}):**\n\`${errMsg}\``,
			}
		}

		const reply = data?.choices?.[0]?.message?.content
		if (!reply) {
			return {
				text: '',
				error: '❌ Groq returned an empty response.',
			}
		}

		return { text: reply.trim() }
	} catch (e: any) {
		return {
			text: '',
			error: `❌ **Network / Request Error:**\n\`${e?.message || String(e)}\``,
		}
	}
}

export async function testGroqConnection(apiKey: string, model = DEFAULT_MODEL): Promise<{ ok: boolean; message: string }> {
	if (!apiKey || !apiKey.trim()) {
		return { ok: false, message: 'Please enter an API key first.' }
	}

	try {
		const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey.trim()}`,
			},
			body: JSON.stringify({
				model,
				messages: [{ role: 'user', content: 'Ping' }],
				max_tokens: 5,
			}),
		})

		if (res.ok) {
			return { ok: true, message: 'Connection successful! Groq API key is valid.' }
		}

		const data = await res.json().catch(() => ({}))
		const errMsg = data?.error?.message || `HTTP ${res.status}`
		return { ok: false, message: `Failed (${res.status}): ${errMsg}` }
	} catch (e: any) {
		return { ok: false, message: `Connection failed: ${e?.message || String(e)}` }
	}
}
