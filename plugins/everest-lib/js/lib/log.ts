export interface LogEntry {
	id: string
	module: string
	action: string
	target: string
	attempt?: number
	found?: boolean
	level?: 'info' | 'warn' | 'error' | 'debug'
	message?: string
	timestamp: number
}

const logs: LogEntry[] = []
const listeners = new Set<() => void>()
const attemptMap = new Map<string, number>()
let debugLoggingEnabled = true

export function setDebugLoggingEnabled(enabled: boolean) {
	debugLoggingEnabled = enabled
}

export function isDebugLoggingEnabled(): boolean {
	return debugLoggingEnabled
}

export function addLog(
	entry: Omit<LogEntry, 'timestamp'> & { timestamp?: number },
) {
	const key = `${entry.id}:${entry.action}:${entry.target}`
	const attempt = entry.attempt ?? ((attemptMap.get(key) ?? 0) + 1)
	attemptMap.set(key, attempt)

	const fullEntry: LogEntry = {
		...entry,
		attempt,
		found: entry.found !== false,
		level: entry.level ?? (entry.found === false ? 'error' : 'info'),
		timestamp: entry.timestamp ?? Date.now(),
	}

	logs.unshift(fullEntry)
	if (logs.length > 500) logs.pop()

	if (debugLoggingEnabled) {
		const symbol = fullEntry.found ? '✓' : '✗'
		const prefix = `[EverestLib][${fullEntry.id}] ${symbol} ${fullEntry.action}: ${fullEntry.target} (#${attempt})`
		const detail = fullEntry.message ? ` - ${fullEntry.message}` : ''

		if (fullEntry.level === 'error' || !fullEntry.found) {
			console.error(`${prefix}${detail}`)
		} else if (fullEntry.level === 'warn') {
			console.warn(`${prefix}${detail}`)
		} else {
			console.log(`${prefix}${detail}`)
		}
	}

	for (const fn of listeners) {
		try {
			fn()
		} catch {}
	}
}

export function logUsage(
	id: string,
	module: string,
	action: string,
	target: string,
	found = true,
	message?: string,
) {
	addLog({
		id,
		module,
		action,
		target,
		found,
		level: found ? 'info' : 'error',
		message,
	})
}

export function getLogs(filter?: {
	pluginId?: string
	errorsOnly?: boolean
}): readonly LogEntry[] {
	if (!filter) return logs
	return logs.filter((l) => {
		if (filter.pluginId && l.id !== filter.pluginId) return false
		if (filter.errorsOnly && l.found !== false && l.level !== 'error')
			return false
		return true
	})
}

export function clearLogs(pluginId?: string) {
	if (pluginId) {
		const remaining = logs.filter((l) => l.id !== pluginId)
		logs.length = 0
		logs.push(...remaining)
	} else {
		logs.length = 0
		attemptMap.clear()
	}
	for (const fn of listeners) {
		try {
			fn()
		} catch {}
	}
}

export function onLog(fn: () => void): () => void {
	listeners.add(fn)
	return () => {
		listeners.delete(fn)
	}
}

