import type { PluginApi } from '@revenge-mod/plugins/types'
import type { SplitMessagesStorage } from '../lib/types'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: SplitMessagesStorage }>
}) {
	const { Page } =
		revenge.components as typeof import('@revenge-mod/components')
	const { ScrollView, View } = revenge.react.ReactNative
	const {
		TableRowGroup,
		TableSwitchRow,
		Stack,
		Card,
		Text,
	} = revenge.discord.design.Design as any

	const storage = api.jsonStorage.use()

	return (
		<Page>
			<View style={{ flex: 1 }}>
				<ScrollView
					contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
					keyboardShouldPersistTaps="handled"
				>
					<Stack spacing={16}>
						<Card>
							<View style={{ padding: 16 }}>
								<Text variant="heading-md/semibold">Split Messages</Text>
								<Text
									variant="text-sm/normal"
									color="text-muted"
									style={{ marginTop: 6 }}
								>
									Messages over Discord'\''s character limit (2,000, or 4,000 with Nitro)
									are automatically divided into multiple messages and sent in sequential order.
								</Text>
							</View>
						</Card>

						<TableRowGroup title="Splitting Configuration">
							<TableSwitchRow
								label="Split on words instead of paragraphs"
								subLabel="Off: keep paragraphs together where possible. On: split at word boundaries."
								value={!!storage?.splitOnWords}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ splitOnWords: v })
								}
							/>
							<TableSwitchRow
								label="Show Character Counter from Character 1"
								subLabel="Display character count and message chunk count right away when typing."
								value={storage?.showCharacterCounter !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ showCharacterCounter: v })
								}
							/>
						</TableRowGroup>
					</Stack>
				</ScrollView>
			</View>
		</Page>
	)
}
