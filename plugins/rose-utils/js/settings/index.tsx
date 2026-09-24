import type { PluginApi } from '@revenge-mod/plugins/types'
import type { RoseUtilsSettings } from '../types'
import { RPC_PRESETS, startCustomPresence, stopCustomPresence } from '../features/rpc'
import { SUPPORTED_LANGUAGES } from '../features/translate'
import { getReact, getReactNative } from '../shared'

interface SettingsProps {
	api: PluginApi<{ jsonStorage: RoseUtilsSettings }>
}

type TabKey =
	| 'charCounter'
	| 'copyRoleColor'
	| 'roleColors'
	| 'userTags'
	| 'silentEdit'
	| 'noTyping'
	| 'rpc'
	| 'translate'
	| 'dislate'
	| 'anonymousFiles'
	| 'validUser'
	| 'serverInfo'
	| 'userNotif'
	| 'uwuify'
	| 'piratifier'
	| 'gifRoulette'
	| 'urbanDictionary'

const TABS: { id: TabKey; label: string }[] = [
	{ id: 'charCounter', label: 'Char Counter' },
	{ id: 'copyRoleColor', label: 'Copy Role Color' },
	{ id: 'roleColors', label: 'Role Colors' },
	{ id: 'userTags', label: 'User Tags' },
	{ id: 'silentEdit', label: 'Silent Edit' },
	{ id: 'noTyping', label: 'No Typing' },
	{ id: 'rpc', label: 'Rich Presence' },
	{ id: 'translate', label: 'Translate' },
	{ id: 'dislate', label: 'Dislate' },
	{ id: 'anonymousFiles', label: 'Anon Files' },
	{ id: 'validUser', label: 'Valid User' },
	{ id: 'serverInfo', label: 'Server Info' },
	{ id: 'userNotif', label: 'User Notif' },
	{ id: 'uwuify', label: 'UwUify' },
	{ id: 'piratifier', label: 'Piratifier' },
	{ id: 'gifRoulette', label: 'GIF Roulette' },
	{ id: 'urbanDictionary', label: 'Urban Dict' },
]

function ControlledInput({
	label,
	defaultValue,
	placeholder,
	onSave,
}: {
	label: string
	defaultValue: string
	placeholder: string
	onSave: (text: string) => void
}) {
	const React = getReact()
	const RN = getReactNative()
	const { View, TextInput } = RN || {}
	const Design = (revenge as any)?.discord?.design?.Design || {}
	const Text = Design.Text || RN?.Text || 'Text'

	const [text, setText] = React.useState(defaultValue || '')
	const timerRef = React.useRef<any>(null)
	const isFocusedRef = React.useRef(false)

	React.useEffect(() => {
		if (!isFocusedRef.current) {
			setText(defaultValue || '')
		}
	}, [defaultValue])

	const handleChange = (val: string) => {
		setText(val)
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => {
			onSave(val)
		}, 300)
	}

	const handleBlur = () => {
		isFocusedRef.current = false
		if (timerRef.current) clearTimeout(timerRef.current)
		onSave(text)
	}

	return (
		<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
			<Text variant="text-sm/semibold" style={{ color: '#ffffff', marginBottom: 4 }}>
				{label}
			</Text>
			<TextInput
				value={text}
				placeholder={placeholder}
				placeholderTextColor="#6d6f78"
				onFocus={() => {
					isFocusedRef.current = true
				}}
				onChangeText={handleChange}
				onBlur={handleBlur}
				style={{
					backgroundColor: '#1e1f22',
					color: '#ffffff',
					borderRadius: 8,
					paddingHorizontal: 12,
					paddingVertical: 10,
					fontSize: 14,
				}}
			/>
		</View>
	)
}

export default function Settings({ api }: SettingsProps) {
	const React = getReact()
	const RN = getReactNative()
	const { ScrollView, View, TouchableOpacity } = RN || {}
	const Design = (revenge as any)?.discord?.design?.Design || {}
	const { TableRowGroup, TableSwitchRow, Text } = Design

	const [activeTab, setActiveTab] = React.useState<TabKey>('charCounter')
	const [rpcActive, setRpcActive] = React.useState<boolean>(false)
	const [newTagUserId, setNewTagUserId] = React.useState<string>('')
	const [newTagText, setNewTagText] = React.useState<string>('')
	const [newTagColor, setNewTagColor] = React.useState<string>('#5865F2')
	const storage = api.jsonStorage.use()

	const update = (patch: Partial<RoseUtilsSettings>) => {
		api.jsonStorage.set(patch)
	}

	return (
		<ScrollView contentContainerStyle={{ padding: 16 }}>
			<View style={{ marginBottom: 16 }}>
				<Text variant="heading-lg/bold" style={{ color: '#ffffff' }}>
					Rose Utils
				</Text>
				<Text variant="text-sm/normal" style={{ color: '#b9bbbe', marginTop: 4 }}>
					All-in-one suite of Discord messaging, media, visual, RPC, and utility enhancements.
				</Text>
			</View>

			<View style={{ marginBottom: 16 }}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					<View style={{ flexDirection: 'row', gap: 6 }}>
						{TABS.map((tab) => {
							const isActive = activeTab === tab.id
							return (
								<TouchableOpacity
									key={tab.id}
									onPress={() => setActiveTab(tab.id)}
									style={{
										backgroundColor: isActive ? '#5865f2' : '#2b2d31',
										paddingHorizontal: 14,
										paddingVertical: 8,
										borderRadius: 20,
									}}
								>
									<Text
										variant="text-xs/bold"
										style={{ color: isActive ? '#ffffff' : '#b9bbbe' }}
									>
										{tab.label}
									</Text>
								</TouchableOpacity>
							)
						})}
					</View>
				</ScrollView>
			</View>

			{activeTab === 'charCounter' && (
				<TableRowGroup title="Character Counter">
					<TableSwitchRow
						label="Enable Character Counter"
						subLabel="Show real-time message character count inside or near the chat input box"
						value={storage.charCounter}
						onValueChange={(v: boolean) => update({ charCounter: v })}
					/>
					{storage.charCounter && (
						<>
							<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
								<Text variant="text-sm/semibold" style={{ color: '#ffffff', marginBottom: 6 }}>
									Display Format
								</Text>
								<View style={{ flexDirection: 'row', gap: 8 }}>
									<TouchableOpacity
										onPress={() => update({ charCounterFormat: 'fraction' })}
										style={{
											flex: 1,
											backgroundColor: (storage.charCounterFormat || 'fraction') === 'fraction' ? '#5865f2' : '#2b2d31',
											paddingVertical: 8,
											borderRadius: 8,
											alignItems: 'center',
										}}
									>
										<Text variant="text-xs/bold" style={{ color: '#ffffff' }}>
											Fraction (n/max)
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => update({ charCounterFormat: 'count' })}
										style={{
											flex: 1,
											backgroundColor: storage.charCounterFormat === 'count' ? '#5865f2' : '#2b2d31',
											paddingVertical: 8,
											borderRadius: 8,
											alignItems: 'center',
										}}
									>
										<Text variant="text-xs/bold" style={{ color: '#ffffff' }}>
											Count Only (n)
										</Text>
									</TouchableOpacity>
								</View>
							</View>

							<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
								<Text variant="text-sm/semibold" style={{ color: '#ffffff', marginBottom: 6 }}>
									Pill Position
								</Text>
								<View style={{ flexDirection: 'row', gap: 8 }}>
									<TouchableOpacity
										onPress={() => update({ charCounterPosition: 'inside-right' })}
										style={{
											flex: 1,
											backgroundColor: (storage.charCounterPosition || 'inside-right') === 'inside-right' ? '#5865f2' : '#2b2d31',
											paddingVertical: 8,
											borderRadius: 8,
											alignItems: 'center',
										}}
									>
										<Text variant="text-xs/bold" style={{ color: '#ffffff' }}>
											Inside Text Area (Right)
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => update({ charCounterPosition: 'above-right' })}
										style={{
											flex: 1,
											backgroundColor: storage.charCounterPosition === 'above-right' ? '#5865f2' : '#2b2d31',
											paddingVertical: 8,
											borderRadius: 8,
											alignItems: 'center',
										}}
									>
										<Text variant="text-xs/bold" style={{ color: '#ffffff' }}>
											Above Bar (Right)
										</Text>
									</TouchableOpacity>
								</View>
							</View>

							<ControlledInput
								label="Custom Text Color (Hex)"
								defaultValue={storage.charCounterCustomColor || ''}
								placeholder="Leave empty for dynamic alerts (#ed4245 / #faa81a)"
								onSave={(val: string) => update({ charCounterCustomColor: val })}
							/>
						</>
					)}
				</TableRowGroup>
			)}

			{activeTab === 'copyRoleColor' && (
				<TableRowGroup title="Copy Role Color">
					<TableSwitchRow
						label="Enable Copy Role Color"
						subLabel="Adds a Copy Role Color button into the role popup whenever you tap any role on a user profile"
						value={storage.copyRoleColor}
						onValueChange={(v: boolean) => update({ copyRoleColor: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'roleColors' && (
				<TableRowGroup title="Role Colors Everywhere">
					<TableSwitchRow
						label="Role Color Everywhere Master Toggle"
						subLabel="Apply user role colors across typing, mentions, voice channels, and chat"
						value={storage.roleColorEverywhere}
						onValueChange={(v: boolean) => update({ roleColorEverywhere: v })}
					/>
					{storage.roleColorEverywhere && (
						<>
							<TableSwitchRow
								label="Role Color in Typing Indicator"
								subLabel="Color users typing in chat with their top role color"
								value={storage.roleColorTyping !== false}
								onValueChange={(v: boolean) => update({ roleColorTyping: v })}
							/>
							<TableSwitchRow
								label="Role Color in User Mentions"
								subLabel="Color user mentions in chat messages with their top role color"
								value={storage.roleColorMentions !== false}
								onValueChange={(v: boolean) => update({ roleColorMentions: v })}
							/>
							<TableSwitchRow
								label="Role Color in Voice Users"
								subLabel="Color usernames in voice channels with their top role color"
								value={storage.roleColorVoice !== false}
								onValueChange={(v: boolean) => update({ roleColorVoice: v })}
							/>
							<TableSwitchRow
								label="Role Color in Chat Messages"
								subLabel="Color author usernames in chat messages"
								value={storage.roleColorChat !== false}
								onValueChange={(v: boolean) => update({ roleColorChat: v })}
							/>
						</>
					)}
				</TableRowGroup>
			)}

			{activeTab === 'userTags' && (
				<TableRowGroup title="Custom User Tags">
					<TableSwitchRow
						label="Enable Custom User Tags"
						subLabel="Display custom badge tags next to user display names in chat messages"
						value={storage.customUserTags}
						onValueChange={(v: boolean) => update({ customUserTags: v })}
					/>
					{storage.customUserTags && (
						<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
							<Text variant="text-sm/semibold" style={{ color: '#ffffff', marginBottom: 4 }}>
								Add New User Tag
							</Text>
							<ControlledInput
								label="User ID"
								defaultValue={newTagUserId}
								placeholder="e.g. 123456789012345678"
								onSave={setNewTagUserId}
							/>
							<ControlledInput
								label="Tag Text"
								defaultValue={newTagText}
								placeholder="e.g. DEV, VIP, FRIEND"
								onSave={setNewTagText}
							/>
							<ControlledInput
								label="Tag Color (Hex)"
								defaultValue={newTagColor}
								placeholder="e.g. #5865F2"
								onSave={setNewTagColor}
							/>
							<TouchableOpacity
								onPress={() => {
									if (newTagUserId.trim() && newTagText.trim()) {
										const currentList = { ...(storage.customUserTagsList || {}) }
										currentList[newTagUserId.trim()] = {
											tag: newTagText.trim(),
											color: newTagColor.trim() || '#5865F2',
											badge: true,
										}
										update({ customUserTagsList: currentList })
										setNewTagUserId('')
										setNewTagText('')
									}
								}}
								style={{
									backgroundColor: '#5865f2',
									paddingVertical: 10,
									borderRadius: 8,
									alignItems: 'center',
									marginTop: 8,
								}}
							>
								<Text variant="text-sm/bold" style={{ color: '#ffffff' }}>
									Save User Tag
								</Text>
							</TouchableOpacity>

							{Object.keys(storage.customUserTagsList || {}).length > 0 && (
								<View style={{ marginTop: 16 }}>
									<Text variant="text-sm/semibold" style={{ color: '#ffffff', marginBottom: 8 }}>
										Saved User Tags
									</Text>
									{Object.entries(storage.customUserTagsList || {}).map(([uid, tagData]) => (
										<View
											key={uid}
											style={{
												flexDirection: 'row',
												alignItems: 'center',
												justifyContent: 'space-between',
												backgroundColor: '#1e1f22',
												padding: 10,
												borderRadius: 8,
												marginBottom: 6,
											}}
										>
											<View style={{ flex: 1 }}>
												<Text variant="text-xs/bold" style={{ color: tagData.color || '#5865f2' }}>
													[{tagData.tag}]
												</Text>
												<Text variant="text-xs/normal" style={{ color: '#b9bbbe' }}>
													{uid}
												</Text>
											</View>
											<TouchableOpacity
												onPress={() => {
													const next = { ...(storage.customUserTagsList || {}) }
													delete next[uid]
													update({ customUserTagsList: next })
												}}
												style={{
													backgroundColor: '#da373c',
													paddingHorizontal: 8,
													paddingVertical: 4,
													borderRadius: 6,
												}}
											>
												<Text variant="text-xs/bold" style={{ color: '#ffffff' }}>
													Delete
												</Text>
											</TouchableOpacity>
										</View>
									))}
								</View>
							)}
						</View>
					)}
				</TableRowGroup>
			)}

			{activeTab === 'silentEdit' && (
				<TableRowGroup title="Silent Edit">
					<TableSwitchRow
						label="Silent Edit Option"
						subLabel="Adds Silent Edit option to message context menus to edit without (edited) tag"
						value={storage.silentEdit}
						onValueChange={(v: boolean) => update({ silentEdit: v })}
					/>
					<TableSwitchRow
						label="Always Silent Edit"
						subLabel="Automatically edit all your messages silently without showing (edited)"
						value={storage.silentEditAlways}
						onValueChange={(v: boolean) => update({ silentEditAlways: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'noTyping' && (
				<TableRowGroup title="No Typing Animation">
					<TableSwitchRow
						label="Enable No Typing"
						subLabel="Master toggle to suppress typing animations"
						value={storage.noTypingAnimation}
						onValueChange={(v: boolean) => update({ noTypingAnimation: v })}
					/>
					{storage.noTypingAnimation && (
						<>
							<TableSwitchRow
								label="Hide Incoming Typing"
								subLabel="Do not show typing indicators from other users in chat"
								value={storage.noTypingHideIncoming !== false}
								onValueChange={(v: boolean) => update({ noTypingHideIncoming: v })}
							/>
							<TableSwitchRow
								label="Suppress Outgoing Typing"
								subLabel="Never send typing status packets so nobody sees you typing"
								value={storage.noTypingStopOutgoing !== false}
								onValueChange={(v: boolean) => update({ noTypingStopOutgoing: v })}
							/>
						</>
					)}
				</TableRowGroup>
			)}

			{activeTab === 'rpc' && (
				<TableRowGroup title="Rich Presence">
					<TableSwitchRow
						label="Enable Custom Rich Presence"
						subLabel="Show a completely custom playing status on your profile"
						value={storage.rpcEnabled}
						onValueChange={(v: boolean) => update({ rpcEnabled: v })}
					/>

					<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
						<Text variant="text-sm/semibold" style={{ color: '#ffffff', marginBottom: 6 }}>
							Presets
						</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							<View style={{ flexDirection: 'row' }}>
								{RPC_PRESETS.map((preset) => (
									<TouchableOpacity
										key={preset.name}
										onPress={() => {
											update({
												rpcAppName: preset.name,
												rpcAppId: preset.id || '',
												rpcDetails: '',
												rpcState: '',
												rpcLargeImage: (preset as any).icon || '',
												rpcLargeText: preset.name,
												rpcSmallImage: '',
												rpcSmallText: '',
											})
										}}
										style={{
											backgroundColor: '#2b2d31',
											paddingHorizontal: 12,
											paddingVertical: 6,
											borderRadius: 16,
											marginRight: 6,
										}}
									>
										<Text variant="text-xs/medium" style={{ color: '#ffffff' }}>
											{preset.label || preset.name}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</ScrollView>
					</View>

					<ControlledInput
						label="Application Name"
						defaultValue={storage.rpcAppName || ''}
						placeholder="e.g. Visual Studio Code, Spotify"
						onSave={(val: string) => update({ rpcAppName: val })}
					/>
					<ControlledInput
						label="Application ID"
						defaultValue={storage.rpcAppId || ''}
						placeholder="Discord App ID (e.g. 383226320970055681)"
						onSave={(val: string) => update({ rpcAppId: val })}
					/>
					<ControlledInput
						label="Details (Line 1)"
						defaultValue={storage.rpcDetails || ''}
						placeholder="e.g. Editing main.tsx"
						onSave={(val: string) => update({ rpcDetails: val })}
					/>
					<ControlledInput
						label="State (Line 2)"
						defaultValue={storage.rpcState || ''}
						placeholder="e.g. Workspace: rose-utils"
						onSave={(val: string) => update({ rpcState: val })}
					/>
					<ControlledInput
						label="Large Image Key or URL"
						defaultValue={storage.rpcLargeImage || ''}
						placeholder="Asset key or https:// link"
						onSave={(val: string) => update({ rpcLargeImage: val })}
					/>
					<ControlledInput
						label="Large Image Hover Text"
						defaultValue={storage.rpcLargeText || ''}
						placeholder="e.g. TypeScript"
						onSave={(val: string) => update({ rpcLargeText: val })}
					/>
					<ControlledInput
						label="Small Image Key or URL"
						defaultValue={storage.rpcSmallImage || ''}
						placeholder="Asset key or https:// link"
						onSave={(val: string) => update({ rpcSmallImage: val })}
					/>
					<ControlledInput
						label="Small Image Hover Text"
						defaultValue={storage.rpcSmallText || ''}
						placeholder="e.g. Idle"
						onSave={(val: string) => update({ rpcSmallText: val })}
					/>
					<ControlledInput
						label="Button 1 Label"
						defaultValue={storage.rpcButton1Label || ''}
						placeholder="e.g. View Repository"
						onSave={(val: string) => update({ rpcButton1Label: val })}
					/>
					<ControlledInput
						label="Button 1 URL"
						defaultValue={storage.rpcButton1Url || ''}
						placeholder="https://..."
						onSave={(val: string) => update({ rpcButton1Url: val })}
					/>
					<ControlledInput
						label="Button 2 Label"
						defaultValue={storage.rpcButton2Label || ''}
						placeholder="e.g. Website"
						onSave={(val: string) => update({ rpcButton2Label: val })}
					/>
					<ControlledInput
						label="Button 2 URL"
						defaultValue={storage.rpcButton2Url || ''}
						placeholder="https://..."
						onSave={(val: string) => update({ rpcButton2Url: val })}
					/>

					<TableSwitchRow
						label="Show Elapsed Time"
						subLabel="Show time elapsed since starting presence"
						value={storage.rpcShowElapsed !== false}
						onValueChange={(v: boolean) => update({ rpcShowElapsed: v })}
					/>

					<View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
						<TouchableOpacity
							onPress={() => {
								const ok = startCustomPresence(storage)
								setRpcActive(ok)
							}}
							style={{
								flex: 1,
								backgroundColor: '#248046',
								paddingVertical: 10,
								borderRadius: 8,
								alignItems: 'center',
							}}
						>
							<Text variant="text-sm/bold" style={{ color: '#ffffff' }}>
								{rpcActive ? 'Update RPC' : 'Start RPC'}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => {
								stopCustomPresence()
								setRpcActive(false)
							}}
							style={{
								flex: 1,
								backgroundColor: '#da373c',
								paddingVertical: 10,
								borderRadius: 8,
								alignItems: 'center',
							}}
						>
							<Text variant="text-sm/bold" style={{ color: '#ffffff' }}>
								Stop RPC
							</Text>
						</TouchableOpacity>
					</View>
				</TableRowGroup>
			)}

			{activeTab === 'translate' && (
				<TableRowGroup title="Auto Translate">
					<TableSwitchRow
						label="Incoming Auto-Translate"
						subLabel="Automatically translate foreign messages sent by other users into your language (local edit only)"
						value={storage.translateIncomingEnabled}
						onValueChange={(v: boolean) => update({ translateIncomingEnabled: v })}
					/>

					<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
						<Text variant="text-sm/semibold" style={{ color: '#ffffff', marginBottom: 6 }}>
							Incoming Target Language ({storage.translateIncomingTargetLang || 'en'})
						</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							<View style={{ flexDirection: 'row' }}>
								{SUPPORTED_LANGUAGES.map((lang) => {
									const isSelected = (storage.translateIncomingTargetLang || 'en') === lang.code
									return (
										<TouchableOpacity
											key={lang.code}
											onPress={() => update({ translateIncomingTargetLang: lang.code })}
											style={{
												backgroundColor: isSelected ? '#5865f2' : '#2b2d31',
												paddingHorizontal: 12,
												paddingVertical: 6,
												borderRadius: 16,
												marginRight: 6,
											}}
										>
											<Text variant="text-xs/medium" style={{ color: '#ffffff' }}>
												{lang.name}
											</Text>
										</TouchableOpacity>
									)
								})}
							</View>
						</ScrollView>
					</View>

					<TableSwitchRow
						label="Outgoing Auto-Translate"
						subLabel="Automatically translate messages you send into your chosen target language"
						value={storage.translateOutgoingEnabled}
						onValueChange={(v: boolean) => update({ translateOutgoingEnabled: v })}
					/>

					<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
						<Text variant="text-sm/semibold" style={{ color: '#ffffff', marginBottom: 6 }}>
							Outgoing Target Language ({storage.translateOutgoingTargetLang || 'en'})
						</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							<View style={{ flexDirection: 'row' }}>
								{SUPPORTED_LANGUAGES.map((lang) => {
									const isSelected = (storage.translateOutgoingTargetLang || 'en') === lang.code
									return (
										<TouchableOpacity
											key={lang.code}
											onPress={() => update({ translateOutgoingTargetLang: lang.code })}
											style={{
												backgroundColor: isSelected ? '#5865f2' : '#2b2d31',
												paddingHorizontal: 12,
												paddingVertical: 6,
												borderRadius: 16,
												marginRight: 6,
											}}
										>
											<Text variant="text-xs/medium" style={{ color: '#ffffff' }}>
												{lang.name}
											</Text>
										</TouchableOpacity>
									)
								})}
							</View>
						</ScrollView>
					</View>
				</TableRowGroup>
			)}

			{activeTab === 'dislate' && (
				<TableRowGroup title="Dislate Context Menu">
					<TableSwitchRow
						label="Enable Dislate"
						subLabel="Adds a Translate Message button to message context menus"
						value={storage.dislate}
						onValueChange={(v: boolean) => update({ dislate: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'anonymousFiles' && (
				<TableRowGroup title="Anonymous File Names">
					<TableSwitchRow
						label="Enable Anonymous File Names"
						subLabel="Randomize uploaded file attachment names to random strings"
						value={storage.anonymousFileNames}
						onValueChange={(v: boolean) => update({ anonymousFileNames: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'validUser' && (
				<TableRowGroup title="Valid User Mention Fixer">
					<TableSwitchRow
						label="Enable Valid User"
						subLabel="Automatically normalize invalid user mentions so they resolve correctly"
						value={storage.validUser}
						onValueChange={(v: boolean) => update({ validUser: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'serverInfo' && (
				<TableRowGroup title="Server Info">
					<TableSwitchRow
						label="Enable Server Info Menu"
						subLabel="Add Server Info shortcut to server context menus"
						value={storage.serverInfo}
						onValueChange={(v: boolean) => update({ serverInfo: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'userNotif' && (
				<TableRowGroup title="User Notifications">
					<TableSwitchRow
						label="Enable User Notifications"
						subLabel="In-app toast alerts when tracked users change status, message, or type"
						value={storage.userNotif}
						onValueChange={(v: boolean) => update({ userNotif: v })}
					/>
					{storage.userNotif && (
						<TableSwitchRow
							label="Track All Friends"
							subLabel="Automatically track status updates from your Discord friends"
							value={storage.userNotifTrackFriends}
							onValueChange={(v: boolean) => update({ userNotifTrackFriends: v })}
						/>
					)}
				</TableRowGroup>
			)}

			{activeTab === 'uwuify' && (
				<TableRowGroup title="UwUify">
					<TableSwitchRow
						label="Enable UwUify"
						subLabel="Adds /uwu command to uwuify messages"
						value={storage.uwuify}
						onValueChange={(v: boolean) => update({ uwuify: v })}
					/>
					<TableSwitchRow
						label="Convert All Outgoing Messages"
						subLabel="Automatically uwuify every message you send"
						value={storage.uwuifyConvertOutgoing}
						onValueChange={(v: boolean) => update({ uwuifyConvertOutgoing: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'piratifier' && (
				<TableRowGroup title="Piratifier">
					<TableSwitchRow
						label="Enable Piratifier"
						subLabel="Adds /pirate command to convert text to pirate speak"
						value={storage.piratifier}
						onValueChange={(v: boolean) => update({ piratifier: v })}
					/>
					<TableSwitchRow
						label="Convert All Outgoing Messages"
						subLabel="Automatically convert every message you send to pirate speak"
						value={storage.piratifyConvertOutgoing}
						onValueChange={(v: boolean) => update({ piratifyConvertOutgoing: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'gifRoulette' && (
				<TableRowGroup title="GIF Roulette">
					<TableSwitchRow
						label="Enable GIF Roulette"
						subLabel="Adds /roulette command to send a random GIF from search queries"
						value={storage.gifRoulette}
						onValueChange={(v: boolean) => update({ gifRoulette: v })}
					/>
				</TableRowGroup>
			)}

			{activeTab === 'urbanDictionary' && (
				<TableRowGroup title="Urban Dictionary">
					<TableSwitchRow
						label="Enable Urban Dictionary"
						subLabel="Adds /urban command to look up slang definitions"
						value={storage.urbanDictionary}
						onValueChange={(v: boolean) => update({ urbanDictionary: v })}
					/>
				</TableRowGroup>
			)}

			<View style={{ height: 40 }} />
		</ScrollView>
	)
}
