import { createModuleGetter, resolveComponent } from './modules'

const avatar = createModuleGetter<any>(
	revenge.modules.finders.filters.withProps(
		'default',
		'AvatarSizes',
		'getStatusSize',
	),
	exports => resolveComponent(exports),
)

export function getAvatar(): any {
	return avatar()
}
