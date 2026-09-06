import { createModuleGetter, getActivePluginId } from './modules'
import { logUsage } from './log'

const transitionRouterFilter = revenge.modules.finders.filters.withProps('transitionToGuild')

const transitionRouterModule = createModuleGetter<any>(
	transitionRouterFilter,
	(exports) =>
		typeof exports?.transitionToGuild === 'function'
			? exports
			: typeof exports?.default?.transitionToGuild === 'function'
				? exports.default
				: undefined,
	'transitionRouter',
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
	'userSettings',
)

const navigationModule = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('pushLazy', 'popWithKey'),
	(exports) =>
		typeof exports?.push === 'function'
			? exports
			: typeof exports?.default?.push === 'function'
				? exports.default
				: undefined,
	'navigation',
)

const navigatorModule = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('Navigator'),
	(exports) => exports?.Navigator ?? exports?.default ?? exports,
	'navigator',
)

const modalCloseModule = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('getHeaderCloseButton'),
	(exports) =>
		exports?.getHeaderCloseButton ??
		exports?.getRenderCloseButton ??
		exports?.default?.getHeaderCloseButton,
	'modalClose',
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
	const pluginId = getActivePluginId()
	try {
		const router = transitionRouterModule()
		if (typeof router?.transitionToGuild === 'function') {
			router.transitionToGuild(guildId, channelId, messageId)
			logUsage(pluginId, 'navigation', 'nav:transitionToGuild', `${guildId}/${channelId ?? ''}`, true)
			return
		}

		const { lookupModule } = revenge.modules.finders
		const r = lookupModule(transitionRouterFilter)?.[0]
		if (typeof r?.transitionToGuild === 'function') {
			r.transitionToGuild(guildId, channelId, messageId)
			logUsage(pluginId, 'navigation', 'nav:transitionToGuild', `${guildId}/${channelId ?? ''}`, true)
			return
		}
		logUsage(pluginId, 'navigation', 'nav:transitionToGuild', `${guildId}/${channelId ?? ''}`, false, 'Router not found')
	} catch (e) {
		logUsage(pluginId, 'navigation', 'nav:transitionToGuild', `${guildId}/${channelId ?? ''}`, false, String(e))
	}
}

export function openUserSettings(section?: string): void {
	const pluginId = getActivePluginId()
	const targetSection = typeof section === 'string' ? section : 'Overview'
	try {
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
					logUsage(pluginId, 'navigation', 'nav:openUserSettings', targetSection, true)
					return
				}
			} catch {}
		}

		// 2. Cached getter module
		const mod = userSettingsModule()
		if (typeof mod?.openUserSettings === 'function') {
			mod.openUserSettings(targetSection)
			logUsage(pluginId, 'navigation', 'nav:openUserSettings', targetSection, true)
			return
		}

		// 3. Dynamic lookupModule scan
		const { lookupModule } = revenge.modules.finders
		const matches = lookupModule(userSettingsFilter)
		for (const m of matches || []) {
			const target = m?.default ?? m
			if (typeof target?.openUserSettings === 'function') {
				target.openUserSettings(targetSection)
				logUsage(pluginId, 'navigation', 'nav:openUserSettings', targetSection, true)
				return
			}
		}
		logUsage(pluginId, 'navigation', 'nav:openUserSettings', targetSection, false, 'Action not found')
	} catch (e) {
		logUsage(pluginId, 'navigation', 'nav:openUserSettings', targetSection, false, String(e))
	}
}

