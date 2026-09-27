import { Design } from '@revenge-mod/discord/design'
import { ScrollView, View } from 'react-native'
import type { PluginApi } from '@revenge-mod/plugins/types'
import type { ZiplineStorage } from '../lib/types'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: ZiplineStorage }>
}) {
	const { TableRowGroup, TableSwitchRow, TextInput, Text, Card, Stack } = Design
	const storage = api.jsonStorage.use()

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: '#1E1F22' }}
			contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
			keyboardShouldPersistTaps="handled"
		>
			<Stack spacing={16}>
				<Card>
					<View style={{ padding: 16 }}>
						<Text variant="heading-md/semibold" style={{ color: '#FFFFFF' }}>
							Zipline Integration
						</Text>
						<Text
							variant="text-sm/normal"
							color="text-muted"
							style={{ marginTop: 6 }}
						>
							Upload attachments and shorten URLs through your self-hosted
							Zipline instance. Requires an API token from your Zipline
							dashboard (Account Settings → Token).
						</Text>
					</View>
				</Card>

				<TableRowGroup title="SERVER CONFIGURATION">
					<TextInput
						label="Zipline Host"
						placeholder="i.allyapp.cc"
						value={storage?.host ?? ''}
						onChange={(v: string) => api.jsonStorage.set({ host: v })}
					/>
					<TextInput
						label="Direct Upload Host"
						placeholder="direct-i.allyapp.cc"
						value={storage?.directHost ?? ''}
						onChange={(v: string) => api.jsonStorage.set({ directHost: v })}
					/>
					<TextInput
						label="API Token"
						placeholder="Paste your Zipline token here"
						value={storage?.token ?? ''}
						secureTextEntry
						onChange={(v: string) => api.jsonStorage.set({ token: v })}
					/>
				</TableRowGroup>

				<TableRowGroup title="BEHAVIOR">
					<TableSwitchRow
						label="Auto-upload attachments"
						subLabel="Upload attachments to Zipline, strip Discord native attachments, and append the Zipline link to the message."
						value={storage?.autoUpload !== false}
						onValueChange={(v: boolean) =>
							api.jsonStorage.set({ autoUpload: v })
						}
					/>
					<TableSwitchRow
						label="Auto-chunk large uploads"
						subLabel="Route uploads larger than 90 MB through direct host to bypass Cloudflare limits (413 Payload Too Large)."
						value={storage?.chunkUpload !== false}
						onValueChange={(v: boolean) =>
							api.jsonStorage.set({ chunkUpload: v })
						}
					/>
					<TableSwitchRow
						label="Auto-shorten links"
						subLabel="Shortens URLs via Zipline. GIFs from Tenor, Giphy, and Klipy are automatically preserved so Discord embeds them."
						value={storage?.autoShorten !== false}
						onValueChange={(v: boolean) =>
							api.jsonStorage.set({ autoShorten: v })
						}
					/>
				</TableRowGroup>
			</Stack>
		</ScrollView>
	)
}
