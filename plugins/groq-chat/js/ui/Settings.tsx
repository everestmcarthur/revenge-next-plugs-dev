import type { PluginApi } from '@revenge-mod/plugins/types'
import type { GroqChatStorage } from '../lib/types'
import {
	GROQ_MODELS,
	DEFAULT_MODEL,
	DEFAULT_PREFIX,
	DEFAULT_SYSTEM_PROMPT,
	PROMPT_PRESETS,
} from '../lib/constants'
import { testGroqConnection } from '../lib/groqApi'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: GroqChatStorage }>
}) {
	const { Page } = revenge.components as typeof import('@revenge-mod/components')
	const { ScrollView, View, TextInput: RNTextInput, Alert } = revenge.react.ReactNative
	const {
		TableRowGroup,
		TableSwitchRow,
		TableRow,
		Stack,
		Card,
		Text,
		Button,
	} = revenge.discord.design.Design as any

	const storage = api.jsonStorage.use()
	const React = revenge.react.React

	const [apiKey, setApiKey] = React.useState(storage?.apiKey || '')
	const [showKey, setShowKey] = React.useState(false)
	const [testingKey, setTestingKey] = React.useState(false)
	const [testStatus, setTestStatus] = React.useState<string | null>(null)
	const [systemPrompt, setSystemPrompt] = React.useState(
		storage?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
	)
	const [prefixString, setPrefixString] = React.useState(
		storage?.prefixString || DEFAULT_PREFIX,
	)

	const currentModel = storage?.defaultModel || DEFAULT_MODEL
	const isEphemeral = storage?.ephemeralOnly !== false
	const isPrefixEnabled = storage?.enablePrefix !== false

	const handleSaveKey = (key: string) => {
		setApiKey(key)
		api.jsonStorage.set({ apiKey: key.trim() })
	}

	const handlePasteKey = async () => {
		try {
			const text = (await revenge.externals.ReactNativeClipboard?.getString?.()) || ''
			if (text.trim()) {
				handleSaveKey(text.trim())
				Alert.alert('API Key Pasted', 'Groq API key saved!')
			}
		} catch (e: any) {
			Alert.alert('Paste Error', e?.message || String(e))
		}
	}

	const handleTestConnection = async () => {
		setTestingKey(true)
		setTestStatus(null)
		const res = await testGroqConnection(apiKey, currentModel)
		setTestingKey(false)
		setTestStatus(res.message)
		Alert.alert(res.ok ? '✅ Success' : '❌ Connection Failed', res.message)
	}

	const handleSelectModel = (modelId: string) => {
		api.jsonStorage.set({ defaultModel: modelId })
	}

	const handleSaveSystemPrompt = (prompt: string) => {
		setSystemPrompt(prompt)
		api.jsonStorage.set({ systemPrompt: prompt })
	}

	const handleSavePrefix = (p: string) => {
		setPrefixString(p)
		api.jsonStorage.set({ prefixString: p.trim() })
	}

	return (
		<Page>
			<View style={{ flex: 1 }}>
				<ScrollView
					contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
					keyboardShouldPersistTaps="handled"
				>
					<Stack spacing={16}>
						{/* Header Card */}
						<Card>
							<View style={{ padding: 16 }}>
								<Text variant="heading-md/semibold">Groq AI Chat</Text>
								<Text
									variant="text-sm/normal"
									color="text-muted"
									style={{ marginTop: 6 }}
								>
									Blazing fast, private AI assistant in Discord powered by Groq LPUs.
									Run <Text variant="text-sm/bold" color="text-brand">/chat</Text> in any channel or DM.
								</Text>
								<View
									style={{
										marginTop: 12,
										padding: 8,
										borderRadius: 6,
										backgroundColor: apiKey ? 'rgba(35, 165, 90, 0.15)' : 'rgba(237, 66, 69, 0.15)',
									}}
								>
									<Text
										variant="text-xs/semibold"
										color={apiKey ? 'text-positive' : 'text-danger'}
									>
										{apiKey ? '✓ Groq API Key Configured' : '⚠️ API Key Not Set (Required)'}
									</Text>
								</View>
							</View>
						</Card>

						{/* API Key Configuration */}
						<TableRowGroup title="Groq API Key">
							<View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginBottom: 6,
									}}
								>
									<Text variant="text-xs/medium" color="text-muted">
										Groq API Key (starts with gsk_...)
									</Text>
									<View style={{ flexDirection: 'row', gap: 6 }}>
										<Button
											size="sm"
											variant="secondary"
											text={showKey ? 'Hide' : 'Show'}
											onPress={() => setShowKey(!showKey)}
										/>
										<Button
											size="sm"
											variant="secondary"
											text="📋 Paste"
											onPress={handlePasteKey}
										/>
									</View>
								</View>

								<RNTextInput
									value={apiKey}
									onChangeText={handleSaveKey}
									placeholder="gsk_..."
									placeholderTextColor="#80848e"
									secureTextEntry={!showKey}
									autoCapitalize="none"
									autoCorrect={false}
									style={{
										backgroundColor: '#1e1f22',
										color: '#f2f3f5',
										paddingHorizontal: 12,
										paddingVertical: 10,
										borderRadius: 8,
										fontSize: 14,
									}}
								/>

								<View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
									<Button
										variant="primary"
										size="sm"
										text={testingKey ? 'Testing...' : '⚡ Test Connection'}
										disabled={testingKey || !apiKey.trim()}
										onPress={handleTestConnection}
										style={{ flex: 1 }}
									/>
								</View>

								{testStatus && (
									<Text
										variant="text-xs/normal"
										color="text-muted"
										style={{ marginTop: 6 }}
									>
										{testStatus}
									</Text>
								)}
							</View>
						</TableRowGroup>

						{/* Model Selector */}
						<TableRowGroup title="Default Model">
							{GROQ_MODELS.map((model) => {
								const isSelected = currentModel === model.id
								return (
									<TableRow
										key={model.id}
										label={model.name}
										subLabel={model.description}
										onPress={() => handleSelectModel(model.id)}
										trailing={
											isSelected ? (
												<Text variant="text-sm/bold" color="text-brand">
													✓ Active
												</Text>
											) : null
										}
									/>
								)
							})}
						</TableRowGroup>

						{/* System Prompt Customization */}
						<TableRowGroup title="System Prompt">
							<View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
								<Text
									variant="text-xs/medium"
									color="text-muted"
									style={{ marginBottom: 6 }}
								>
									Define persona, role, or formatting instructions
								</Text>
								<RNTextInput
									value={systemPrompt}
									onChangeText={handleSaveSystemPrompt}
									placeholder="You are a helpful AI assistant..."
									placeholderTextColor="#80848e"
									multiline
									numberOfLines={4}
									style={{
										backgroundColor: '#1e1f22',
										color: '#f2f3f5',
										paddingHorizontal: 12,
										paddingVertical: 10,
										borderRadius: 8,
										fontSize: 14,
										minHeight: 80,
										textAlignVertical: 'top',
									}}
								/>

								<Text
									variant="text-xs/semibold"
									color="text-muted"
									style={{ marginTop: 12, marginBottom: 6 }}
								>
									Presets:
								</Text>
								<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
									{PROMPT_PRESETS.map((p) => (
										<Button
											key={p.label}
											size="sm"
											variant="secondary"
											text={p.label}
											onPress={() => handleSaveSystemPrompt(p.prompt)}
										/>
									))}
								</View>
							</View>
						</TableRowGroup>

						{/* Response & Trigger Options */}
						<TableRowGroup title="Behavior & Triggers">
							<TableSwitchRow
								label="Private / Ephemeral Responses"
								subLabel="Only show Groq AI responses to you in chat (Clyde-style)"
								value={isEphemeral}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ ephemeralOnly: v })
								}
							/>
							<TableSwitchRow
								label="Enable Prefix Trigger"
								subLabel={`Allows starting chat messages with ${prefixString} <prompt>`}
								value={isPrefixEnabled}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ enablePrefix: v })
								}
							/>
							{isPrefixEnabled && (
								<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
									<Text
										variant="text-xs/medium"
										color="text-muted"
										style={{ marginBottom: 6 }}
									>
										Prefix Trigger (e.g. .chat or !c)
									</Text>
									<RNTextInput
										value={prefixString}
										onChangeText={handleSavePrefix}
										placeholder=".chat"
										placeholderTextColor="#80848e"
										autoCapitalize="none"
										style={{
											backgroundColor: '#1e1f22',
											color: '#f2f3f5',
											paddingHorizontal: 12,
											paddingVertical: 8,
											borderRadius: 8,
											fontSize: 14,
										}}
									/>
								</View>
							)}
						</TableRowGroup>
					</Stack>
				</ScrollView>
			</View>
		</Page>
	)
}
