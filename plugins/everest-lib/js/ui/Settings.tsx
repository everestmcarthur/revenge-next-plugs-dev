import PluginList from './PluginList'

export default function Settings() {
	const { Page } =
		revenge.components as typeof import('@revenge-mod/components')
	const { ScrollView, View } = revenge.react.ReactNative
	const { Stack, Text, Card } = revenge.discord.design.Design

	return (
		<Page>
			<View style={{ flex: 1, position: 'relative' }}>
				<ScrollView contentContainerStyle={{ padding: 16 }}>
					<Stack spacing={16}>
						<Card>
							<View style={{ padding: 16 }}>
								<Text variant="heading-md/semibold">
									Everest Library
								</Text>
								<Text
									variant="text-sm/normal"
									color="text-muted"
									style={{ marginTop: 6 }}
								>
									Shared utility modules, Discord finders,
									navigators, and native helpers for Everest
									plugins on Revenge Next.
								</Text>
							</View>
						</Card>
						<PluginList />
					</Stack>
				</ScrollView>
			</View>
		</Page>
	)
}
