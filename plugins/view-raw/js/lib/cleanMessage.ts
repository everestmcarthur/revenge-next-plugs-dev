export function cleanMessage(msg: any) {
	if (!msg) return {}
	let clone: any
	try {
		clone = JSON.parse(JSON.stringify(msg))
	} catch {
		return msg
	}

	if (clone.author && typeof clone.author === 'object') {
		for (const key of ['email', 'phone', 'mfaEnabled', 'hasBouncedEmail']) {
			delete clone.author[key]
		}
	}

	return clone
}
