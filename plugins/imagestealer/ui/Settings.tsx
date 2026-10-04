import { useEffect, useState } from 'react'
import {
	Alert,
	Dimensions,
	FlatList,
	Image,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import {
	fetchCloudflareVault,
	getManageableGuilds,
	saveCloudflareVault,
} from '../api'
import {
	Button,
	copyToClipboard,
	getCurrentUserId,
	SearchInput,
	showToast,
	TableRow,
	TableRowGroup,
	TableSwitchRow,
	TextInput,
	useSegmentedControlState,
} from '../components'
import {
	getStoredSettings,
	removeVaultItemFromStorage,
	updateStoredSettings,
} from '../storage'
import type {
	GuildEmojiSlotInfo,
	SendFormat,
	StoredSettings,
	VaultItem,
} from '../types'

export default function Settings() {
	const [s, setS] = useState<StoredSettings>(getStoredSettings())
	const [vault, setVault] = useState<VaultItem[]>(s.vault)
	const [vaultQuery, setVaultQuery] = useState('')
	const [cloudStatus, setCloudStatus] = useState('Ready')
	const [syncing, setSyncing] = useState(false)
	const [guilds, setGuilds] = useState<GuildEmojiSlotInfo[]>([])
	const [loadingGuilds, setLoadingGuilds] = useState(false)

	const [apiUrl, setApiUrl] = useState(s.apiUrl)
	const [ziplineHost, setZiplineHost] = useState(s.zipline.host)
	const [ziplineToken, setZiplineToken] = useState(s.zipline.token)

	useEffect(() => {
		const updated = getStoredSettings()
		setS(updated)
		setVault(updated.vault)
	}, [])

	const handleSync = async () => {
		const userId = getCurrentUserId()
		if (!userId) {
			showToast('You must be logged in to sync with Cloudflare')
			return
		}
		setSyncing(true)
		setCloudStatus('Syncing...')
		const cloudItems = await fetchCloudflareVault(userId)
		// Merge local with cloud
		const merged = [...cloudItems]
		for (const l of s.vault) {
			if (!merged.some(m => m.id === l.id)) {
				merged.push(l)
			}
		}
		const ok = await saveCloudflareVault(userId, merged)
		setSyncing(false)
		if (ok) {
			setCloudStatus('Synced with Cloudflare KV')
			const updated = updateStoredSettings({ vault: merged })
			setS(updated)
			setVault(merged)
			showToast('Vault successfully synced with Cloudflare!')
		} else {
			setCloudStatus('Sync Failed')
			showToast('Failed to sync with Cloudflare')
		}
	}

	const loadGuilds = () => {
		setLoadingGuilds(true)
		const list = getManageableGuilds()
		setGuilds(list)
		setLoadingGuilds(false)
	}

	const handleDeleteItem = (item: VaultItem) => {
		Alert.alert(
			'Delete from Vault',
			`Are you sure you want to remove :${item.name}: from your Vault?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						const updated = removeVaultItemFromStorage(item.id)
						setS(updated)
						setVault(updated.vault)
						const userId = getCurrentUserId()
						if (userId && updated.syncWithCloud) {
							saveCloudflareVault(userId, updated.vault)
						}
						showToast(`Removed :${item.name}: from Vault`)
					},
				},
			],
		)
	}

	const filteredVault = vault.filter(i =>
		i.name.toLowerCase().includes(vaultQuery.toLowerCase()),
	)

	const screenWidth = Dimensions.get('window').width
	const numColumns = 4
	const itemSize = Math.floor((screenWidth - 48) / numColumns)

	const segmented = useSegmentedControlState({
		items: [
			{
				id: 'vault',
				label: 'Vault',
				page: (
					<View style={{ flex: 1 }}>
						<View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
							<SearchInput
								placeholder="Search your Vault..."
								value={vaultQuery}
								onChange={setVaultQuery}
								onChangeText={setVaultQuery}
							/>
						</View>

						{filteredVault.length === 0 ? (
							<View style={{ padding: 32, alignItems: 'center' }}>
								<Text
									style={{
										color: '#9A9A9A',
										fontSize: 14,
										textAlign: 'center',
									}}
								>
									{vault.length === 0
										? 'No emojis or stickers in your Vault yet.\nLong-press any message in chat to steal some!'
										: 'No matching items.'}
								</Text>
							</View>
						) : (
							<FlatList
								data={filteredVault}
								keyExtractor={item => item.id}
								numColumns={numColumns}
								contentContainerStyle={{
									paddingHorizontal: 16,
									paddingBottom: 24,
								}}
								renderItem={({ item }) => (
									<TouchableOpacity
										onPress={() => {
											Alert.alert(
												`:${item.name}:`,
												`Type: ${item.type.toUpperCase()}${item.animated ? ' (ANIMATED)' : ''}`,
												[
													{ text: 'Cancel', style: 'cancel' },
													{
														text: 'Copy URL',
														onPress: () => copyToClipboard(item.url),
													},
													{
														text: 'Delete',
														style: 'destructive',
														onPress: () => handleDeleteItem(item),
													},
												],
											)
										}}
										style={{
											width: itemSize,
											height: itemSize + 20,
											alignItems: 'center',
											justifyContent: 'center',
											margin: 4,
											backgroundColor: 'rgba(255,255,255,0.06)',
											borderRadius: 8,
											padding: 4,
										}}
									>
										<Image
											source={{ uri: item.url }}
											style={{
												width: itemSize - 20,
												height: itemSize - 20,
												resizeMode: 'contain',
											}}
										/>
										<Text
											style={{ color: '#CCCCCC', fontSize: 10, marginTop: 4 }}
											numberOfLines={1}
										>
											{item.name}
										</Text>
									</TouchableOpacity>
								)}
							/>
						)}
					</View>
				),
			},
			{
				id: 'servers',
				label: 'Stash Servers',
				page: (
					<ScrollView
						contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
					>
						<View style={{ marginVertical: 12 }}>
							<Button
								text={loadingGuilds ? 'Loading...' : 'Scan Emoji Servers'}
								variant="secondary"
								size="sm"
								onPress={loadGuilds}
							/>
						</View>

						<TableRowGroup
							title="Emoji Stash Servers"
							description="Discord servers where you have Manage Emojis permissions"
						>
							{guilds.length === 0 ? (
								<View style={{ padding: 16 }}>
									<Text
										style={{
											color: '#9A9A9A',
											fontSize: 13,
											textAlign: 'center',
										}}
									>
										Tap 'Scan Emoji Servers' to see your server slots and full
										status.
									</Text>
								</View>
							) : (
								guilds.map(g => {
									const isFull = g.isStaticFull || g.isAnimatedFull
									return (
										<View
											key={g.guildId}
											style={{
												flexDirection: 'row',
												alignItems: 'center',
												padding: 12,
												borderBottomWidth: 1,
												borderColor: 'rgba(255,255,255,0.06)',
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
													<Text
														style={{ color: '#FFFFFF', fontWeight: 'bold' }}
													>
														{g.guildName.slice(0, 2).toUpperCase()}
													</Text>
												</View>
											)}

											<View style={{ flex: 1 }}>
												<Text
													style={{
														color: '#FFFFFF',
														fontSize: 14,
														fontWeight: 'bold',
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
													{g.isStaticFull
														? '⚠️ Static FULL (50/50)'
														: `${g.staticCount}/${g.maxStatic} static`}
													{' • '}
													{g.isAnimatedFull
														? '⚠️ Animated FULL (50/50)'
														: `${g.animatedCount}/${g.maxAnimated} animated`}
												</Text>
											</View>
										</View>
									)
								})
							)}
						</TableRowGroup>
					</ScrollView>
				),
			},
			{
				id: 'sync',
				label: 'Cloud & Sync',
				page: (
					<ScrollView
						contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
					>
						<TableRowGroup
							title="Cloudflare KV Vault"
							description="Sync your emoji vault across all your devices using your Cloudflare Worker"
						>
							<TableRow
								label="Cloudflare Status"
								subLabel={`imagestealer-backend.allyapp.workers.dev (${cloudStatus})`}
							/>
							<View style={{ marginHorizontal: 16, marginVertical: 8 }}>
								<Button
									text={syncing ? 'Syncing...' : 'Sync Vault with Cloud'}
									variant="secondary"
									size="sm"
									loading={syncing}
									onPress={handleSync}
								/>
							</View>
							<TextInput
								label="Cloudflare Worker API Endpoint"
								value={apiUrl}
								onChange={(t: any) => {
									const text =
										typeof t === 'string'
											? t
											: (t?.nativeEvent?.text ?? t?.text ?? '')
									setApiUrl(text)
									updateStoredSettings({ apiUrl: text })
								}}
								onChangeText={(text: string) => {
									setApiUrl(text)
									updateStoredSettings({ apiUrl: text })
								}}
								placeholder="https://imagestealer-backend.allyapp.workers.dev"
							/>
						</TableRowGroup>

						{/* Zipline Integration */}
						<TableRowGroup
							title="Zipline Integration"
							description="Optional upload to self-hosted Zipline (i.allyapp.cc)"
						>
							<TableSwitchRow
								label="Enable Zipline Uploads"
								subLabel="Allow 1-click uploads of stolen emojis to Zipline"
								value={s.zipline.enabled}
								onValueChange={v => {
									const updated = updateStoredSettings({
										zipline: { ...s.zipline, enabled: v },
									})
									setS(updated)
								}}
							/>
							{s.zipline.enabled && (
								<TextInput
									label="Zipline Host"
									placeholder="i.allyapp.cc"
									value={ziplineHost}
									onChange={(h: any) => {
										const text =
											typeof h === 'string'
												? h
												: (h?.nativeEvent?.text ?? h?.text ?? '')
										setZiplineHost(text)
										updateStoredSettings({
											zipline: { ...s.zipline, host: text },
										})
									}}
									onChangeText={(text: string) => {
										setZiplineHost(text)
										updateStoredSettings({
											zipline: { ...s.zipline, host: text },
										})
									}}
								/>
							)}
							{s.zipline.enabled && (
								<TextInput
									label="Zipline API Token"
									placeholder="Paste Zipline token"
									value={ziplineToken}
									secureTextEntry
									onChange={(t: any) => {
										const text =
											typeof t === 'string'
												? t
												: (t?.nativeEvent?.text ?? t?.text ?? '')
										setZiplineToken(text)
										updateStoredSettings({
											zipline: { ...s.zipline, token: text },
										})
									}}
									onChangeText={(text: string) => {
										setZiplineToken(text)
										updateStoredSettings({
											zipline: { ...s.zipline, token: text },
										})
									}}
								/>
							)}
						</TableRowGroup>
					</ScrollView>
				),
			},
			{
				id: 'chat',
				label: 'Chat',
				page: (
					<ScrollView
						contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
					>
						<TableRowGroup
							title="Sending Vault Emojis (No Nitro)"
							description="Configure how emojis from your vault are formatted when sent into chat"
						>
							<TableSwitchRow
								label="Nitro-Style Text Replacement"
								subLabel="Type :vault_emoji_name: in chat to automatically send the vault image"
								value={s.nitroBypass}
								onValueChange={v => {
									const updated = updateStoredSettings({ nitroBypass: v })
									setS(updated)
								}}
							/>

							<TableSwitchRow
								label="Auto-Compress Uploads"
								subLabel="Automatically resize emojis if they exceed Discord's 256KB limit"
								value={s.autoCompress}
								onValueChange={v => {
									const updated = updateStoredSettings({ autoCompress: v })
									setS(updated)
								}}
							/>

							<TableRow
								label="Send Format"
								subLabel={
									s.sendFormat === 'cdn'
										? 'Direct CDN URL (?size=48 lossless standard emoji size)'
										: s.sendFormat === 'markdown'
											? 'Inline Markdown Link [​](url)'
											: 'File Attachment'
								}
								onPress={() => {
									const next: SendFormat =
										s.sendFormat === 'cdn'
											? 'markdown'
											: s.sendFormat === 'markdown'
												? 'attachment'
												: 'cdn'
									const updated = updateStoredSettings({ sendFormat: next })
									setS(updated)
									showToast(`Send format set to: ${next.toUpperCase()}`)
								}}
							/>
						</TableRowGroup>
					</ScrollView>
				),
			},
		],
	})

	return (
		<View style={{ flex: 1 }}>
			{/* Segmented Control Bar */}
			<View
				style={{
					flexDirection: 'row',
					borderBottomWidth: 1,
					borderColor: 'rgba(255,255,255,0.08)',
					backgroundColor: 'rgba(0,0,0,0.2)',
				}}
			>
				{segmented.items.map(item => {
					const isSelected = item.id === segmented.selectedId
					return (
						<TouchableOpacity
							key={item.id}
							onPress={() => segmented.setSelectedId(item.id)}
							style={{
								flex: 1,
								paddingVertical: 12,
								alignItems: 'center',
								borderBottomWidth: 2,
								borderColor: isSelected ? '#5865F2' : 'transparent',
							}}
						>
							<Text
								style={{
									color: isSelected ? '#5865F2' : '#9A9A9A',
									fontWeight: isSelected ? 'bold' : 'normal',
									fontSize: 13,
								}}
							>
								{item.label}
							</Text>
						</TouchableOpacity>
					)
				})}
			</View>

			<View style={{ flex: 1 }}>{segmented.activePage}</View>
		</View>
	)
}
