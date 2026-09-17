import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import type { NotificationCategory, NotificationItem } from '../lib/types'
import { getAvatarUrl, navigateToChannel, openUserProfile } from '../lib/navigation'
import { openNotificationContextMenu } from './NotificationContextMenu'

export function categoryLabel(cat: NotificationCategory): string {
	switch (cat) {
		case 'friend_request':
			return 'Friends'
		case 'thread':
			return 'Threads'
		case 'mentions':
			return 'Mentions'
		case 'replies':
			return 'Replies'
		case 'reactions':
			return 'Reactions'
		case 'other':
			return 'Activity'
	}
}

export function NotificationCard({
	item,
	onDelete,
}: {
	item: NotificationItem
	onDelete: () => void
}) {
	const React = revenge.react.React
	const { IconButton } = revenge.discord?.design?.Design ?? {}

	const location = item.guildName
		? `${item.guildName} • ${item.channelName}`
		: item.channelName

	const handlePress = () => {
		if (
			(item.category === 'friend_request' || (!item.channelId && !item.guildId)) &&
			item.author?.id
		) {
			openUserProfile(item.author.id)
			return
		}

		if (item.channelId || item.guildId) {
			navigateToChannel(item.guildId, item.channelId, item.messageId)
		}
	}

	const handleLongPress = () => {
		openNotificationContextMenu({ item, onDelete })
	}

	let MoreIcon: any
	try {
		MoreIcon =
			revenge.assets.getAssetIdByName('MoreHorizontalIcon') ??
			revenge.assets.getAssetIdByName('ic_more_24px') ??
			revenge.assets.getAssetIdByName('ic_horizontal_dots_24px')
	} catch {}

	return (
		<TouchableOpacity
			style={styles.card}
			onPress={handlePress}
			onLongPress={handleLongPress}
			delayLongPress={300}
			activeOpacity={0.75}
		>
			<View style={styles.cardHeader}>
				<View style={styles.headerLeft}>
					<Image
						source={{ uri: getAvatarUrl(item.author) }}
						style={styles.avatarImage}
					/>
					<Text style={styles.cardTitle} numberOfLines={1}>
						{item.title}
					</Text>
				</View>
				<View style={styles.headerRight}>
					<Text style={styles.timestamp}>{item.timestamp}</Text>
					{IconButton && MoreIcon && (
						<IconButton
							size="xs"
							variant="tertiary"
							icon={MoreIcon}
							accessibilityLabel="More Options"
							onPress={(e: any) => {
								e?.stopPropagation?.()
								handleLongPress()
							}}
						/>
					)}
				</View>
			</View>

			<View style={styles.cardBody}>
				{Boolean(item.content) && (
					<Text style={styles.cardContent} numberOfLines={2}>
						{item.content}
					</Text>
				)}
				{Boolean(location) && (
					<Text style={styles.location} numberOfLines={1}>
						{location}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#1E1F22',
		borderRadius: 12,
		marginVertical: 4,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.08)',
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#2B2D31',
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 8,
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	avatarImage: {
		width: 26,
		height: 26,
		borderRadius: 13,
		marginRight: 8,
		backgroundColor: '#4e5058',
	},
	cardTitle: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
		flex: 1,
	},
	timestamp: {
		color: '#949BA4',
		fontSize: 11,
	},
	cardBody: {
		padding: 12,
	},
	cardContent: {
		color: '#DBDEE1',
		fontSize: 13,
		lineHeight: 18,
		marginBottom: 4,
	},
	location: {
		color: '#949BA4',
		fontSize: 11,
		fontWeight: '500',
	},
})
