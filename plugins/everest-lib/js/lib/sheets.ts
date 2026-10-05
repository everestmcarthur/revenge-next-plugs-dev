import { getModules, lookupModule } from '@revenge-mod/modules/finders'
import {
	withDependencies,
	withProps,
} from '@revenge-mod/modules/finders/filters'

function dependsOn(creator: unknown, maxDeps: number) {
	const helpers = (withDependencies ?? (revenge as any)?.modules?.finders?.filters?.withDependencies) as unknown as {
		atMost?: (count: number, deps: unknown) => unknown
		unordered?: (deps: unknown) => unknown
		includes?: (deps: unknown) => unknown
	}
	const contains = helpers.unordered ?? helpers.includes
	const deps = contains === undefined ? [creator] : contains([creator])
	const bounded =
		helpers.atMost === undefined ? deps : helpers.atMost(maxDeps, deps)
	const withDeps = withDependencies ?? (revenge as any)?.modules?.finders?.filters?.withDependencies
	return withDeps(bounded as never)
}

export type Sheet = (...args: unknown[]) => unknown

export type SheetSpec = {
	prop: string | string[]
	anchor: string
	maxDeps?: number
}

const DEFAULT_MAX_DEPS = 20

function readSheet(
	exports: unknown,
	props: string | string[],
): Sheet | undefined {
	const namespace = exports as Record<string, unknown> | undefined
	if (!namespace) return undefined

	const names = typeof props === 'string' ? [props] : props
	const candidates: unknown[] = []

	for (const name of names) {
		candidates.push(namespace[name])
		candidates.push(
			(namespace.default as Record<string, unknown> | undefined)?.[name],
		)
	}
	candidates.push(namespace.default)

	for (const candidate of candidates)
		if (typeof candidate === 'function') return candidate as Sheet

	return undefined
}

export function resolveSheet(spec: SheetSpec): Sheet | undefined {
	const cached = memo.get(spec)
	if (cached) return cached

	let sheet: Sheet | undefined
	try {
		sheet = find(spec)
	} catch {
		return undefined
	}

	if (sheet) {
		memo.set(spec, sheet)
		return sheet
	}

	if (!listening.has(spec)) {
		listening.add(spec)
		const getMods = getModules ?? (revenge as any)?.modules?.finders?.getModules
		getMods?.(propsFilter(spec.prop), (exports: any) => {
			const value = readSheet(exports, spec.prop)
			if (value) memo.set(spec, value)
		})
	}

	return undefined
}

const memo = new Map<SheetSpec, Sheet>()
const listening = new Set<SheetSpec>()

function propsFilter(props: string | string[]) {
	const [prop, ...rest] = typeof props === 'string' ? [props] : props
	const withP = withProps ?? (revenge as any)?.modules?.finders?.filters?.withProps
	return withP(prop, ...rest)
}

function find(spec: SheetSpec): Sheet | undefined {
	const lookup = lookupModule ?? (revenge as any)?.modules?.finders?.lookupModule
	const [, creators] = lookup(propsFilter(spec.anchor))
	if (creators === undefined) return undefined

	const [namespace] = lookup(
		propsFilter(spec.prop).and(
			dependsOn(creators, spec.maxDeps ?? DEFAULT_MAX_DEPS),
		),
		{ returnNamespace: true },
	)

	return readSheet(namespace, spec.prop)
}

export function forceLoadLazySheets(specs: SheetSpec[]): void {
	for (const spec of specs) {
		try {
			resolveSheet(spec)
		} catch {}
	}
}

export function getActionSheetActionCreators(): any {
	try {
		return (revenge as any).discord?.actions?.ActionSheetActionCreators
	} catch {
		return undefined
	}
}

export function openLazyActionSheet(
	render: any,
	key: string,
	props: Record<string, any> = {},
): void {
	const actions = getActionSheetActionCreators()
	if (actions?.openLazy) {
		const promise =
			render instanceof Promise
				? render
				: Promise.resolve(
						typeof render === 'object' && render !== null && 'default' in render
							? render
							: { default: render },
					)
		actions.openLazy(promise, key, props)
	}
}

export function closeActionSheet(key?: string): void {
	const actions = getActionSheetActionCreators()
	try {
		if (actions?.close) {
			if (key) {
				actions.close(key)
			} else {
				actions.close()
			}
		}
	} catch {}
}
