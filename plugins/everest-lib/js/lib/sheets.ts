export function getActionSheetActionCreators(): any {
	try {
		return (revenge as any).discord?.actions?.ActionSheetActionCreators
	} catch {
		return undefined
	}
}

export function openLazyActionSheet(
	render: () => any,
	key: string,
	props: Record<string, any> = {},
): void {
	const actions = getActionSheetActionCreators()
	if (actions?.openLazy) {
		actions.openLazy(
			Promise.resolve({
				default: render,
			}),
			key,
			props,
		)
	}
}
