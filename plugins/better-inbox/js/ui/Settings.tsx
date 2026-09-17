import type { PluginApi } from '@revenge-mod/plugins/types'
import type { BetterInboxStorage } from '../lib/types'
import { openNotificationCenter } from '../patches/youbar'
import { clearNotifications } from '../lib/notifications'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: BetterInboxStorage }>
}) {
	const { Page } = revenge.components as typeof import('@revenge-mod/components')
	const { ScrollView, View } = revenge.react.ReactNative
	const {
		TableRowGroup,
		TableSwitchRow,
		TableRow,
		Stack,
		Card,
		Text,
		Button,
	} = (revenge.discord?.design?.Design ?? {}) as any

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
								<Text variant="heading-md/semibold">BetterInbox</Text>
								<Text
									variant="text-sm/normal"
									color="text-muted"
									style={{ marginTop: 6 }}
								>
									Categorizes mentions, replies, reactions, and thread adds into an organized notification feed.
								</Text>
								<View style={{ marginTop: 14 }}>
									<Button
										text="Open Notification Center"
										variant="primary"
										size="sm"
										onPress={openNotificationCenter}
									/>
								</View>
							</View>
						</Card>

						<TableRowGroup title="YouBar Integration">
							<TableSwitchRow
								label="Replace YouBar Notifications Button"
								subLabel="Clicking the bell on the YouBar opens the BetterInbox center instead."
								value={storage?.showYouBarButton !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ showYouBarButton: v })
								}
							/>
						</TableRowGroup>

						<TableRowGroup title="In-App & Device Notifications">
							<TableSwitchRow
								label="Block In-App Heads-Up Banners"
								subLabel="Prevents in-app notification toasts from popping onto your screen while using Discord."
								value={!!storage?.blockSystemNotifications}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ blockSystemNotifications: v })
								}
							/>
						</TableRowGroup>

						<TableRowGroup title="Tracking Categories">
							<TableSwitchRow
								label="Track Mentions"
								subLabel="Direct and role mentions in servers and channels."
								value={storage?.trackMentions !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ trackMentions: v })
								}
							/>
							<TableSwitchRow
								label="Track Replies"
								subLabel="Direct replies to your messages."
								value={storage?.trackReplies !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ trackReplies: v })
								}
							/>
							<TableSwitchRow
								label="Track Reactions"
								subLabel="Reactions added to messages you sent."
								value={storage?.trackReactions !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ trackReactions: v })
								}
							/>
							<TableSwitchRow
								label="Track Friend Requests"
								subLabel="Incoming and accepted friend requests."
								value={storage?.trackFriendRequests !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ trackFriendRequests: v })
								}
							/>
							<TableSwitchRow
								label="Track Threads"
								subLabel="When you are added to a new thread."
								value={storage?.trackThreads !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ trackThreads: v })
								}
							/>
							<TableSwitchRow
								label="Track Friend Status Updates"
								subLabel="When friends change their custom status message."
								value={!!storage?.trackPresence}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ trackPresence: v })
								}
							/>
						</TableRowGroup>

						<TableRowGroup title="Storage & Maintenance">
							<TableRow
								label="Clear All Stored Notifications"
								subLabel={`Currently storing ${storage?.notifications?.length ?? 0} items`}
								onPress={() => clearNotifications()}
							/>
						</TableRowGroup>
					</Stack>
				</ScrollView>
			</View>
		</Page>
	)
}
