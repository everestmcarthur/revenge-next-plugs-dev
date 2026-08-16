import { allTokenNames } from './resolver'
import { resolveLegacyAliases } from './legacyAliases'
import type { ThemeSpec } from './types'

const COLOR_VALUE_REGEX = /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|transparent)$/i

function normalizeColorValue(value: unknown): string | undefined {
	const raw = Array.isArray(value) ? value[0] : value
	if (typeof raw !== 'string') return undefined
	const trimmed = raw.trim()
	return COLOR_VALUE_REGEX.test(trimmed) ? trimmed : undefined
}

export interface AppliedSpec {
	spec: ThemeSpec
	resolvedColors: Record<string, string>
	directCount: number
	aliasedCount: number
	droppedCount: number
}

export function parseThemeSpec(raw: string): ThemeSpec {
	const data = JSON.parse(raw)
	if (typeof data !== 'object' || data === null) throw new Error('Theme spec must be a JSON object')
	const semanticColors: Record<string, string> = {}
	if (data.semanticColors && typeof data.semanticColors === 'object') {
		for (const [k, v] of Object.entries(data.semanticColors)) {
			const color = normalizeColorValue(v)
			if (color) semanticColors[k] = color
		}
	}
	return { name: typeof data.name === 'string' ? data.name : undefined, semanticColors }
}

export async function fetchThemeSpec(url: string): Promise<ThemeSpec> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Request failed: ${res.status}`)
	const text = await res.text()
	return parseThemeSpec(text)
}

export function resolveSpecColors(spec: ThemeSpec): AppliedSpec {
	const realTokens = new Set(allTokenNames())
	const resolvedColors: Record<string, string> = {}
	let directCount = 0
	let aliasedCount = 0
	let droppedCount = 0

	for (const [name, color] of Object.entries(spec.semanticColors)) {
		if (realTokens.has(name)) {
			resolvedColors[name] = color
			directCount++
			continue
		}
		const aliases = resolveLegacyAliases(name)
		if (aliases.length) {
			for (const alias of aliases) resolvedColors[alias] = color
			aliasedCount++
			continue
		}
		droppedCount++
	}

	return { spec, resolvedColors, directCount, aliasedCount, droppedCount }
}
