import {
	addCurrentAccount,
	addAccountWithToken,
	addAccountWithCredentials,
} from '../lib/accountActions'

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
						const clip = revenge.discord.common.Clipboard
						if (clip?.getString) {
							const text = await clip.getString()
							if (text) setToken(text.trim())
						}
					} catch {}
				}

				return (
					<ActionSheet>
						<BottomSheetTitleHeader
							title="Add Account"
							trailing={
								<ActionSheetCloseButton
									onPress={() => actions.hideActionSheet()}
								/>
							}
						/>
						<ScrollView style={{ maxHeight: 500 }}>
							<Stack style={{ padding: 16, gap: 12 }}>
								{statusMsg && (
									<View
										style={{
											backgroundColor: 'rgba(237, 66, 69, 0.15)',
											borderRadius: 8,
											padding: 12,
											borderWidth: 1,
											borderColor: 'rgba(237, 66, 69, 0.4)',
										}}
									>
										<Text variant="text-sm/medium" color="text-danger">
											{statusMsg}
										</Text>
									</View>
								)}

								{mode === 'choose' && (
									<>
										<TableRowGroup title="Add Current Session">
											<TableRow
												label="Save Currently Logged-in Account"
												subLabel="Adds the account currently active in Discord"
												onPress={handleAddCurrent}
												disabled={loading}
											/>
										</TableRowGroup>

										<TableRowGroup title="Add Another Account">
											<TableRow
												label="Sign in with Email & Password"
												subLabel="Log in with credentials directly"
												onPress={() => {
													setStatusMsg(null)
													setMode('credentials')
												}}
												arrow
											/>
											<TableRow
												label="Add with Token"
												subLabel="Paste a Discord user token"
												onPress={() => {
													setStatusMsg(null)
													setMode('token')
												}}
												arrow
											/>
										</TableRowGroup>
									</>
								)}

								{mode === 'credentials' && (
									<>
										<TableRowGroup title="Discord Credentials">
											<View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 10 }}>
												<View>
													<Text variant="text-xs/medium" color="text-muted" style={{ marginBottom: 4 }}>
														Email or Phone
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
												<View>
													<Text variant="text-xs/medium" color="text-muted" style={{ marginBottom: 4 }}>
														Password
													</Text>
													<RNTextInput
														value={password}
														onChangeText={(t: string) => setPassword(t)}
														placeholder="••••••••••••"
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
