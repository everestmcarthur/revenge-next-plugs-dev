import PluginInfoSheet from './PluginInfoSheet'

function getRegistry() {
	return (globalThis as any).__everest
}

function openPluginInfoSheet(pluginId: string) {
	const actions = revenge.discord.actions.ActionSheetActionCreators
	actions?.openLazy?.(
		Promise.resolve({
			default: () => <PluginInfoSheet pluginId={pluginId} />,
		}),
		`everest-plugin-info:${pluginId}`,
		{},
	)
}

function getStatusName(status: number): string {
	if (status & 32) return 'Running'
	if (status & 16) return 'Starting...'
	if (status & 8) return 'Started'
	if (status & 4) return 'Initializing...'
	if (status & 2) return 'Pre-initialized'
	if (status & 1) return 'Pre-initializing...'
	return 'Unknown'
}

function formatVersion(version: any): string {
	if (!version) return 'Unknown'
	if (typeof version === 'string') return version
	if (version.nums) return version.nums.join('.')
	return 'Unknown'
}

export default function PluginList() {
	const { TableRowGroup, TableRow } = revenge.discord.design.Design
	const [, forceUpdate] = revenge.react.React.useReducer(
		(x: number) => x + 1,
		0,
	)

	revenge.react.React.useEffect(() => {
		const everest = getRegistry()
		if (!everest?.onRegistryChange) return

		return everest.onRegistryChange(() => {
			forceUpdate()
		})
	}, [])

	const everest = getRegistry()
	const plugins: any[] = everest?.getAllRegisteredPlugins?.() ?? []

	if (plugins.length === 0) {
		return (
			<TableRowGroup title="Registered Plugins">
				<TableRow
					label="No Dependent Plugins Active"
					subLabel="Plugins using Everest Library will appear here when loaded."
				/>
			</TableRowGroup>
		)
	}

	return (
		<TableRowGroup title="Registered Plugins">
			{plugins.map((registered) => (
				<TableRow
					key={registered.id}
					label={registered.name}
					subLabel={`v${formatVersion(registered.version)} · ${getStatusName(registered.getStatus())}`}
					onPress={() => openPluginInfoSheet(registered.id)}
					arrow
				/>
			))}
		</TableRowGroup>
	)
}
