import type { PluginApi } from '@revenge-mod/plugins/types'
import type { YouBarPlusStorage } from '../lib/types'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: YouBarPlusStorage }>
}) {
	const { Page } =
		revenge.components as typeof import('@revenge-mod/components')
	const { ScrollView, View } = revenge.react.ReactNative
	const { TableRowGroup, TableSwitchRow, Stack, Card, Text } =
		revenge.discord.design.Design

	const storage = api.jsonStorage.use()

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
									Customize the YouBar bottom navigation with
									shortcuts for Direct Messages and User
									Settings.
								</Text>
							</View>
						</Card>

						<TableRowGroup title="Buttons">
							<TableSwitchRow
								label="Direct Messages Button"
								subLabel="Show quick jump to Direct Messages in the YouBar"
								value={!!storage?.showDMButton}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ showDMButton: v })
								}
							/>
							<TableSwitchRow
								label="Settings Button"
								subLabel="Show quick jump to User Settings in the YouBar"
								value={!!storage?.showSettingsButton}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({
										showSettingsButton: v,
									})
								}
							/>
						</TableRowGroup>
					</Stack>
				</ScrollView>
			</View>
		</Page>
	)
}
