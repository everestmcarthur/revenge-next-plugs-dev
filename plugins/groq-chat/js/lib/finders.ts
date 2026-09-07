export function byProps(...props: string[]) {
	return revenge.modules.finders.filters.withProps(...props)
}

export function byName(name: string) {
	return revenge.modules.finders.filters.withName(name)
}

export function onModule(filter: any, cb: (namespace: any, id: number) => void): () => void {
	try {
		return revenge.modules.finders.getModules(
			filter,
			(namespace: any, id: number) => {
				cb(namespace, id)
			},
			{ returnNamespace: true, max: 1 },
		)
	} catch {
		return () => {}
	}
}
