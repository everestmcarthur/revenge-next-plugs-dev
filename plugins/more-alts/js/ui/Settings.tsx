import type { PluginApi } from '@revenge-mod/plugins/types'
import type { MoreAltsStorage, Account } from '../lib/types'
import {
	getCurrentUser,
	getAllAccounts,
	switchToAccount,
	addCurrentAccount,
	addAccountWithToken,
	addAccountWithCredentials,
	removeAccount,
	forceLogout,
	exportAccountsJson,
	importAccountsJson,
} from '../lib/accountActions'

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function openAddAccountSheet(
	storage: any,
	onDone?: () => void,
) {
	const actions = revenge.discord.actions.ActionSheetActionCreators
	actions?.openLazy?.(
		Promise.resolve({
			default: () => {
				const React = revenge.react.React
				const { View, ScrollView, TextInput: RNTextInput } = revenge.react.ReactNative
				const {
					ActionSheet,
					BottomSheetTitleHeader,
					ActionSheetCloseButton,
					TableRowGroup,
					TableRow,
					Stack,
					Button,
					Text,
				} = revenge.discord.design.Design as any

				const [mode, setMode] = React.useState<'choose' | 'credentials' | 'token'>('choose')
				const [email, setEmail] = React.useState('')
				const [password, setPassword] = React.useState('')
				const [token, setToken] = React.useState('')
				const [statusMsg, setStatusMsg] = React.useState<string | null>(null)
				const [loading, setLoading] = React.useState(false)

				const handleAddCurrent = async () => {
					setLoading(true)
					setStatusMsg(null)
					const res = await addCurrentAccount(storage)
					setLoading(false)
					if (res.success) {
						onDone?.()
						actions.hideActionSheet()
					} else {
						setStatusMsg(res.message)
					}
				}

				const handleAddCredentials = async () => {
					setLoading(true)
					setStatusMsg(null)
					const res = await addAccountWithCredentials(storage, email, password)
					setLoading(false)
					if (res.success) {
						onDone?.()
						actions.hideActionSheet()
					} else {
						setStatusMsg(res.message)
					}
				}

				const handleAddToken = async () => {
					setLoading(true)
					setStatusMsg(null)
					const res = await addAccountWithToken(storage, token)
					setLoading(false)
					if (res.success) {
						onDone?.()
						actions.hideActionSheet()
					} else {
						setStatusMsg(res.message)
					}
				}

				const handlePasteToken = async () => {
					try {
						const text = (await revenge.externals.ReactNativeClipboard?.getString?.()) || ''
						if (text.trim()) setToken(text.trim())
					} catch {}
				}

				return (
					<ActionSheet
						header={
							<BottomSheetTitleHeader
								title="Add Account"
								subtitle="Save a Discord account to the switcher"
								trailing={
									<ActionSheetCloseButton
										onPress={() => actions.hideActionSheet()}
									/>
								}
							/>
						}
					>
						<ScrollView
							contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
							keyboardShouldPersistTaps="handled"
						>
							<Stack spacing={16}>
								{statusMsg && (
									<Text variant="text-sm/medium" color="text-danger">
										{statusMsg}
									</Text>
								)}

								{mode === 'choose' && (
									<TableRowGroup>
										<TableRow
											label="Add Current Account"
											subLabel="Quickly save the account you are currently logged into"
											onPress={handleAddCurrent}
											disabled={loading}
										/>
										<TableRow
											label="Login with Email & Password"
											subLabel="Sign in directly using account credentials"
											onPress={() => setMode('credentials')}
											arrow
										/>
										<TableRow
											label="Add with Token"
											subLabel="Manually provide a Discord authorization token"
											onPress={() => setMode('token')}
											arrow
										/>
									</TableRowGroup>
								)}

								{mode === 'credentials' && (
									<>
										<TableRowGroup title="Account Credentials">
											<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
												<Text variant="text-xs/medium" color="text-muted" style={{ marginBottom: 6 }}>
													Email or Phone Number
												</Text>
												<RNTextInput
													value={email}
													onChangeText={(t: string) => setEmail(t)}
													placeholder="user@example.com"
													placeholderTextColor="#80848e"
													autoCapitalize="none"
													keyboardType="email-address"
													editable={!loading}
													style={{
														backgroundColor: '#1e1f22',
														color: '#f2f3f5',
														paddingHorizontal: 12,
														paddingVertical: 10,
														borderRadius: 8,
														fontSize: 15,
													}}
												/>
											</View>
											<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
												<Text variant="text-xs/medium" color="text-muted" style={{ marginBottom: 6 }}>
													Password
												</Text>
												<RNTextInput
													value={password}
													onChangeText={(t: string) => setPassword(t)}
													placeholder="Password"
													placeholderTextColor="#80848e"
													secureTextEntry
													editable={!loading}
													style={{
														backgroundColor: '#1e1f22',
														color: '#f2f3f5',
														paddingHorizontal: 12,
														paddingVertical: 10,
														borderRadius: 8,
														fontSize: 15,
													}}
												/>
											</View>
										</TableRowGroup>

										<View style={{ flexDirection: 'row', gap: 8 }}>
											<Button
												variant="secondary"
												text="Back"
												onPress={() => setMode('choose')}
												style={{ flex: 1 }}
											/>
											<Button
												variant="primary"
												text={loading ? 'Logging in...' : 'Sign In'}
												onPress={handleAddCredentials}
												disabled={loading || !email.trim() || !password.trim()}
												style={{ flex: 2 }}
											/>
										</View>
									</>
								)}

								{mode === 'token' && (
									<>
										<TableRowGroup title="Authorization Token">
											<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
												<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
													<Text variant="text-xs/medium" color="text-muted">
														Token
													</Text>
													<Button
														size="sm"
														variant="secondary"
														text="📋 Paste"
														onPress={handlePasteToken}
													/>
												</View>
												<RNTextInput
													value={token}
													onChangeText={(t: string) => setToken(t)}
													placeholder="Paste Discord token..."
													placeholderTextColor="#80848e"
													secureTextEntry
													editable={!loading}
													style={{
														backgroundColor: '#1e1f22',
														color: '#f2f3f5',
														paddingHorizontal: 12,
														paddingVertical: 10,
														borderRadius: 8,
														fontSize: 15,
													}}
												/>
											</View>
										</TableRowGroup>

										<View style={{ flexDirection: 'row', gap: 8 }}>
											<Button
												variant="secondary"
												text="Back"
												onPress={() => setMode('choose')}
												style={{ flex: 1 }}
											/>
											<Button
												variant="primary"
												text={loading ? 'Adding...' : 'Add Account'}
												onPress={handleAddToken}
												disabled={loading || !token.trim()}
												style={{ flex: 2 }}
											/>
										</View>
									</>
								)}
							</Stack>
						</ScrollView>
					</ActionSheet>
				)
			},
		}),
		'more-alts-add-account',
		{},
	)
}

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: MoreAltsStorage }>
}) {
	const { Page } =
		revenge.components as typeof import('@revenge-mod/components')
	const { ScrollView, View, Image, Alert } = revenge.react.ReactNative
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
	const [, forceUpdate] = revenge.react.React.useReducer((x: number) => x + 1, 0)

	const currentUserId = getCurrentUser()?.id
	const accounts = getAllAccounts(api.jsonStorage)

	const handleSwitch = async (account: Account) => {
		if (account.id === currentUserId) return
		const target = account.token || account.id
		const ok = await switchToAccount(target, account.username, account.isNative)
		if (ok) {
			forceUpdate()
		}
	}

	const handleRemove = (account: Account) => {
		if (storage?.confirmBeforeDelete !== false) {
			Alert.alert(
				'Remove Account',
				`Are you sure you want to remove "${account.username}" from More Alts?`,
				[
					{ text: 'Cancel', style: 'cancel' },
					{
						text: 'Remove',
						style: 'destructive',
						onPress: async () => {
							await removeAccount(api.jsonStorage, account.id)
							forceUpdate()
						},
					},
				],
			)
		} else {
			void removeAccount(api.jsonStorage, account.id)
			forceUpdate()
		}
	}

	const handleExport = () => {
		const json = exportAccountsJson(api.jsonStorage)
		try {
			revenge.externals.ReactNativeClipboard?.setString?.(json)
			Alert.alert('Export Successful', `Exported ${accounts.length} accounts to clipboard!`)
		} catch (e: any) {
			Alert.alert('Export Failed', e?.message ?? String(e))
		}
	}

	const handleImport = async () => {
		try {
			const clipboardText =
				(await revenge.externals.ReactNativeClipboard?.getString?.()) || ''
			if (!clipboardText.trim()) {
				Alert.alert('Import', 'Clipboard is empty. Please copy valid export JSON first.')
				return
			}

			const res = await importAccountsJson(api.jsonStorage, clipboardText)
			if (res.success) {
				Alert.alert(
					'Import Complete',
					`Imported ${res.imported} accounts (${res.skipped} skipped duplicates).`,
				)
				forceUpdate()
			} else {
				Alert.alert('Import Failed', res.message || 'Invalid JSON format')
			}
		} catch (e: any) {
			Alert.alert('Import Error', e?.message ?? String(e))
		}
	}

	return (
		<Page>
			<View style={{ flex: 1 }}>
				<ScrollView
					contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
					keyboardShouldPersistTaps="handled"
				>
					<Stack spacing={16}>
						<Card>
							<View style={{ padding: 16 }}>
								<Text variant="heading-md/semibold">More Alts!</Text>
								<Text
									variant="text-sm/normal"
									color="text-muted"
									style={{ marginTop: 6 }}
								>
									Manage and switch between multiple Discord accounts seamlessly,
									and unlock the native multi-account switcher.
								</Text>
								<View style={{ marginTop: 12 }}>
									<Button
										variant="primary"
										text="+ Add Account"
										onPress={() =>
											openAddAccountSheet(api.jsonStorage, forceUpdate)
										}
									/>
								</View>
							</View>
						</Card>

						<TableRowGroup title={`Saved Accounts (${accounts.length})`}>
							{accounts.length === 0 ? (
								<TableRow
									label="No Accounts Saved"
									subLabel="Tap '+ Add Account' above to add your current account or sign in with another."
								/>
							) : (
								accounts.map((acc, index) => {
									const isCurrent = acc.id === currentUserId
									const avatarUrl = acc.avatar
										? `https://cdn.discordapp.com/avatars/${acc.id}/${acc.avatar}.png?size=80`
										: 'https://cdn.discordapp.com/embed/avatars/0.png'

									const displayName = storage?.enableCLI
										? `${acc.username}${acc.discriminator && acc.discriminator !== '0' ? `#${acc.discriminator}` : ''}`
										: acc.displayName || acc.username

									return (
										<TableRow
											key={acc.id}
											icon={
												<Image
													source={{ uri: avatarUrl }}
													style={{
														width: 36,
														height: 36,
														borderRadius: 18,
														borderWidth: isCurrent ? 2 : 0,
														borderColor: '#23A55A',
													}}
												/>
											}
											label={`${index + 1}. ${displayName}`}
											subLabel={
												isCurrent
													? '✓ Active Account'
													: acc.isNative
														? 'Discord Account'
														: `Added: ${formatDate(acc.addedAt)}`
											}
											trailing={
												<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
													{!isCurrent && (
														<Button
															size="sm"
															variant="secondary"
															text="Switch"
															onPress={() => handleSwitch(acc)}
														/>
													)}
													<Button
														size="sm"
														variant="destructive"
														text="✕"
														onPress={() => handleRemove(acc)}
													/>
												</View>
											}
										/>
									)
								})
							)}
						</TableRowGroup>

						<TableRowGroup title="General Settings">
							<TableSwitchRow
								label="Enable Native Account Switcher"
								subLabel="Unlocks Discord's built-in multi-account switcher"
								value={storage?.enableNativeSwitcher !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ enableNativeSwitcher: v })
								}
							/>
							<TableSwitchRow
								label="Show Discriminator / Full Tag"
								subLabel="Display username#0000 in account list"
								value={storage?.enableCLI !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ enableCLI: v })
								}
							/>
							<TableSwitchRow
								label="Confirm Before Deleting"
								subLabel="Prompt for confirmation before removing an account"
								value={storage?.confirmBeforeDelete !== false}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ confirmBeforeDelete: v })
								}
							/>
							<TableSwitchRow
								label="Enable Unsafe Features"
								subLabel="Allow token copying and advanced account export"
								value={!!storage?.enableUnsafeFeatures}
								onValueChange={(v: boolean) =>
									api.jsonStorage.set({ enableUnsafeFeatures: v })
								}
							/>
						</TableRowGroup>

						<TableRowGroup title="Backup & Session">
							<TableRow
								label="Export Accounts"
								subLabel="Copy all saved accounts and tokens to clipboard (JSON)"
								onPress={handleExport}
							/>
							<TableRow
								label="Import Accounts from Clipboard"
								subLabel="Restore accounts from previously copied export JSON"
								onPress={handleImport}
							/>
							<TableRow
								label="Force Logout Session"
								subLabel="Invalidate current session while preserving saved switcher accounts"
								variant="danger"
								onPress={() => {
									Alert.alert(
										'Force Logout',
										'This will log you out of your current session. Your saved accounts will remain safe.',
										[
											{ text: 'Cancel', style: 'cancel' },
											{
												text: 'Force Logout',
												style: 'destructive',
												onPress: () => forceLogout(),
											},
										],
									)
								}}
							/>
						</TableRowGroup>
					</Stack>
				</ScrollView>
			</View>
		</Page>
	)
}
