import type { RegisteredPlugin } from '../lib/registry'

function getRegistry() {
	return (globalThis as any).__everest
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

export default function PluginInfoSheet({ pluginId }: { pluginId: string }) {
	const React = revenge.react.React
	const { Image, View, ScrollView } = revenge.react.ReactNative
	const Design = revenge.discord.design.Design as any
	const {
		ActionSheet,
		BottomSheetTitleHeader,
		ActionSheetCloseButton,
		TableRowGroup,
		TableRow,
		Stack,
	} = Design

	const everest = getRegistry()
	const registered = everest?.getRegisteredPlugin?.(pluginId) as
		| RegisteredPlugin
		| undefined
	if (!registered) return null

	const status = getStatusName(registered.getStatus())
	const errors = (registered.getErrors() ?? []).map((e: any) => {
		if (typeof e === 'string') return e
		if (e && typeof e === 'object') {
			const code = e.code ?? 'Unknown'
			const message = e.message ?? String(e)
			return `[${code}] ${message}`
		}
		return String(e)
	})
	const version = formatVersion(registered.version)

	let iconSource: number | undefined
	try {
		iconSource = revenge.assets.getAssetIdByName(
			registered.icon ?? 'PuzzlePieceIcon',
		)
	} catch {}

	return (
		<ActionSheet
			scrollable
			contentStyles={{ paddingHorizontal: 0, paddingBottom: 0 }}
			header={
				<BottomSheetTitleHeader
					title={registered.name}
					subtitle={pluginId}
					leading={
						iconSource != null ? (
							<Image
								source={iconSource}
								style={{ width: 24, height: 24, marginTop: 9 }}
							/>
						) : undefined
					}
					trailing={
						<View style={{ marginTop: 9 }}>
							<ActionSheetCloseButton
								onPress={() =>
									revenge.discord.actions.ActionSheetActionCreators.hideActionSheet()
								}
							/>
						</View>
					}
				/>
			}
		>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
				nestedScrollEnabled={true}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<Stack spacing={16} style={{ paddingHorizontal: 16 }}>
					<TableRowGroup title="Info">
						<TableRow label="Version" subLabel={version} />
						<TableRow
							label="Author"
							subLabel={registered.author ?? 'Unknown'}
						/>
						<TableRow
							label="Description"
							subLabel={registered.description}
						/>
						<TableRow label="Status" subLabel={status} />
					</TableRowGroup>

					{errors.length > 0 && (
						<TableRowGroup title={`Errors (${errors.length})`}>
							{errors.map((err: string, i: number) => (
								<TableRow
									key={i}
									variant="danger"
									label={`Error ${i + 1}`}
									subLabel={err}
								/>
							))}
						</TableRowGroup>
					)}
				</Stack>
			</ScrollView>
		</ActionSheet>
	)
}
