import { Design } from '@revenge-mod/discord/design'
import { useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native'
import type { PluginApi } from '@revenge-mod/plugins/types'
import { DEFAULTS } from './defaults'
import { deleteFont, fetchFontFromUrl, saveFont, selectFont } from './lib/fonts'
import { deleteTheme, extractFontFromTheme, fetchThemeFromUrl, saveTheme, selectTheme } from './lib/themes'
import type { ThemeifyStorage } from './types'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: ThemeifyStorage }>
}) {
	const { Text, TextInput, Button, TableRowGroup } = Design
	const liveStorage = api.jsonStorage.use()
	const storage: ThemeifyStorage = { ...DEFAULTS, ...(liveStorage ?? {}) }

	const [activeTab, setActiveTab] = useState<'themes' | 'fonts'>('themes')
	const [themeUrl, setThemeUrl] = useState('')
	const [fontUrl, setFontUrl] = useState('')
	const [loading, setLoading] = useState(false)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)

	const activeTheme = storage.selectedThemeId ? storage.themes[storage.selectedThemeId] : null
	const activeFont = storage.selectedFontName ? storage.fonts[storage.selectedFontName] : null

	const restartApp = () => {
		try {
			const everest = (globalThis as any).revenge?.everest
			if (typeof everest?.restartApp === 'function') {
				everest.restartApp()
				return
			}
			api.plugin.requireReload()
		} catch {
			try {
				api.plugin.requireReload()
			} catch {}
		}
	}

	const handleInstallTheme = async () => {
		if (!themeUrl.trim()) return
		setLoading(true)
		setStatusMessage('Fetching theme...')
		try {
			const data = await fetchThemeFromUrl(themeUrl)
			const id = themeUrl.trim()
			saveTheme(api.jsonStorage, id, data, true)
			setThemeUrl('')
			setStatusMessage(`✓ Installed and applied: ${data.name}`)
		} catch (e: any) {
			setStatusMessage(`Error: ${e?.message || e}`)
		} finally {
			setLoading(false)
		}
	}

	const handleInstallFont = async () => {
		if (!fontUrl.trim()) return
		setLoading(true)
		setStatusMessage('Fetching font definition...')
		try {
			const fontDef = await fetchFontFromUrl(fontUrl)
			saveFont(api.jsonStorage, fontDef, true)
			setFontUrl('')
			setStatusMessage(`✓ Installed and selected: ${fontDef.name}`)
			Alert.alert(
				'Font Selected',
				`"${fontDef.name}" is now active. Restart Discord to load custom fonts into native memory.`,
				[
					{ text: 'Later', style: 'cancel' },
					{ text: 'Restart Now', onPress: restartApp },
				],
			)
		} catch (e: any) {
			setStatusMessage(`Error: ${e?.message || e}`)
		} finally {
			setLoading(false)
		}
	}

	const handleSelectFont = (fontName: string) => {
		selectFont(api.jsonStorage, fontName)
		Alert.alert(
			'Font Changed',
			`Selected "${fontName}". Restart Discord to load this font into native memory.`,
			[
				{ text: 'Later', style: 'cancel' },
				{ text: 'Restart Now', onPress: restartApp },
			],
		)
	}

	const handleClearFont = () => {
		selectFont(api.jsonStorage, null)
		Alert.alert(
			'Reset to Default Font',
			'Reverted to Discord system font. Restart Discord to reload.',
			[
				{ text: 'Later', style: 'cancel' },
				{ text: 'Restart Now', onPress: restartApp },
			],
		)
	}

	const installedThemes = Object.values(storage.themes || {})
	const installedFonts = Object.values(storage.fonts || {})

	return (
		<ScrollView style={{ flex: 1, backgroundColor: '#1E1F22' }}>
			{/* Top Tab Bar */}
			<View
				style={{
					flexDirection: 'row',
					backgroundColor: '#2B2D31',
					padding: 6,
					margin: 16,
					borderRadius: 10,
				}}
			>
				<TouchableOpacity
					onPress={() => {
						setActiveTab('themes')
						setStatusMessage(null)
					}}
					style={{
						flex: 1,
						paddingVertical: 10,
						backgroundColor: activeTab === 'themes' ? '#5865F2' : 'transparent',
						borderRadius: 8,
						alignItems: 'center',
					}}
				>
					<Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>{'\uD83C\uDFA8'} Themes</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => {
						setActiveTab('fonts')
						setStatusMessage(null)
					}}
					style={{
						flex: 1,
						paddingVertical: 10,
						backgroundColor: activeTab === 'fonts' ? '#5865F2' : 'transparent',
						borderRadius: 8,
						alignItems: 'center',
					}}
				>
					<Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>{'\uD83D\uDD24'} Fonts</Text>
				</TouchableOpacity>
			</View>

			{/* Status Feedback Banner */}
			{statusMessage && (
				<View
					style={{
						marginHorizontal: 16,
						marginBottom: 12,
						padding: 12,
						borderRadius: 8,
						backgroundColor: statusMessage.startsWith('✓') ? '#248046' : '#DA373C',
					}}
				>
					<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>{statusMessage}</Text>
				</View>
			)}

			{activeTab === 'themes' ? (
				<View style={{ paddingHorizontal: 16 }}>
					{/* Active Theme Card */}
					<View
						style={{
							backgroundColor: '#2B2D31',
							padding: 16,
							borderRadius: 12,
							marginBottom: 16,
							borderLeftWidth: 4,
							borderLeftColor: activeTheme ? '#5865F2' : '#80848E',
						}}
					>
						<Text style={{ color: '#80848E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
							Active Theme
						</Text>
						<Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
							{activeTheme ? activeTheme.data.name : 'Stock Discord Theme'}
						</Text>
						{activeTheme?.data.description && (
							<Text style={{ color: '#DBDEE1', fontSize: 13, marginTop: 4 }}>
								{activeTheme.data.description}
							</Text>
						)}
						{activeTheme && (
							<View style={{ marginTop: 12 }}>
								<Button
									variant="danger"
									text="Reset to Stock Theme"
									onPress={() => selectTheme(api.jsonStorage, null)}
								/>
							</View>
						)}
					</View>

					{/* Install Theme Input */}
					<TableRowGroup title="INSTALL THEME FROM URL">
						<View style={{ padding: 12 }}>
							<TextInput
								placeholder="https://.../theme.json"
								value={themeUrl}
								onChangeText={setThemeUrl}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<View style={{ marginTop: 10 }}>
								<Button
									variant="primary"
									text={loading ? 'Downloading...' : 'Install & Apply Theme'}
									onPress={handleInstallTheme}
								/>
							</View>
						</View>
					</TableRowGroup>

					{/* Quick Preset: Sakura */}
					<View style={{ marginTop: 16, marginBottom: 8 }}>
						<Button
							variant="secondary"
							text={'\uD83C\uDF38 Quick Install: Sakura Path Cat Theme'}
							onPress={() => {
								setThemeUrl(
									'https://raw.githubusercontent.com/0nlyrisk/Sakura-Path-Cat-Animated-Theme/main/Sakura%20%F0%9F%8C%B8%20Path%20Cat%20Animated%20Theme',
								)
							}}
						/>
					</View>

					{/* Installed Themes List */}
					<TableRowGroup title={`INSTALLED THEMES (${installedThemes.length})`}>
						{installedThemes.length === 0 ? (
							<View style={{ padding: 16, alignItems: 'center' }}>
								<Text style={{ color: '#80848E', fontSize: 14 }}>No custom themes installed yet.</Text>
							</View>
						) : (
							installedThemes.map((theme) => {
								const isSelected = theme.id === storage.selectedThemeId
								const fontPack = extractFontFromTheme(theme.data)
								return (
									<View
										key={theme.id}
										style={{
											padding: 14,
											borderBottomWidth: 1,
											borderBottomColor: '#35373C',
										}}
									>
										<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
											<View style={{ flex: 1 }}>
												<Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
													{theme.data.name} {isSelected && '✓'}
												</Text>
												{theme.data.description && (
													<Text style={{ color: '#949BA4', fontSize: 12, marginTop: 2 }}>
														{theme.data.description}
													</Text>
												)}
											</View>
										</View>

										<View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
											{!isSelected ? (
												<TouchableOpacity
													onPress={() => selectTheme(api.jsonStorage, theme.id)}
													style={{
														backgroundColor: '#5865F2',
														paddingVertical: 8,
														paddingHorizontal: 16,
														borderRadius: 6,
													}}
												>
													<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
														Apply Live
													</Text>
												</TouchableOpacity>
											) : (
												<View
													style={{
														backgroundColor: '#248046',
														paddingVertical: 8,
														paddingHorizontal: 16,
														borderRadius: 6,
													}}
												>
													<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
														Active
													</Text>
												</View>
											)}

											{fontPack && (
												<TouchableOpacity
													onPress={() => {
														saveFont(api.jsonStorage, fontPack, true)
														Alert.alert(
															'Font Pack Extracted',
															`Extracted and selected "${fontPack.name}". Restart Discord to apply fonts.`,
															[
																{ text: 'Later', style: 'cancel' },
																{ text: 'Restart Now', onPress: restartApp },
															],
														)
													}}
													style={{
														backgroundColor: '#4E5058',
														paddingVertical: 8,
														paddingHorizontal: 12,
														borderRadius: 6,
													}}
												>
													<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
														Use Font Pack
													</Text>
												</TouchableOpacity>
											)}

											<TouchableOpacity
												onPress={() => deleteTheme(api.jsonStorage, theme.id)}
												style={{
													backgroundColor: '#DA373C',
													paddingVertical: 8,
													paddingHorizontal: 12,
													borderRadius: 6,
													marginLeft: 'auto',
												}}
											>
												<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
													Delete
												</Text>
											</TouchableOpacity>
										</View>
									</View>
								)
							})
						)}
					</TableRowGroup>
				</View>
			) : (
				<View style={{ paddingHorizontal: 16 }}>
					{/* Active Font Card */}
					<View
						style={{
							backgroundColor: '#2B2D31',
							padding: 16,
							borderRadius: 12,
							marginBottom: 16,
							borderLeftWidth: 4,
							borderLeftColor: activeFont ? '#248046' : '#80848E',
						}}
					>
						<Text style={{ color: '#80848E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
							Active Font
						</Text>
						<Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
							{activeFont ? activeFont.name : 'System / Stock Discord Font'}
						</Text>
						{activeFont?.data.description && (
							<Text style={{ color: '#DBDEE1', fontSize: 13, marginTop: 4 }}>
								{activeFont.data.description}
							</Text>
						)}
						<View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
							<TouchableOpacity
								onPress={restartApp}
								style={{
									backgroundColor: '#5865F2',
									paddingVertical: 8,
									paddingHorizontal: 14,
									borderRadius: 6,
								}}
							>
								<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
									{'\uD83D\uDD04'} Restart Discord
								</Text>
							</TouchableOpacity>

							{activeFont && (
								<TouchableOpacity
									onPress={handleClearFont}
									style={{
										backgroundColor: '#DA373C',
										paddingVertical: 8,
										paddingHorizontal: 14,
										borderRadius: 6,
									}}
								>
									<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
										Reset Font
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>

					{/* Install Font Input */}
					<TableRowGroup title="INSTALL FONT PACK FROM URL">
						<View style={{ padding: 12 }}>
							<TextInput
								placeholder="https://.../font.json"
								value={fontUrl}
								onChangeText={setFontUrl}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<View style={{ marginTop: 10 }}>
								<Button
									variant="primary"
									text={loading ? 'Downloading Font Pack...' : 'Install & Apply Font'}
									onPress={handleInstallFont}
								/>
							</View>
						</View>
					</TableRowGroup>

					{/* Quick Font Presets */}
					<View style={{ marginTop: 16, marginBottom: 8 }}>
						<Button
							variant="secondary"
							text={'\uD83D\uDD24 Preset: Discord Default Fonts (Vanilla Gist)'}
							onPress={() => {
								setFontUrl('https://gist.github.com/Davr1/63e459c59410caa3b34d20874bfec667/raw/font.json')
							}}
						/>
					</View>

					{/* Installed Fonts List */}
					<TableRowGroup title={`INSTALLED FONTS (${installedFonts.length})`}>
						{installedFonts.length === 0 ? (
							<View style={{ padding: 16, alignItems: 'center' }}>
								<Text style={{ color: '#80848E', fontSize: 14 }}>No custom font packs installed yet.</Text>
							</View>
						) : (
							installedFonts.map((font) => {
								const isSelected = font.name === storage.selectedFontName
								const weightCount = Object.keys(font.data.main || {}).length
								return (
									<View
										key={font.name}
										style={{
											padding: 14,
											borderBottomWidth: 1,
											borderBottomColor: '#35373C',
										}}
									>
										<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
											<View style={{ flex: 1 }}>
												<Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
													{font.name} {isSelected && '✓'}
												</Text>
												<Text style={{ color: '#949BA4', fontSize: 12, marginTop: 2 }}>
													{weightCount} weights/styles (ggsans, mono, etc.)
												</Text>
											</View>
										</View>

										<View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
											{!isSelected ? (
												<TouchableOpacity
													onPress={() => handleSelectFont(font.name)}
													style={{
														backgroundColor: '#5865F2',
														paddingVertical: 8,
														paddingHorizontal: 16,
														borderRadius: 6,
													}}
												>
													<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
														Select & Restart
													</Text>
												</TouchableOpacity>
											) : (
												<View
													style={{
														backgroundColor: '#248046',
														paddingVertical: 8,
														paddingHorizontal: 16,
														borderRadius: 6,
													}}
												>
													<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
														Active
													</Text>
												</View>
											)}

											<TouchableOpacity
												onPress={() => deleteFont(api.jsonStorage, font.name)}
												style={{
													backgroundColor: '#DA373C',
													paddingVertical: 8,
													paddingHorizontal: 12,
													borderRadius: 6,
													marginLeft: 'auto',
												}}
											>
												<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
													Delete
												</Text>
											</TouchableOpacity>
										</View>
									</View>
								)
							})
						)}
					</TableRowGroup>
				</View>
			)}

			<View style={{ height: 40 }} />
		</ScrollView>
	)
}
