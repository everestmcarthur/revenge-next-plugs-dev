import type { PluginApi } from '@revenge-mod/plugins/types'
import {
	getButtonPosition,
	setButtonPosition,
	type YouBarButtonId,
	type YouBarPosition,
	type YouBarPlusStorage,
	DEFAULT_STORAGE,
} from '../lib/types'

function formatButtonName(id: YouBarButtonId): string {
	switch (id) {
		case 'dms':
			return 'Direct Messages'
		case 'notifications':
			return 'Notifications'
		case 'settings':
			return 'Settings'
	}
}

function capitalize(str: string): string {
	if (!str) return ''
	return str.charAt(0).toUpperCase() + str.slice(1)
}

function openPositionPicker({
	buttonName,
	currentPosition,
	onSelect,
}: {
	buttonName: string
	currentPosition: YouBarPosition
	onSelect: (pos: YouBarPosition) => void
}) {
	const actions = revenge.discord.actions.ActionSheetActionCreators
	actions?.openLazy?.(
		Promise.resolve({
			default: () => {
				const {
					ActionSheet,
					BottomSheetTitleHeader,
					ActionSheetCloseButton,
					TableRowGroup,
					TableRow,
					Stack,
				} = revenge.discord.design.Design as any
				const { TableRowAssetIcon } = (revenge.components ?? {}) as any

				const options: Array<{
					pos: YouBarPosition
					label: string
					desc: string
				}> = [
					{
						pos: 'left',
						label: 'Left',
						desc: 'Position on the left side of the cluster',
					},
					{
						pos: 'middle',
						label: 'Middle',
						desc: 'Position in the center of the cluster',
					},
					{
						pos: 'right',
						label: 'Right',
						desc: 'Position on the right side of the cluster',
					},
				]

				return (
					<ActionSheet
						header={
							<BottomSheetTitleHeader
								title={`${buttonName} Position`}
								subtitle="Choose position (swaps with current occupant)"
								trailing={
									<ActionSheetCloseButton
										onPress={() => actions.hideActionSheet()}
									/>
								}
							/>
						}
					>
						<Stack spacing={8} style={{ padding: 16 }}>
							<TableRowGroup>
								{options.map((opt) => (
									<TableRow
										key={opt.pos}
										icon={
											currentPosition === opt.pos && TableRowAssetIcon ? (
												<TableRowAssetIcon name="CheckmarkLargeIcon" />
											) : undefined
										}
										label={opt.label}
										subLabel={opt.desc}
										onPress={() => {
											onSelect(opt.pos)
											actions.hideActionSheet()
										}}
									/>
								))}
							</TableRowGroup>
						</Stack>
					</ActionSheet>
				)
			},
		}),
		`youbar-position-picker:${buttonName}`,
		{},
	)
}

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: YouBarPlusStorage }>
}) {
	const { Page } =
		revenge.components as typeof import('@revenge-mod/components')
	const { ScrollView, View } = revenge.react.ReactNative
	const { TableRowGroup, TableSwitchRow, TableRow, Stack, Card, Text } =
		revenge.discord.design.Design as any

	const storage = api.jsonStorage.use()

	const currentOrder =
		Array.isArray(storage?.order) && storage.order.length === 3
			? storage.order
			: DEFAULT_STORAGE.order

	const handleSetPosition = (
		buttonId: YouBarButtonId,
		targetPos: YouBarPosition,
	) => {
		const newOrder = setButtonPosition(currentOrder, buttonId, targetPos)
		api.jsonStorage.set({ order: newOrder })
	}

	const dmPos = getButtonPosition(currentOrder, 'dms')
	const notifPos = getButtonPosition(currentOrder, 'notifications')
	const settingsPos = getButtonPosition(currentOrder, 'settings')

	return (
		<Page>
			<View style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={{ padding: 16 }}>
					<Stack spacing={16}>
						<Card>
							<View style={{ padding: 16 }}>
								<Text variant="heading-md/semibold">
									YouBar+
								</Text>
								<Text
									variant="text-sm/normal"
									color="text-muted"
									style={{ marginTop: 6 }}
								>
									Customize the YouBar bottom navigation cluster with
									Direct Messages, Notifications, and Settings shortcuts.
								</Text>
								<Text
									variant="text-xs/normal"
									color="text-muted"
									style={{ marginTop: 10 }}
								>
									Layout Order: {formatButtonName(currentOrder[0])} (Left) →{' '}
									{formatButtonName(currentOrder[1])} (Middle) →{' '}
									{formatButtonName(currentOrder[2])} (Right)
								</Text>
							</View>
						</Card>

						<TableRowGroup title="Button Visibility">
							<TableSwitchRow
								label="Direct Messages Button"
								subLabel="Show quick jump to Direct Messages"
								value={storage?.showDMButton !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ showDMButton: v })
								}
							/>
							<TableSwitchRow
								label="Notifications Button"
								subLabel="Show the standard Notifications button"
								value={storage?.showNotificationsButton !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({
										showNotificationsButton: v,
									})
								}
							/>
							<TableSwitchRow
								label="Settings Button"
								subLabel="Show quick jump to User Settings"
								value={storage?.showSettingsButton !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({
										showSettingsButton: v,
									})
								}
							/>
						</TableRowGroup>

						<TableRowGroup title="Button Positions">
							<TableRow
								label="Direct Messages"
								subLabel={`Current position: ${capitalize(dmPos)}`}
								trailing={
									<Text variant="text-sm/semibold" color="text-brand">
										{capitalize(dmPos)}
									</Text>
								}
								onPress={() =>
									openPositionPicker({
										buttonName: 'Direct Messages',
										currentPosition: dmPos,
										onSelect: (pos) =>
											handleSetPosition('dms', pos),
									})
								}
								arrow
							/>
							<TableRow
								label="Notifications"
								subLabel={`Current position: ${capitalize(notifPos)}`}
								trailing={
									<Text variant="text-sm/semibold" color="text-brand">
										{capitalize(notifPos)}
									</Text>
								}
								onPress={() =>
									openPositionPicker({
										buttonName: 'Notifications',
										currentPosition: notifPos,
										onSelect: (pos) =>
											handleSetPosition('notifications', pos),
									})
								}
								arrow
							/>
							<TableRow
								label="Settings"
								subLabel={`Current position: ${capitalize(settingsPos)}`}
								trailing={
									<Text variant="text-sm/semibold" color="text-brand">
										{capitalize(settingsPos)}
									</Text>
								}
								onPress={() =>
									openPositionPicker({
										buttonName: 'Settings',
										currentPosition: settingsPos,
										onSelect: (pos) =>
											handleSetPosition('settings', pos),
									})
								}
								arrow
							/>
						</TableRowGroup>
					</Stack>
				</ScrollView>
			</View>
		</Page>
	)
}
