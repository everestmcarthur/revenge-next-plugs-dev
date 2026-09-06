export interface LogEntry {
	id: string
	module: string
	action: string
	attempt?: number
	found?: boolean
	timestamp?: number
}

const logs: LogEntry[] = []
const listeners = new Set<() => void>()

export function addLog(entry: LogEntry) {
	logs.unshift({ ...entry, timestamp: Date.now() })
	if (logs.length > 200) logs.pop()
	for (const fn of listeners) fn()
}

export function logUsage(
	id: string,
	module: string,
	action: string,
	found: boolean,
) {
	addLog({ id, module, action, found })
}

export function getLogs(): readonly LogEntry[] {
	return logs
}

export function onLog(fn: () => void): () => void {
	listeners.add(fn)
	return () => {
		listeners.delete(fn)
	}
}
