import { View, Text, TouchableOpacity, ScrollView, StyleSheet, FlatList } from 'react-native'
import {
	categoryLabel,
	NotificationCard,
} from './NotificationCard'
import {
	getNotifications,
	subscribeToNotifications,
	clearNotifications,
	deleteNotification,
} from '../lib/notifications'
import type { MentionSubCategory, NotificationCategory, NotificationItem } from '../lib/types'

export default function NotificationCenter({
	hideHeader = false,
}: {
	hideHeader?: boolean
} = {}): JSX.Element {
	const React = revenge.react.React

	const [activeTabIdx, setActiveTabIdx] = React.useState(0)
	const [mentionFilterIdx, setMentionFilterIdx] = React.useState(0)
	const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0)

	const categories: NotificationCategory[] = [
		'mentions',
		'replies',
		'reactions',
		'friend_request',
		'thread',
		'other',
	]
	const subFilters: MentionSubCategory[] = ['all', 'people', 'role', 'bot']

	const currentCategory = categories[activeTabIdx] ?? 'mentions'
	const currentMentionFilter = subFilters[mentionFilterIdx] ?? 'all'

	React.useEffect(() => {
		const unsub = subscribeToNotifications(() => forceUpdate())
		return () => unsub()
	}, [])

	const notifications = getNotifications()

	const displayedNotifications = React.useMemo(() => {
		const filtered = notifications.filter((n) => {
			if (currentCategory === 'mentions') {
				if (n.category !== 'mentions') return false
				if (currentMentionFilter === 'all') return true
				return n.subCategory === currentMentionFilter
			}
			return n.category === currentCategory
		})

		if (currentCategory === 'mentions' && currentMentionFilter === 'bot') {
			return filtered.slice(0, 50)
		}

		return filtered
	}, [notifications, currentCategory, currentMentionFilter])

	return (
		<View style={styles.container}>
			{(!hideHeader || displayedNotifications.length > 0) && (
				<View style={styles.headerBar}>
					{!hideHeader ? (
						<Text style={styles.headerTitle}>Notification Center</Text>
					) : (
						<View style={{ flex: 1 }} />
					)}
					{displayedNotifications.length > 0 && (
						<TouchableOpacity onPress={() => clearNotifications(currentCategory)}>
							<Text style={styles.clearButtonText}>
								Clear {categoryLabel(currentCategory)}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			)}

			{/* Category Navigation Pills */}
			<View style={styles.pillsWrapper}>
				<FlatList
					horizontal
					data={categories}
					keyExtractor={(cat) => cat}
					showsHorizontalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={styles.pillsContainer}
					renderItem={({ item: cat, index: idx }: { item: NotificationCategory; index: number }) => {
						const active = activeTabIdx === idx
						const count = notifications.filter((n) => n.category === cat).length
						return (
							<TouchableOpacity
								style={[styles.pill, active && styles.activePill]}
								onPress={() => setActiveTabIdx(idx)}
							>
								<Text style={[styles.pillText, active && styles.activePillText]}>
									{categoryLabel(cat)}
									{count > 0 ? ` (${count})` : ''}
								</Text>
							</TouchableOpacity>
						)
					}}
				/>
			</View>

			{/* Mention Sub-filters */}
			{currentCategory === 'mentions' && (
				<View style={styles.subFilterWrapper}>
					<View style={styles.subFilterBar}>
						{subFilters.map((sub, idx) => (
							<TouchableOpacity
								key={sub}
								style={[
									styles.subFilterButton,
									mentionFilterIdx === idx && styles.activeSubFilter,
								]}
								onPress={() => setMentionFilterIdx(idx)}
							>
								<Text
									style={[
										styles.subFilterText,
										mentionFilterIdx === idx && styles.activeSubFilterText,
									]}
								>
									{sub.toUpperCase()}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>
			)}

			{/* Notification List */}
			<FlatList
				data={displayedNotifications}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.feed}
				renderItem={({ item }: { item: NotificationItem }) => (
					<NotificationCard
						item={item}
						onDelete={() => deleteNotification(item.id)}
					/>
				)}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>
							No {categoryLabel(currentCategory).toLowerCase()} notifications found.
						</Text>
					</View>
				}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#111214',
	},
	headerBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
	},
	headerTitle: {
		color: '#F2F3F5',
		fontSize: 20,
		fontWeight: '700',
	},
	clearButtonText: {
		color: '#F23F43',
		fontSize: 14,
		fontWeight: '600',
	},
	pillsWrapper: {
		paddingVertical: 6,
		height: 48,
	},
	pillsContainer: {
		alignItems: 'center',
		paddingHorizontal: 12,
		gap: 8,
	},
	pill: {
		paddingHorizontal: 14,
		paddingVertical: 7,
		borderRadius: 20,
		backgroundColor: '#2B2D31',
	},
	activePill: {
		backgroundColor: '#5865F2',
	},
	pillText: {
		color: '#949BA4',
		fontSize: 13,
		fontWeight: '600',
	},
	activePillText: {
		color: '#FFFFFF',
	},
	subFilterWrapper: {
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	subFilterBar: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		backgroundColor: '#1E1F22',
		borderRadius: 8,
		padding: 3,
	},
	subFilterButton: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 6,
		borderRadius: 6,
	},
	activeSubFilter: {
		backgroundColor: '#2B2D31',
	},
	subFilterText: {
		color: '#949BA4',
		fontSize: 11,
		fontWeight: '700',
	},
	activeSubFilterText: {
		color: '#FFFFFF',
	},
	feed: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		paddingBottom: 40,
	},
	emptyContainer: {
		padding: 48,
		alignItems: 'center',
	},
	emptyText: {
		color: '#949BA4',
		fontSize: 14,
		textAlign: 'center',
	},
})
