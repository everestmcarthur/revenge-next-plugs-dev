import { lazy } from './modules'

export function onModule(
	filter: any,
	cb: (namespace: any, id: number) => void,
): () => void {
	try {
		return revenge.modules.finders.getModules(
			filter,
			(namespace: any, id: number) => cb(namespace, id),
			{ returnNamespace: true, max: 1 },
		)
	} catch {
		return () => {}
	}
}

export function onImportedPath<T = any>(
	path: string,
	cb: (namespace: T, id: number) => void,
): () => void {
	try {
		return revenge.discord.utils.modules.finders.getModuleWithImportedPath<T>(
			path,
			(namespace, id) => cb(namespace, id as number),
		)
	} catch {
		return () => {}
	}
}

export function forceInitModule(filter: any): void {
	try {
		revenge.modules.finders.lookupModule(filter, { initialize: true })
	} catch {}
}

const byDefaultName = lazy(() =>
	revenge.modules.finders.filters.createFilterGenerator<[name: string]>(
		([name], _id, exports: any) =>
			(typeof exports?.default === 'function' &&
				exports.default.name === name) ||
			exports?.default?.type?.name === name,
		([name]) => `everest.defaultName(${name})`,
		revenge.modules.finders.filters.FilterScopes.All,
	),
)

const byProps = lazy(() =>
	revenge.modules.finders.filters.createFilterGenerator<[props: string[]]>(
		([props], _id, exports: any) =>
			exports != null &&
			(typeof exports === 'object' || typeof exports === 'function') &&
			props.every((prop) => prop in exports),
		([props]) => `everest.props(${props.join(',')})`,
		revenge.modules.finders.filters.FilterScopes.All,
	),
)

const byDisplayName = lazy(() =>
	revenge.modules.finders.filters.createFilterGenerator<[name: string]>(
		([name], _id, exports: any) =>
			exports?.name === name ||
			exports?.displayName === name ||
			exports?.type?.name === name ||
			exports?.type?.displayName === name ||
			exports?.default?.name === name ||
			exports?.default?.displayName === name ||
			exports?.default?.type?.name === name ||
			exports?.default?.type?.displayName === name,
		([name]) => `everest.displayName(${name})`,
		revenge.modules.finders.filters.FilterScopes.All,
	),
)

const byTypeName = lazy(() =>
	revenge.modules.finders.filters.createFilterGenerator<[name: string]>(
		([name], _id, exports: any) =>
			exports?.name === name ||
			exports?.displayName === name ||
			exports?.type?.name === name ||
			exports?.type?.displayName === name ||
			exports?.default?.name === name ||
			exports?.default?.displayName === name ||
			exports?.default?.type?.name === name ||
			exports?.default?.type?.displayName === name,
		([name]) => `everest.typeName(${name})`,
		revenge.modules.finders.filters.FilterScopes.All,
	),
)

export function getDefaultNameFilter(name: string) {
	return byDefaultName()(name)
}

export function getPropsFilter(...props: string[]) {
	return byProps()(props)
}

export function getDisplayNameFilter(name: string) {
	return byDisplayName()(name)
}

export function getTypeNameFilter(name: string) {
	return byTypeName()(name)
}
