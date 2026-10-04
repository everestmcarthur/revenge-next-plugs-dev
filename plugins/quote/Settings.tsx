import { fetchUserConfig, saveUserConfig } from './api'
import { TextInput } from './components'
import { getCurrentUserId, showToast } from './quotes'
import { defaultSettings } from './storage'
import type { PluginApi } from '@revenge-mod/plugins/types'
import type { BlockSetting, StoredSettings } from './types'

function getRevenge(): any {
	try {
		if (typeof revenge !== 'undefined') return revenge
	} catch {}
	return (globalThis as any).revenge
}

export default function Settings({
	api,
}: {
	api?: PluginApi<{ jsonStorage: StoredSettings }>
}) {
	const rev = getRevenge()
	const { Page } = rev?.components || {}
	const { ScrollView, View } = rev?.react?.ReactNative || {}
	const {
		Stack,
		SegmentedControl,
		SegmentedControlPages,
		TableRowGroup,
		TableSwitchRow,
		TableRadioGroup,
		TableRadioRow,
		TableRow,
		Button,
		useSegmentedControlState,
	} = rev?.discord?.design?.Design || {}
	const { useState, useEffect } = rev?.react?.React || {}

	const [pageWidth, setPageWidth] = useState(0)

	// State management via plugin storage or reactive local state
	const storage =
		api?.jsonStorage ??
		(rev?.jsonStorage?.getJsonStorage?.('dev.everestmcarthur.quote') || null)
	const s: StoredSettings = {
		...defaultSettings,
		...(storage?.use?.() ?? storage?.cache ?? {}),
		defaultSettings: {
			...defaultSettings.defaultSettings,
			...(storage?.use?.()?.defaultSettings ??
				storage?.cache?.defaultSettings ??
				{}),
		},
		zipline: {
			...defaultSettings.zipline,
			...(storage?.use?.()?.zipline ?? storage?.cache?.zipline ?? {}),
		},
	}

	// Local states for text inputs for smooth typing
	const [ziplineHost, setZiplineHost] = useState(
		s.zipline.host ?? 'i.allyapp.cc',
	)
	const [ziplineToken, setZiplineToken] = useState(s.zipline.token ?? '')
	const [watermarkText, setWatermarkText] = useState(
		s.defaultSettings.watermarkText ?? 'Make It A Quote',
	)
	const [apiUrl, setApiUrl] = useState(
		s.apiUrl ?? 'http://127.0.0.1:8081/fakequote',
	)

	useEffect(() => {
		setZiplineHost(s.zipline.host ?? 'i.allyapp.cc')
	}, [s.zipline.host])

	useEffect(() => {
		setZiplineToken(s.zipline.token ?? '')
	}, [s.zipline.token])

	useEffect(() => {
		setWatermarkText(s.defaultSettings.watermarkText ?? 'Make It A Quote')
	}, [s.defaultSettings.watermarkText])

	useEffect(() => {
		setApiUrl(s.apiUrl ?? 'http://127.0.0.1:8081/fakequote')
	}, [s.apiUrl])

	const updateStorageOnly = (patch: Partial<StoredSettings>) => {
		const updated = {
			...s,
			...patch,
			defaultSettings: {
				...s.defaultSettings,
				...(patch.defaultSettings ?? {}),
			},
			zipline: {
				...s.zipline,
				...(patch.zipline ?? {}),
			},
		}
		if (storage?.set) {
			storage.set(updated)
		}
	}

	const set = (patch: Partial<StoredSettings>) => {
		const updated = {
			...s,
			...patch,
			defaultSettings: {
				...s.defaultSettings,
				...(patch.defaultSettings ?? {}),
			},
			zipline: {
				...s.zipline,
				...(patch.zipline ?? {}),
			},
		}
		if (storage?.set) {
			storage.set(updated)
		}
		syncToCloud(updated)
	}

	const [syncing, setSyncing] = useState(false)
	const [cloudStatus, setCloudStatus] = useState('Checking...')

	const syncToCloud = async (custom?: StoredSettings) => {
		const userId = getCurrentUserId()
		if (!userId) {
			setCloudStatus('Not logged in')
			return
		}

		const cfg = custom || s
		setSyncing(true)
		setCloudStatus('Syncing...')
		try {
			const success = await saveUserConfig(userId, {
				blockMode: cfg.blockMode,
				allowCustomQuotes: cfg.allowCustomQuotes,
				forceDisableCustomQuotes: cfg.forceDisableCustomQuotes,
				defaultSettings: cfg.defaultSettings,
			})
			if (success) {
				setCloudStatus('Synced with Cloudflare')
			} else {
				setCloudStatus('Sync failed (Offline / Error)')
			}
		} catch {
			setCloudStatus('Sync error')
		} finally {
			setSyncing(false)
		}
	}

	useEffect(() => {
		const userId = getCurrentUserId()
		if (!userId) return

		fetchUserConfig(userId).then(cloudConfig => {
			if (cloudConfig) {
				set({
					blockMode: cloudConfig.blockMode || s.blockMode,
					allowCustomQuotes:
						typeof cloudConfig.allowCustomQuotes === 'boolean'
							? cloudConfig.allowCustomQuotes
							: s.allowCustomQuotes,
					forceDisableCustomQuotes: Boolean(
						cloudConfig.forceDisableCustomQuotes,
					),
					defaultSettings: {
						...s.defaultSettings,
						...(cloudConfig.defaultSettings ?? {}),
					},
				})
				setCloudStatus('Synced with Cloudflare')
			} else {
				setCloudStatus('Ready to sync')
			}
		})
	}, [])

	// Check if Zipline plugin is installed in Revenge
	const ziplineInstalled = Boolean(
		rev?.everest?.getRegisteredPlugin?.('dev.everestmcarthur.zipline') ||
			rev?.jsonStorage?.getJsonStorage?.('dev.everestmcarthur.zipline'),
	)

	// Tabbed navigation state
	const segmented = useSegmentedControlState({
		items: [
			{
				id: 'sync',
				label: 'Sync',
				page: (
					<ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
						<Stack spacing={16}>
							{/* Cloudflare Privacy Sync */}
							<TableRowGroup
								title="Cloudflare Privacy Database"
								description="Sync your privacy rules so other users respect your quote settings"
							>
								<TableRow
									label="Database Status"
									subLabel={`miq-backend.allyapp.workers.dev (${cloudStatus})`}
								/>
								<View style={{ marginHorizontal: 16, marginVertical: 8 }}>
									<Button
										text="Sync Preferences to Cloud"
										variant="secondary"
										size="sm"
										loading={syncing}
										onPress={() => {
											syncToCloud()
											showToast('Synced settings to Cloudflare KV')
										}}
									/>
								</View>
							</TableRowGroup>

							{/* Quote Rendering Engine */}
							<TableRowGroup
								title="Quote Rendering Engine"
								description="Backend service used to generate quote cards"
							>
								<TextInput
									label="API Endpoint"
									placeholder="http://127.0.0.1:8081/fakequote"
									value={apiUrl}
									onChange={(v: any) => {
										const text =
											typeof v === 'string'
												? v
												: (v?.nativeEvent?.text ?? v?.text ?? '')
										setApiUrl(text)
										updateStorageOnly({ apiUrl: text })
									}}
									onChangeText={(v: string) => {
										setApiUrl(v)
										updateStorageOnly({ apiUrl: v })
									}}
								/>
							</TableRowGroup>

							{/* Optional Zipline Integration */}
							<TableRowGroup
								title="Zipline Storage"
								description="Store generated quotes on a self-hosted Zipline server and share direct links"
							>
								<TableSwitchRow
									label="Upload Quotes to Zipline"
									subLabel={
										ziplineInstalled
											? 'Zipline plugin detected - syncs automatically'
											: 'Upload quote cards to Zipline instead of temporary cloud CDN'
									}
									value={s.zipline.enabled}
									onValueChange={v =>
										updateStorageOnly({
											zipline: { ...s.zipline, enabled: v },
										})
									}
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
											updateStorageOnly({
												zipline: { ...s.zipline, host: text },
											})
										}}
										onChangeText={(h: string) => {
											setZiplineHost(h)
											updateStorageOnly({
												zipline: { ...s.zipline, host: h },
											})
										}}
									/>
								)}
								{s.zipline.enabled && (
									<TextInput
										label="Zipline API Token"
										placeholder="Paste token or leave empty to use plugin token"
										value={ziplineToken}
										secureTextEntry
										onChange={(t: any) => {
											const text =
												typeof t === 'string'
													? t
													: (t?.nativeEvent?.text ?? t?.text ?? '')
											setZiplineToken(text)
											updateStorageOnly({
												zipline: { ...s.zipline, token: text },
											})
										}}
										onChangeText={(t: string) => {
											setZiplineToken(t)
											updateStorageOnly({
												zipline: { ...s.zipline, token: t },
											})
										}}
									/>
								)}
							</TableRowGroup>
						</Stack>
					</ScrollView>
				),
			},
			{
				id: 'blocking',
				label: 'Blocking',
				page: (
					<ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
						<Stack spacing={16}>
							{/* Block Settings */}
							<TableRowGroup
								title="Quote Privacy & Blocking"
								description="Allow or disallow Quotes to be created from your messages"
							>
								<TableRadioGroup
									value={s.blockMode}
									onChange={(v: BlockSetting) => set({ blockMode: v })}
								>
									<TableRadioRow
										label="Never block"
										subLabel="Allow anyone to create quotes from your messages"
										value="never"
									/>
									<TableRadioRow
										label="Block messages containing spoilers"
										subLabel="Prevent quotes from messages containing ||spoilers||"
										value="spoilers"
									/>
									<TableRadioRow
										label="Block on all messages"
										subLabel="Prevent all quote creation from your messages"
										value="all"
									/>
								</TableRadioGroup>
							</TableRowGroup>

							{/* Custom Quote Permissions */}
							<TableRowGroup
								title="Custom Quote Permissions"
								description="Allow or disallow fictitious Quotes to be created using your profile"
								helperText="Users cannot edit your username, avatar, or text in custom quotes when disabled."
							>
								<TableSwitchRow
									label="Allow Custom Quotes"
									subLabel="Allow users to edit content or create custom quotes with your profile"
									value={s.allowCustomQuotes}
									onValueChange={v => set({ allowCustomQuotes: v })}
								/>
								<TableSwitchRow
									label="Force Disable Custom Quotes"
									subLabel="Completely disable Custom Quotes regardless of server size"
									value={s.forceDisableCustomQuotes}
									onValueChange={v => set({ forceDisableCustomQuotes: v })}
								/>
							</TableRowGroup>
						</Stack>
					</ScrollView>
				),
			},
			{
				id: 'defaults',
				label: 'Defaults',
				page: (
					<ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
						<Stack spacing={16}>
							{/* Action Sheet Behavior */}
							<TableRowGroup
								title="Action Sheet Behavior"
								description="Configure how quoting behaves directly from chat"
							>
								<TableSwitchRow
									label="Auto-send Quote to Channel"
									subLabel="Immediately generate and send quote card into chat without opening customization popup"
									value={s.instantQuote}
									onValueChange={v => updateStorageOnly({ instantQuote: v })}
								/>
							</TableRowGroup>

							{/* Default Styling */}
							<TableRowGroup
								title="Default Quote Style"
								description="Default options used when creating quotes"
							>
								<TableSwitchRow
									label="Colored Avatar / Profile"
									subLabel="Render user avatar in full color instead of black & white"
									value={s.defaultSettings.color}
									onValueChange={v =>
										set({
											defaultSettings: {
												...s.defaultSettings,
												color: v,
											},
										})
									}
								/>
								<TableSwitchRow
									label="Bold Text"
									subLabel="Render quote text in bold"
									value={s.defaultSettings.bold}
									onValueChange={v =>
										set({
											defaultSettings: {
												...s.defaultSettings,
												bold: v,
											},
										})
									}
								/>
								<TableSwitchRow
									label="Watermark"
									subLabel="Include watermark in bottom right corner"
									value={s.defaultSettings.watermark}
									onValueChange={v =>
										set({
											defaultSettings: {
												...s.defaultSettings,
												watermark: v,
											},
										})
									}
								/>
								{s.defaultSettings.watermark && (
									<TextInput
										label="Default Watermark Text"
										placeholder="Make It A Quote"
										value={watermarkText}
										onChange={(t: any) => {
											const text =
												typeof t === 'string'
													? t
													: (t?.nativeEvent?.text ?? t?.text ?? '')
											setWatermarkText(text)
											updateStorageOnly({
												defaultSettings: {
													...s.defaultSettings,
													watermarkText: text,
												},
											})
										}}
										onChangeText={(t: string) => {
											setWatermarkText(t)
											updateStorageOnly({
												defaultSettings: {
													...s.defaultSettings,
													watermarkText: t,
												},
											})
										}}
									/>
								)}
								<TableSwitchRow
									label="Light Background"
									subLabel="Default to light mode background"
									value={s.defaultSettings.light}
									onValueChange={v =>
										set({
											defaultSettings: {
												...s.defaultSettings,
												light: v,
											},
										})
									}
								/>
								<TableSwitchRow
									label="Flip Layout"
									subLabel="Default to flipped avatar and text"
									value={s.defaultSettings.flip}
									onValueChange={v =>
										set({
											defaultSettings: {
												...s.defaultSettings,
												flip: v,
											},
										})
									}
								/>
								<TableSwitchRow
									label="Modern Layout"
									subLabel="Default to modern quote layout"
									value={s.defaultSettings.new}
									onValueChange={v =>
										set({
											defaultSettings: {
												...s.defaultSettings,
												new: v,
											},
										})
									}
								/>
								<TableSwitchRow
									label="Single-frame GIF"
									subLabel="Default format to single-frame GIF"
									value={s.defaultSettings.gif}
									onValueChange={v =>
										set({
											defaultSettings: {
												...s.defaultSettings,
												gif: v,
											},
										})
									}
								/>
							</TableRowGroup>
						</Stack>
					</ScrollView>
				),
			},
		],
		pageWidth,
	})

	return (
		<Page>
			<View
				style={{ flex: 1 }}
				onLayout={(e: any) => setPageWidth(e.nativeEvent.layout.width)}
			>
				<View
					style={{
						paddingTop: 12,
						paddingBottom: 20,
						paddingHorizontal: 16,
					}}
				>
					<SegmentedControl
						state={segmented}
						variant="default"
						keyboardShouldPersistTaps="handled"
					/>
				</View>
				<SegmentedControlPages state={segmented} style={{ flex: 1 }} />
			</View>
		</Page>
	)
}
