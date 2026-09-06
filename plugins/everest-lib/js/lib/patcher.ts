export function safeInstead<
	Parent extends Record<Key, any>,
	Key extends keyof Parent,
>(
	parent: Parent,
	key: Key,
	hook: (args: any[], original: Parent[Key]) => any,
): () => void {
	try {
		return revenge.patcher.instead(parent, key, hook as any)
	} catch {
		return () => {}
	}
}

export function safeBefore<
	Parent extends Record<Key, any>,
	Key extends keyof Parent,
>(
	parent: Parent,
	key: Key,
	hook: (args: any[]) => any,
): () => void {
	try {
		return revenge.patcher.before(parent, key, hook as any)
	} catch {
		return () => {}
	}
}

export function safeAfter<
	Parent extends Record<Key, any>,
	Key extends keyof Parent,
>(
	parent: Parent,
	key: Key,
	hook: (args: any[], result: any) => any,
): () => void {
	try {
		return revenge.patcher.after(parent, key, hook as any)
	} catch {
		return () => {}
	}
}

export function safeInsteadJSX(
	component: any,
	hook: (args: any[], jsx: any) => any,
): () => void {
	try {
		return revenge.react.jsxRuntime.insteadJSX(component, hook)
	} catch {
		return () => {}
	}
}

export function safeAfterJSX(
	component: any,
	hook: (element: any) => any,
): () => void {
	try {
		return revenge.react.jsxRuntime.afterJSX(component, hook)
	} catch {
		return () => {}
	}
}
