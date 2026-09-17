import type { NotificationItem } from '../lib/types'
import {
	copyToClipboard,
	showToast,
	navigateToChannel,
	navigateToGuild,
	openUserProfile,
} from '../lib/navigation'

export function openNotificationContextMenu({
	item,
	onDelete,
}: {
	item: NotificationItem
	onDelete: () => void
}) {
	const actions = revenge.discord?.actions?.ActionSheetActionCreators
	if (!actions?.openLazy) return

	actions.openLazy(
		Promise.resolve({
			default: () => {
				const {
					ActionSheet,
					BottomSheetTitleHeader,
					ActionSheetCloseButton,
					TableRowGroup,
					TableRow,
					Stack,
				} = (revenge.discord?.design?.Design ?? {}) as any
				const { TableRowAssetIcon } = (revenge.components ?? {}) as any

				const handleCopy = (text: string, label: string) => {
					copyToClipboard(text)
					showToast(`Copied ${label}`)
					actions.hideActionSheet()
				}

				return (
					<ActionSheet
						header={
							<BottomSheetTitleHeader
								title="Notification Actions"
								subtitle={item.title}
								trailing={
									<ActionSheetCloseButton
										onPress={() => actions.hideActionSheet()}
									/>
								}
							/>
						}
					>
						<Stack spacing={8} style={{ padding: 16, paddingBottom: 32 }}>
							{/* Quick Navigation Options */}
							<TableRowGroup title="Navigation">
								{item.channelId && (
									<TableRow
										label="Jump to Channel / Message"
										subLabel={item.channelName || 'View message location'}
										icon={
											TableRowAssetIcon ? (
												<TableRowAssetIcon name="ChatIcon" />
											) : undefined
										}
										onPress={() => {
											actions.hideActionSheet()
											navigateToChannel(item.guildId, item.channelId, item.messageId)
										}}
									/>
								)}
								{item.guildId && item.guildId !== '@me' && (
									<TableRow
										label="Jump to Server"
										subLabel={item.guildName || 'View Server'}
										icon={
											TableRowAssetIcon ? (
												<TableRowAssetIcon name="ServerIcon" />
											) : undefined
										}
										onPress={() => {
											actions.hideActionSheet()
											navigateToGuild(item.guildId!)
										}}
									/>
								)}
								{item.author?.id && (
									<TableRow
										label="View Profile"
										subLabel={item.author.globalName || item.author.username}
										icon={
											TableRowAssetIcon ? (
												<TableRowAssetIcon name="UserIcon" />
											) : undefined
										}
										onPress={() => {
											actions.hideActionSheet()
											openUserProfile(item.author!.id)
										}}
									/>
								)}
							</TableRowGroup>

							{/* Copy Details */}
							<TableRowGroup title="Copy Information">
								{item.author?.id && (
									<TableRow
										label="Copy User ID"
										subLabel={item.author.id}
										icon={
											TableRowAssetIcon ? (
												<TableRowAssetIcon name="CopyIcon" />
											) : undefined
										}
										onPress={() => handleCopy(item.author!.id, 'User ID')}
									/>
								)}
								{item.messageId && (
									<TableRow
										label="Copy Message ID"
										subLabel={item.messageId}
										icon={
											TableRowAssetIcon ? (
												<TableRowAssetIcon name="CopyIcon" />
											) : undefined
										}
										onPress={() => handleCopy(item.messageId!, 'Message ID')}
									/>
								)}
								{item.channelId && (
									<TableRow
										label="Copy Channel ID"
										subLabel={item.channelId}
										icon={
											TableRowAssetIcon ? (
												<TableRowAssetIcon name="CopyIcon" />
											) : undefined
										}
										onPress={() => handleCopy(item.channelId!, 'Channel ID')}
									/>
								)}
								{item.guildId && item.guildId !== '@me' && (
									<TableRow
										label="Copy Server ID"
										subLabel={item.guildId}
										icon={
											TableRowAssetIcon ? (
												<TableRowAssetIcon name="CopyIcon" />
											) : undefined
										}
										onPress={() => handleCopy(item.guildId!, 'Server ID')}
									/>
								)}
								{item.content && (
									<TableRow
										label="Copy Message Content"
										subLabel={
											item.content.length > 50
												? `${item.content.slice(0, 50)}...`
												: item.content
										}
										icon={
											TableRowAssetIcon ? (
												<TableRowAssetIcon name="CopyIcon" />
											) : undefined
										}
										onPress={() => handleCopy(item.content, 'Message Content')}
									/>
								)}
							</TableRowGroup>

							{/* Delete */}
							<TableRowGroup>
								<TableRow
									label="Remove from Inbox"
									variant="danger"
									icon={
										TableRowAssetIcon ? (
											<TableRowAssetIcon name="TrashIcon" />
										) : undefined
									}
									onPress={() => {
										actions.hideActionSheet()
										onDelete()
									}}
								/>
							</TableRowGroup>
						</Stack>
					</ActionSheet>
				)
			},
		}),
		`betterinbox-actions:${item.id}`,
	)
}
