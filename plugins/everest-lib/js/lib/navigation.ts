import { createModuleGetter } from './modules'

const transitionRouterFilter = revenge.modules.finders.filters.withProps('transitionToGuild')

const transitionRouterModule = createModuleGetter<any>(
	transitionRouterFilter,
	(exports) =>
		typeof exports?.transitionToGuild === 'function'
			? exports
			: typeof exports?.default?.transitionToGuild === 'function'
				? exports.default
				: undefined,
)

const userSettingsFilter = revenge.modules.finders.filters.createFilterGenerator(
	(_args, _id, exp: any) => {
		const t = exp?.default ?? exp
		if (!t || typeof t !== 'object') return false
		if (t.$$baseObject || t.$$loader || t.messages || t.defaultLocale) return false
		return typeof t.openUserSettings === 'function'
	},
	() => 'everest.userSettings',
	revenge.modules.finders.filters.FilterScopes.All,
)()

const userSettingsModule = createModuleGetter<any>(
	userSettingsFilter,
	(exports) => {
		const t = exports?.default ?? exports
		if (!t || typeof t !== 'object') return undefined
		if (t.$$baseObject || t.$$loader || t.messages || t.defaultLocale) return undefined
		return typeof t.openUserSettings === 'function' ? t : undefined
	},
)

const navigationModule = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('pushLazy', 'popWithKey'),
	(exports) =>
		typeof exports?.push === 'function'
			? exports
			: typeof exports?.default?.push === 'function'
				? exports.default
				: undefined,
)

const navigatorModule = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('Navigator'),
	(exports) => exports?.Navigator ?? exports?.default ?? exports,
)

const modalCloseModule = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('getHeaderCloseButton'),
	(exports) =>
		exports?.getHeaderCloseButton ??
		exports?.getRenderCloseButton ??
		exports?.default?.getHeaderCloseButton,
)

export function getRouter(): any {
	return transitionRouterModule()
}

export function getUserSettingsAction(): any {
	return userSettingsModule()
}

export function getNavigation(): any {
	return navigationModule()
}

export function getNavigator(): any {
	return navigatorModule()
}

export function getModalCloseButton(): any {
	const mod = modalCloseModule()
	if (typeof mod === 'function') return mod
	return mod?.getHeaderCloseButton ?? mod?.getRenderCloseButton
}

export function transitionToGuild(
	guildId = '@me',
	channelId?: string,
	messageId?: string,
): void {
	try {
		const router = transitionRouterModule()
		if (typeof router?.transitionToGuild === 'function') {
			router.transitionToGuild(guildId, channelId, messageId)
			return
		}

		const { lookupModule } = revenge.modules.finders
		const r = lookupModule(transitionRouterFilter)?.[0]
		r?.transitionToGuild?.(guildId, channelId, messageId)
	} catch (e) {
		console.error('[EverestLib] transitionToGuild error:', e)
	}
}

export function openUserSettings(section?: string): void {
	try {
		const targetSection = typeof section === 'string' ? section : 'Overview'

		// 1. Direct Metro require / known module ID check for instant cold boot
		if (typeof (globalThis as any).__r === 'function') {
			try {
				const direct = (globalThis as any).__r(6213)
				const target = direct?.default ?? direct
				if (
					typeof target?.openUserSettings === 'function' &&
					!target.$$baseObject &&
					!target.$$loader
				) {
					target.openUserSettings(targetSection)
					return
				}
			} catch {}
		}

		// 2. Cached getter module
		const mod = userSettingsModule()
		if (typeof mod?.openUserSettings === 'function') {
			mod.openUserSettings(targetSection)
			return
		}

		// 3. Dynamic lookupModule scan
		const { lookupModule } = revenge.modules.finders
		const matches = lookupModule(userSettingsFilter)
		for (const m of matches || []) {
			const target = m?.default ?? m
			if (typeof target?.openUserSettings === 'function') {
				target.openUserSettings(targetSection)
				return
			}
		}
	} catch (e) {
		console.error('[EverestLib] openUserSettings error:', e)
	}
}
