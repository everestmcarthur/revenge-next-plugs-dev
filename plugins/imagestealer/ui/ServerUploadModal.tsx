import { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Image,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { getManageableGuilds, uploadEmojiToGuild } from '../api'
import {
	ActionSheet,
	BottomSheetTitleHeader,
	Button,
	hideActionSheet,
	showToast,
	TableRowGroup,
	TextInput,
} from '../components'
import { getStoredSettings } from '../storage'
import type { GuildEmojiSlotInfo, StealableAsset } from '../types'

export const SERVER_UPLOAD_SHEET_KEY = 'ImageStealerServerUploadSheet'

interface ServerUploadModalProps {
	asset: StealableAsset
	onSuccess?: () => void
}

export default function ServerUploadModal({
	asset,
	onSuccess,
}: ServerUploadModalProps) {
	const [name, setName] = useState(asset.name || 'stolen_emoji')
	const [guilds, setGuilds] = useState<GuildEmojiSlotInfo[]>([])
	const [selectedGuildId, setSelectedGuildId] = useState<string>('')
	const [uploading, setUploading] = useState(false)
	const [loadingGuilds, setLoadingGuilds] = useState(true)

	useEffect(() => {
		const list = getManageableGuilds()
		setGuilds(list)
		// Select first guild that is not full
		const available = list.find(g =>
			asset.animated ? !g.isAnimatedFull : !g.isStaticFull,
		)
		if (available) {
			setSelectedGuildId(available.guildId)
		} else if (list[0]) {
			setSelectedGuildId(list[0].guildId)
		}
		setLoadingGuilds(false)
	}, [asset.animated])

	const selectedGuild = guilds.find(g => g.guildId === selectedGuildId)
	const isTargetFull = asset.animated
		? Boolean(selectedGuild?.isAnimatedFull)
		: Boolean(selectedGuild?.isStaticFull)

	const handleUpload = async () => {
		if (!selectedGuildId) {
			showToast('Please select a target server')
			return
		}
		if (isTargetFull) {
			showToast('Selected server is full. Please choose another server.')
			return
		}

		setUploading(true)
		const settings = getStoredSettings()
		const res = await uploadEmojiToGuild(
			selectedGuildId,
			name,
			asset.url,
			settings.autoCompress,
		)
		setUploading(false)

		if (res.success) {
			showToast(`Uploaded :${name}: to ${selectedGuild?.guildName}!`)
			hideActionSheet(SERVER_UPLOAD_SHEET_KEY)
			onSuccess?.()
		} else {
			showToast(res.error || 'Failed to upload emoji')
		}
	}

	return (
		<ActionSheet>
			<BottomSheetTitleHeader
				title="Upload to Server"
				subtitle={
					asset.animated ? 'Animated Emoji (.gif)' : 'Static Emoji (.png/.webp)'
				}
			/>

			<ScrollView
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
			>
				{/* Preview & Name Editor */}
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						marginVertical: 12,
						padding: 12,
						backgroundColor: 'rgba(255,255,255,0.06)',
						borderRadius: 12,
					}}
				>
					<Image
						source={{ uri: asset.url }}
						style={{
							width: 48,
							height: 48,
							borderRadius: 8,
							marginRight: 12,
							resizeMode: 'contain',
						}}
					/>
					<View style={{ flex: 1 }}>
						<TextInput
							label="Emoji Name"
							value={name}
							onChange={(v: any) => {
								const t =
									typeof v === 'string'
										? v
										: (v?.nativeEvent?.text ?? v?.text ?? '')
								setName(t.replace(/[^a-zA-Z0-9_]/g, '_'))
							}}
							onChangeText={(v: string) =>
								setName(v.replace(/[^a-zA-Z0-9_]/g, '_'))
							}
							placeholder="emoji_name"
						/>
					</View>
				</View>

				{/* Full Slot Warning if target is full */}
				{isTargetFull && (
					<View
						style={{
							backgroundColor: 'rgba(237, 66, 69, 0.15)',
							borderWidth: 1,
							borderColor: '#ED4245',
							borderRadius: 8,
							padding: 12,
							marginBottom: 12,
						}}
					>
						<Text
							style={{ color: '#ED4245', fontWeight: 'bold', fontSize: 13 }}
						>
							⚠️ Server Emoji Slots Full (50/50)!
						</Text>
						<Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>
							This server has reached its maximum{' '}
							{asset.animated ? 'animated' : 'static'} emoji limit. Please
							select another server below or create a new stash server.
						</Text>
					</View>
				)}

				{/* Server Picker */}
				<TableRowGroup
					title="Select Stash Server"
					description="Choose a server where you have Manage Emojis permissions"
				>
					{loadingGuilds ? (
						<ActivityIndicator
							size="small"
							color="#5865F2"
							style={{ marginVertical: 16 }}
						/>
					) : guilds.length === 0 ? (
						<View style={{ padding: 16 }}>
							<Text
								style={{ color: '#9A9A9A', fontSize: 13, textAlign: 'center' }}
							>
								No servers found where you have Manage Emojis permissions.
							</Text>
						</View>
					) : (
						guilds.map(g => {
							const isSelected = g.guildId === selectedGuildId
							const isFull = asset.animated ? g.isAnimatedFull : g.isStaticFull
							const count = asset.animated ? g.animatedCount : g.staticCount
							const max = asset.animated ? g.maxAnimated : g.maxStatic

							return (
								<TouchableOpacity
									key={g.guildId}
									onPress={() => setSelectedGuildId(g.guildId)}
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										padding: 12,
										borderBottomWidth: 1,
										borderColor: 'rgba(255,255,255,0.06)',
										backgroundColor: isSelected
											? 'rgba(88, 101, 242, 0.15)'
											: 'transparent',
									}}
								>
									{g.iconUrl ? (
										<Image
											source={{ uri: g.iconUrl }}
											style={{
												width: 36,
												height: 36,
												borderRadius: 18,
												marginRight: 12,
											}}
										/>
									) : (
										<View
											style={{
												width: 36,
												height: 36,
												borderRadius: 18,
												backgroundColor: '#35373C',
												alignItems: 'center',
												justifyContent: 'center',
												marginRight: 12,
											}}
										>
											<Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
												{g.guildName.slice(0, 2).toUpperCase()}
											</Text>
										</View>
									)}

									<View style={{ flex: 1 }}>
										<Text
											style={{
												color: '#FFFFFF',
												fontSize: 14,
												fontWeight: isSelected ? 'bold' : 'normal',
											}}
											numberOfLines={1}
										>
											{g.guildName}
										</Text>
										<Text
											style={{
												color: isFull ? '#ED4245' : '#9A9A9A',
												fontSize: 12,
												marginTop: 2,
											}}
										>
											{isFull
												? `⚠️ Full (${count}/${max})`
												: `${count}/${max} slots used`}
										</Text>
									</View>

									{isSelected && (
										<View
											style={{
												width: 18,
												height: 18,
												borderRadius: 9,
												backgroundColor: '#5865F2',
												alignItems: 'center',
												justifyContent: 'center',
											}}
										>
											<Text
												style={{
													color: '#FFFFFF',
													fontSize: 11,
													fontWeight: 'bold',
												}}
											>
												✓
											</Text>
										</View>
									)}
								</TouchableOpacity>
							)
						})
					)}
				</TableRowGroup>

				{/* Upload Action Button */}
				<View style={{ marginTop: 16 }}>
					<Button
						text={
							uploading
								? 'Uploading...'
								: isTargetFull
									? 'Server Full'
									: 'Upload Emoji'
						}
						variant="primary"
						disabled={uploading || isTargetFull || !selectedGuildId}
						loading={uploading}
						onPress={handleUpload}
					/>
				</View>
			</ScrollView>
		</ActionSheet>
	)
}
