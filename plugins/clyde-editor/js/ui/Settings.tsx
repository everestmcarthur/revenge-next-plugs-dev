import { Design } from '@revenge-mod/discord/design'
import { Image, ScrollView, TouchableOpacity, View } from 'react-native'
import type { PluginApi } from '@revenge-mod/plugins/types'
import { PRESETS } from '../lib/presets'
import { CLYDE_DEFAULTS, type ClydeEditorStorage } from '../lib/types'
import { sendTestClydeMessage, updateActiveClydeMessages } from '../patches/clyde'
import ColorInput from './ColorInput'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: ClydeEditorStorage }>
}) {
	const { TableRowGroup, TableSwitchRow, TextInput, Text, Button } = Design
	const liveStorage = api.jsonStorage.use()
	const storage = { ...CLYDE_DEFAULTS, ...(liveStorage ?? {}) }

	const isDestroyed = !!storage.destroyClyde
	const currentName = storage.name || 'Clyde'
	const currentAvatar =
		storage.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'
	const currentTagText = storage.tagText || 'APP'
	const currentTagBg = storage.tagBackgroundColor || '#5865F2'
	const currentTagTextCol = storage.tagTextColor || '#FFFFFF'
	const currentColor = storage.color || '#5865F2'

	const handleSave = () => {
		updateActiveClydeMessages(api.jsonStorage)
		try {
			api.plugin.requireReload()
		} catch {}
	}

	const applyPreset = (presetId: string) => {
		const p = PRESETS.find(pr => pr.id === presetId)
		if (!p) return
		api.jsonStorage.set({
			name: p.name,
			avatar: p.avatar,
			banner: p.banner || '',
			bio: p.bio,
			tagText: p.tagText,
			tagTextColor: p.tagTextColor || '#FFFFFF',
			tagBackgroundColor: p.tagBackgroundColor || '#5865F2',
			tagVerified: p.tagVerified ?? true,
			color: p.color || '#5865F2',
			selectedPreset: p.id,
		})
		updateActiveClydeMessages(api.jsonStorage)
	}

	return (
		<ScrollView style={{ flex: 1, backgroundColor: '#1E1F22' }}>
			{/* Save Header Action */}
			<View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
				<Button
					variant="primary"
					text="💾 Save & Prompt Reload"
					onPress={handleSave}
				/>
			</View>

			{/* Destroy Clyde */}
			<TableRowGroup title="DESTROY CLYDE">
				<TableSwitchRow
					label="Destroy Clyde"
					value={isDestroyed}
					onValueChange={(v: boolean) => {
						api.jsonStorage.set({ destroyClyde: v })
					}}
				/>
				<View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
					<Text variant="text-sm/normal" color="text-muted">
						When enabled, intercepts and completely prevents Clyde messages, errors, and replies from ever rendering or appearing in chat.
					</Text>
				</View>
			</TableRowGroup>

			{isDestroyed && (
				<View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
					<View
						style={{
							backgroundColor: '#DA373C22',
							borderColor: '#DA373C',
							borderWidth: 1,
							borderRadius: 8,
							padding: 12,
						}}
					>
						<Text
							variant="text-md/bold"
							style={{ color: '#F23F43', marginBottom: 4 }}
						>
							Clyde is currently destroyed
						</Text>
						<Text variant="text-sm/normal" style={{ color: '#DBDEE1' }}>
							All Clyde messages are intercepted and blocked from rendering. Disable this option to restore Clyde.
						</Text>
					</View>
				</View>
			)}

			{/* Preview Card */}
			<View style={{ padding: 16 }}>
				<Text variant="eyebrow" color="text-muted" style={{ marginBottom: 8 }}>
					LIVE PREVIEW
				</Text>
				<View
					style={{
						backgroundColor: '#2B2D31',
						borderRadius: 12,
						padding: 14,
						borderWidth: 1,
						borderColor: 'rgba(255,255,255,0.08)',
					}}
				>
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						<Image
							source={{ uri: currentAvatar }}
							style={{
								width: 42,
								height: 42,
								borderRadius: 21,
								backgroundColor: '#35373C',
							}}
						/>
						<View style={{ marginLeft: 12, flex: 1 }}>
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									flexWrap: 'wrap',
								}}
							>
								<Text
									variant="text-md/bold"
									style={{
										color: currentColor,
										marginRight: 6,
										fontWeight: '700',
									}}
								>
									{currentName}
								</Text>
								<View
									style={{
										backgroundColor: currentTagBg,
										borderRadius: 4,
										paddingHorizontal: 5,
										paddingVertical: 1,
										flexDirection: 'row',
										alignItems: 'center',
									}}
								>
									{storage.tagVerified && (
										<Text
											style={{
												color: currentTagTextCol,
												fontSize: 10,
												marginRight: 2,
												fontWeight: 'bold',
											}}
										>
											✓
										</Text>
									)}
									<Text
										style={{
											color: currentTagTextCol,
											fontSize: 10,
											fontWeight: '800',
										}}
									>
										{currentTagText}
									</Text>
								</View>
							</View>
							<Text
								variant="text-sm/normal"
								style={{ color: '#DBDEE1', marginTop: 4 }}
							>
								{storage.bio || "I'm your friendly Discord bot companion!"}
							</Text>
						</View>
					</View>
				</View>
			</View>

			{/* Presets */}
			<TableRowGroup title="AI PRESETS">
				<View
					style={{
						flexDirection: 'row',
						flexWrap: 'wrap',
						paddingHorizontal: 16,
						paddingVertical: 8,
						gap: 8,
					}}
				>
					{PRESETS.map(p => {
						const isSelected = storage.selectedPreset === p.id
						return (
							<TouchableOpacity
								key={p.id}
								onPress={() => applyPreset(p.id)}
								style={{
									backgroundColor: isSelected ? '#5865F2' : '#313338',
									borderRadius: 8,
									paddingHorizontal: 12,
									paddingVertical: 8,
									borderWidth: 1,
									borderColor: isSelected ? '#5865F2' : 'rgba(255,255,255,0.1)',
								}}
							>
								<Text
									variant="text-sm/semibold"
									style={{
										color: isSelected ? '#FFFFFF' : '#DBDEE1',
										fontWeight: '600',
									}}
								>
									{p.name}
								</Text>
							</TouchableOpacity>
						)
					})}
				</View>
			</TableRowGroup>

			{/* Appearance */}
			<TableRowGroup title="APPEARANCE">
				<TextInput
					label="Bot Name"
					placeholder="Clyde"
					value={storage.name ?? 'Clyde'}
					onChange={(v: string) => {
						api.jsonStorage.set({ name: v, selectedPreset: 'custom' })
						updateActiveClydeMessages(api.jsonStorage)
					}}
				/>
				<TextInput
					label="Avatar URL"
					placeholder="https://..."
					value={storage.avatar ?? ''}
					onChange={(v: string) => {
						api.jsonStorage.set({ avatar: v, selectedPreset: 'custom' })
						updateActiveClydeMessages(api.jsonStorage)
					}}
				/>
				<TextInput
					label="Banner URL"
					placeholder="https://..."
					value={storage.banner ?? ''}
					onChange={(v: string) =>
						api.jsonStorage.set({ banner: v, selectedPreset: 'custom' })
					}
				/>
				<ColorInput
					title="Role / Name Color"
					value={storage.color}
					placeholder="#5865F2"
					onChange={(v: string) => {
						api.jsonStorage.set({ color: v, selectedPreset: 'custom' })
						updateActiveClydeMessages(api.jsonStorage)
					}}
				/>
			</TableRowGroup>

			{/* Bot Badge */}
			<TableRowGroup title="BOT BADGE">
				<TextInput
					label="Badge Text"
					placeholder="APP"
					value={storage.tagText ?? 'APP'}
					onChange={(v: string) => {
						api.jsonStorage.set({ tagText: v, selectedPreset: 'custom' })
						updateActiveClydeMessages(api.jsonStorage)
					}}
				/>
				<ColorInput
					title="Badge Background Color"
					value={storage.tagBackgroundColor}
					placeholder="#5865F2"
					onChange={(v: string) => {
						api.jsonStorage.set({
							tagBackgroundColor: v,
							selectedPreset: 'custom',
						})
						updateActiveClydeMessages(api.jsonStorage)
					}}
				/>
				<ColorInput
					title="Badge Text Color"
					value={storage.tagTextColor}
					placeholder="#FFFFFF"
					onChange={(v: string) => {
						api.jsonStorage.set({
							tagTextColor: v,
							selectedPreset: 'custom',
						})
						updateActiveClydeMessages(api.jsonStorage)
					}}
				/>
				<TableSwitchRow
					label="Verified Checkmark"
					value={storage.tagVerified ?? true}
					onValueChange={(v: boolean) => {
						api.jsonStorage.set({ tagVerified: v, selectedPreset: 'custom' })
						updateActiveClydeMessages(api.jsonStorage)
					}}
				/>
			</TableRowGroup>

			{/* Profile Bio */}
			<TableRowGroup title="ABOUT ME">
				<TextInput
					label="Bio / Description"
					placeholder="I'm your friendly Discord bot companion!"
					value={storage.bio ?? "I'm your friendly Discord bot companion!"}
					onChange={(v: string) =>
						api.jsonStorage.set({ bio: v, selectedPreset: 'custom' })
					}
				/>
			</TableRowGroup>

			{/* Actions */}
			<TableRowGroup title="ACTIONS">
				<View style={{ padding: 16, gap: 12 }}>
					<Button
						variant="primary"
						text="💾 Save & Prompt Reload"
						onPress={handleSave}
					/>
					<Button
						variant="secondary"
						text="Send Test Message to Chat"
						onPress={() => {
							sendTestClydeMessage(api.jsonStorage)
						}}
					/>
					<Button
						variant="secondary"
						text="Reset to Default Clyde"
						onPress={() => applyPreset('clyde')}
					/>
				</View>
			</TableRowGroup>

			<View style={{ height: 40 }} />
		</ScrollView>
	)
}
