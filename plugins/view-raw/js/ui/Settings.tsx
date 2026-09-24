import { Design } from '@revenge-mod/discord/design'
import { ScrollView, View } from 'react-native'
import type { PluginApi } from '@revenge-mod/plugins/types'

export default function Settings({ api }: { api: PluginApi }) {
	const { Card, Stack, Text, TableRowGroup, TableRow } = Design

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: '#1E1F22' }}
			contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
		>
			<Stack spacing={16}>
				<Card>
					<View style={{ padding: 16 }}>
						<Text variant="heading-md/semibold" style={{ color: '#FFFFFF' }}>
							ViewRaw
						</Text>
						<Text
							variant="text-sm/normal"
							color="text-muted"
							style={{ marginTop: 6 }}
						>
							View any message's complete underlying Discord payload, embeds,
							components, and metadata in a syntax-highlighted, searchable JSON
							viewer.
						</Text>
					</View>
				</Card>

				<TableRowGroup title="HOW TO USE">
					<TableRow
						label="Long-press any message"
						subLabel="In the message action sheet, tap 'View Raw' to open the payload inspector."
					/>
					<TableRow
						label="Slash Command"
						subLabel="Use /viewraw message_id (if Client Utils is installed) to inspect by ID."
					/>
				</TableRowGroup>
			</Stack>
		</ScrollView>
	)
}
