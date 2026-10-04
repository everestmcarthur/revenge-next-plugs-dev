import { useState } from 'react'
import {
	ActivityIndicator,
	Image,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import {
	downloadAsset,
	resolveZiplineCredentials,
	saveCloudflareVault,
	uploadToZipline,
} from '../api'
import {
	ActionSheet,
	BottomSheetTitleHeader,
	Button,
	copyToClipboard,
	getCurrentUserId,
	openLazyActionSheet,
	showToast,
} from '../components'
import { addVaultItemToStorage, getStoredSettings } from '../storage'
import ServerUploadModal, { SERVER_UPLOAD_SHEET_KEY } from './ServerUploadModal'
import type { StealableAsset, VaultItem } from '../types'

export const STEALER_ACTION_SHEET_KEY = 'ImageStealerActionSheet'

interface StealerActionSheetProps {
	assets: StealableAsset[]
	messageId?: string
	channelId?: string
}

export default function StealerActionSheet({
	assets,
}: StealerActionSheetProps) {
	const [busyId, setBusyId] = useState<string | null>(null)
	const [bulkSaving, setBulkSaving] = useState(false)

	const handleSaveToVault = async (asset: StealableAsset) => {
		setBusyId(asset.id)
		const vaultItem: VaultItem = {
			id: asset.id,
			name: asset.name,
			url: asset.url,
			animated: asset.animated,
			type: asset.type,
			addedAt: Date.now(),
		}
		const updated = addVaultItemToStorage(vaultItem)
		const userId = getCurrentUserId()
		if (userId && updated.syncWithCloud) {
			saveCloudflareVault(userId, updated.vault)
		}
		setBusyId(null)
		showToast(`Added :${asset.name}: to your Vault!`)
	}

	const handleStealAll = async () => {
		setBulkSaving(true)
		let current = getStoredSettings()
		for (const asset of assets) {
			const vaultItem: VaultItem = {
				id: asset.id,
				name: asset.name,
				url: asset.url,
				animated: asset.animated,
				type: asset.type,
				addedAt: Date.now(),
			}
			current = addVaultItemToStorage(vaultItem)
		}
		const userId = getCurrentUserId()
		if (userId && current.syncWithCloud) {
			await saveCloudflareVault(userId, current.vault)
		}
		setBulkSaving(false)
		showToast(`Saved all ${assets.length} items to your Vault!`)
	}

	const handleDownload = async (asset: StealableAsset) => {
		setBusyId(asset.id)
		await downloadAsset(asset.url, asset.name)
		setBusyId(null)
	}

	const handleZipline = async (asset: StealableAsset) => {
		const creds = resolveZiplineCredentials()
		if (!creds?.token) {
			showToast('Zipline token not configured. Check plugin settings.')
			return
		}
		setBusyId(asset.id)
		const zUrl = await uploadToZipline(asset.url, creds.token, creds.host)
		setBusyId(null)
		if (zUrl) {
			copyToClipboard(zUrl, 'Zipline URL copied to clipboard!')
		} else {
			showToast('Failed to upload to Zipline')
		}
	}

	const openServerUpload = (asset: StealableAsset) => {
		openLazyActionSheet(
			async () => ({
				default: (props: any) => <ServerUploadModal {...props} asset={asset} />,
			}),
			SERVER_UPLOAD_SHEET_KEY,
		)
	}

	return (
		<ActionSheet>
			<BottomSheetTitleHeader
				title="ImageStealer"
				subtitle={`${assets.length} stealable asset${assets.length === 1 ? '' : 's'} found`}
			/>

			<ScrollView
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
			>
				{assets.length > 1 && (
					<View style={{ marginBottom: 12 }}>
						<Button
							text={
								bulkSaving
									? 'Saving...'
									: `Save All to Vault (${assets.length})`
							}
							variant="secondary"
							size="sm"
							loading={bulkSaving}
							onPress={handleStealAll}
						/>
					</View>
				)}

				{assets.length === 0 ? (
					<View style={{ padding: 24, alignItems: 'center' }}>
						<Text style={{ color: '#9A9A9A', fontSize: 14 }}>
							No custom emojis or stickers found in this message.
						</Text>
					</View>
				) : (
					assets.map(asset => {
						const isBusy = busyId === asset.id

						return (
							<View
								key={asset.id || asset.url}
								style={{
									backgroundColor: 'rgba(255,255,255,0.05)',
									borderRadius: 12,
									padding: 12,
									marginBottom: 10,
								}}
							>
								{/* Header: Preview, Name, Type */}
								<View
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										marginBottom: 10,
									}}
								>
									<Image
										source={{ uri: asset.url }}
										style={{
											width: 44,
											height: 44,
											borderRadius: 6,
											marginRight: 10,
											resizeMode: 'contain',
										}}
									/>
									<View style={{ flex: 1 }}>
										<Text
											style={{
												color: '#FFFFFF',
												fontSize: 14,
												fontWeight: 'bold',
											}}
											numberOfLines={1}
										>
											:{asset.name}:
										</Text>
										<View style={{ flexDirection: 'row', marginTop: 3 }}>
											<View
												style={{
													backgroundColor: asset.animated
														? 'rgba(235, 69, 158, 0.2)'
														: 'rgba(88, 101, 242, 0.2)',
													paddingHorizontal: 6,
													paddingVertical: 2,
													borderRadius: 4,
													marginRight: 6,
												}}
											>
												<Text
													style={{
														color: asset.animated ? '#EB459E' : '#5865F2',
														fontSize: 10,
														fontWeight: 'bold',
													}}
												>
													{asset.animated ? 'ANIMATED' : 'STATIC'}
												</Text>
											</View>
											<View
												style={{
													backgroundColor: 'rgba(255,255,255,0.1)',
													paddingHorizontal: 6,
													paddingVertical: 2,
													borderRadius: 4,
												}}
											>
												<Text style={{ color: '#CCCCCC', fontSize: 10 }}>
													{asset.type.toUpperCase()}
												</Text>
											</View>
										</View>
									</View>

									{isBusy && (
										<ActivityIndicator
											size="small"
											color="#5865F2"
											style={{ marginLeft: 8 }}
										/>
									)}
								</View>

								{/* Action Buttons Row */}
								<View style={{ flexDirection: 'row', gap: 6 }}>
									<TouchableOpacity
										onPress={() => openServerUpload(asset)}
										disabled={isBusy}
										style={{
											flex: 1,
											backgroundColor: '#5865F2',
											paddingVertical: 8,
											borderRadius: 6,
											alignItems: 'center',
										}}
									>
										<Text
											style={{
												color: '#FFFFFF',
												fontSize: 12,
												fontWeight: 'bold',
											}}
										>
											Server
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => handleSaveToVault(asset)}
										disabled={isBusy}
										style={{
											flex: 1,
											backgroundColor: 'rgba(255,255,255,0.12)',
											paddingVertical: 8,
											borderRadius: 6,
											alignItems: 'center',
										}}
									>
										<Text
											style={{
												color: '#FFFFFF',
												fontSize: 12,
												fontWeight: 'bold',
											}}
										>
											Vault
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => handleDownload(asset)}
										disabled={isBusy}
										style={{
											flex: 1,
											backgroundColor: 'rgba(255,255,255,0.12)',
											paddingVertical: 8,
											borderRadius: 6,
											alignItems: 'center',
										}}
									>
										<Text
											style={{
												color: '#FFFFFF',
												fontSize: 12,
												fontWeight: 'bold',
											}}
										>
											Save
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => handleZipline(asset)}
										disabled={isBusy}
										style={{
											flex: 1,
											backgroundColor: 'rgba(255,255,255,0.12)',
											paddingVertical: 8,
											borderRadius: 6,
											alignItems: 'center',
										}}
									>
										<Text
											style={{
												color: '#FFFFFF',
												fontSize: 12,
												fontWeight: 'bold',
											}}
										>
											Zipline
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						)
					})
				)}
			</ScrollView>
		</ActionSheet>
	)
}
