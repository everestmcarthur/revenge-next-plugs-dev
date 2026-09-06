import { createModuleGetter } from './modules'

const withGeneratedIconComponent = ((): any => {
	try {
		return (revenge as any).utils.discord.withGeneratedIconComponent
	} catch {
		return undefined
	}
})()

const { withProps } = revenge.modules.finders.filters

const iconCache = new Map<string, () => any>()

export function getIcon(name: string): () => any {
	let getter = iconCache.get(name)
	if (!getter) {
		getter = createModuleGetter<any>(
			withGeneratedIconComponent
				? withGeneratedIconComponent(name)
				: withProps(name),
			(exports) => exports?.[name],
		)
		iconCache.set(name, getter)
	}
	return getter()
}
