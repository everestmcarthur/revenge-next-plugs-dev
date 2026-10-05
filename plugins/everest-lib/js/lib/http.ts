import { createModuleGetter } from './modules'

export const getHTTPUtils = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('getAPIBaseURL', 'get', 'post'),
	exports => exports,
	'httpUtils',
)

const fetchBasicGuildFn = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('fetchBasicGuild'),
	exports => exports?.fetchBasicGuild,
	'fetchBasicGuild',
)

const requestMembersByIdFn = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('requestMembersById'),
	exports => exports?.requestMembersById,
	'requestMembersById',
)

const assetManagerFn = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('getAssetIds', 'fetchAssetIds'),
	exports => exports,
	'assetManager',
)

const activityActionFn = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps('SET_ACTIVITY'),
	exports => exports,
	'activityAction',
)

export function getFetchBasicGuild(): any {
	return fetchBasicGuildFn()
}

export function getRequestMembersById(): any {
	return requestMembersByIdFn()
}

export function getAssetManager(): any {
	return assetManagerFn()
}

export function primeActivityModule(): any {
	return activityActionFn()
}
