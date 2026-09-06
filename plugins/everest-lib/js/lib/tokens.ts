export function resolveColor(
	semToken: string,
	rawFallback?: string,
): string | undefined {
	try {
		const theme =
			(revenge.discord.flux.Stores as any).ThemeStore?.theme ?? 'dark'
		const tokens = (revenge.discord.common as any).tokens

		const semObj = tokens?.colors?.[semToken]
		if (semObj) {
			const result = tokens.internal.resolveSemanticColor(theme, semObj)
			if (typeof result === 'string' && result.startsWith('#')) return result
			if (typeof result === 'number') {
				return (
					'#' + (result >>> 0).toString(16).padStart(8, '0').slice(2)
				)
			}
		}

		if (rawFallback) {
			const raw = tokens?.unsafe_rawColors?.[rawFallback]
			if (typeof raw === 'string' && raw.startsWith('#')) return raw
		}
	} catch {}
	return undefined
}
