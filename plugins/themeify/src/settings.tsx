import { useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import type { PluginApi } from '@revenge-mod/plugins/types'
import { DEFAULTS } from './defaults'
import { fetchFontFromUrl, saveFont, selectFont } from './lib/fonts'
import { fetchThemeFromUrl, saveTheme, selectTheme } from './lib/themes'
import type { ThemeifyStorage } from './types'
import {
	ActionButton,
	SectionGroup,
	ThemeListItem,
	FontListItem,
} from './components'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: ThemeifyStorage }>
}) {
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
			const nativeApp = (globalThis as any).revenge?.modules?.native?.app
			if (typeof nativeApp?.reloadApp === 'function') {
				nativeApp.reloadApp()
				return
			}
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

	const handleInstallTheme = async (targetUrl?: string) => {
		const urlToFetch = (targetUrl ?? themeUrl).trim()
		if (!urlToFetch) return
		setLoading(true)
		setStatusMessage('Fetching theme...')
		try {
			const data = await fetchThemeFromUrl(urlToFetch)
			await saveTheme(api.jsonStorage, urlToFetch, data, true, storage)
			setThemeUrl('')
			setStatusMessage(`✓ Installed and applied: ${data.name}`)
		} catch (e: any) {
			setStatusMessage(`Error: ${e?.message || e}`)
		} finally {
			setLoading(false)
		}
	}

	const handleInstallFont = async (targetUrl?: string) => {
		const urlToFetch = (targetUrl ?? fontUrl).trim()
		if (!urlToFetch) return
		setLoading(true)
		setStatusMessage('Fetching font definition...')
		try {
			const fontDef = await fetchFontFromUrl(urlToFetch)
			await saveFont(api.jsonStorage, fontDef, true, storage)
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

	const handleSelectFont = async (fontName: string) => {
		await selectFont(api.jsonStorage, fontName, storage)
		Alert.alert(
			'Font Changed',
			`Selected "${fontName}". Restart Discord to load this font into native memory.`,
			[
				{ text: 'Later', style: 'cancel' },
				{ text: 'Restart Now', onPress: restartApp },
			],
		)
	}

	const handleClearFont = async () => {
		await selectFont(api.jsonStorage, null, storage)
		Alert.alert(
			'Reset to Default Font',
			'Reverted to Discord system font. Restart Discord to reload.',
			[
				{ text: 'Later', style: 'cancel' },
				{ text: 'Restart Now', onPress: restartApp },
			],
		)
	}

	const installedThemes = Object.values(storage.themes)
	const installedFonts = Object.values(storage.fonts)

	return (
		<ScrollView style={{ flex: 1, backgroundColor: '#1E1F22' }}>
			{/* Header */}
			<View style={{ padding: 16, paddingBottom: 8 }}>
				<Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>Themeify</Text>
				<Text style={{ color: '#949BA4', fontSize: 14, marginTop: 4 }}>
					Custom Discord themes and custom font packs on Revenge.
				</Text>
			</View>

			{/* Status Banner */}
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
					<Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{statusMessage}</Text>
				</View>
			)}

			{loading && (
				<View style={{ padding: 12, alignItems: 'center' }}>
					<ActivityIndicator size="small" color="#5865F2" />
				</View>
			)}

			{/* Tab Switcher */}
			<View
				style={{
					flexDirection: 'row',
					marginHorizontal: 16,
					marginBottom: 16,
					backgroundColor: '#2B2D31',
					borderRadius: 8,
					padding: 4,
				}}
			>
				<TouchableOpacity
					onPress={() => setActiveTab('themes')}
					style={{
						flex: 1,
						paddingVertical: 8,
						alignItems: 'center',
						borderRadius: 6,
						backgroundColor: activeTab === 'themes' ? '#5865F2' : 'transparent',
					}}
				>
					<Text
						style={{
							color: '#FFFFFF',
							fontWeight: activeTab === 'themes' ? 'bold' : '600',
							fontSize: 14,
						}}
					>
						Themes ({installedThemes.length})
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => setActiveTab('fonts')}
					style={{
						flex: 1,
						paddingVertical: 8,
						alignItems: 'center',
						borderRadius: 6,
						backgroundColor: activeTab === 'fonts' ? '#5865F2' : 'transparent',
					}}
				>
					<Text
						style={{
							color: '#FFFFFF',
							fontWeight: activeTab === 'fonts' ? 'bold' : '600',
							fontSize: 14,
						}}
					>
						Fonts ({installedFonts.length})
					</Text>
				</TouchableOpacity>
			</View>

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
							borderLeftColor: activeTheme ? '#248046' : '#80848E',
						}}
					>
						<Text style={{ color: '#80848E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
							Active Theme
						</Text>
						<Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
							{activeTheme ? activeTheme.data.name : 'Default Discord Theme'}
						</Text>
						{activeTheme?.data?.description && (
							<Text style={{ color: '#949BA4', fontSize: 13, marginTop: 4 }}>
								{activeTheme.data.description}
							</Text>
						)}
						{activeTheme && (
							<View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
								<TouchableOpacity
									onPress={() => selectTheme(api.jsonStorage, null, storage)}
									style={{
										backgroundColor: '#4E5058',
										paddingVertical: 6,
										paddingHorizontal: 12,
										borderRadius: 6,
									}}
								>
									<Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
										Unload Theme
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>

					{/* Install Theme From URL */}
					<SectionGroup title="INSTALL THEME FROM URL">
						<View style={{ padding: 12 }}>
							<TextInput
								value={themeUrl}
								onChangeText={setThemeUrl}
								placeholder="https://... / theme.json"
								placeholderTextColor="#80848E"
								autoCapitalize="none"
								autoCorrect={false}
								style={{
									backgroundColor: '#1E1F22',
									color: '#FFFFFF',
									paddingHorizontal: 12,
									paddingVertical: 10,
									borderRadius: 8,
									fontSize: 14,
									marginBottom: 12,
								}}
							/>
							<ActionButton
								variant="primary"
								text={loading ? 'Downloading...' : 'Install & Apply Theme'}
								onPress={() => handleInstallTheme()}
							/>
						</View>
					</SectionGroup>

					{/* Quick Preset: Sakura */}
					<View style={{ marginBottom: 16 }}>
						<ActionButton
							variant="secondary"
							text={'\uD83C\uDF38 Quick Install & Apply: Sakura Path Cat Theme'}
							onPress={() => {
								handleInstallTheme(
									'https://raw.githubusercontent.com/0nlyrisk/Sakura-Path-Cat-Animated-Theme/main/Sakura%20%F0%9F%8C%B8%20Path%20Cat%20Animated%20Theme',
								)
							}}
						/>
					</View>

					{/* Installed Themes List */}
					<SectionGroup title={`INSTALLED THEMES (${installedThemes.length})`}>
						{installedThemes.length === 0 ? (
							<View style={{ padding: 16, alignItems: 'center' }}>
								<Text style={{ color: '#80848E', fontSize: 14 }}>No custom themes installed yet.</Text>
							</View>
						) : (
							installedThemes.map((theme) => (
								<ThemeListItem
									key={theme.id}
									theme={theme}
									isSelected={theme.id === storage.selectedThemeId}
									storage={storage}
									jsonStorage={api.jsonStorage}
									restartApp={restartApp}
								/>
							))
						)}
					</SectionGroup>
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
						{activeFont && (
							<View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
								<TouchableOpacity
									onPress={handleClearFont}
									style={{
										backgroundColor: '#4E5058',
										paddingVertical: 6,
										paddingHorizontal: 12,
										borderRadius: 6,
									}}
								>
									<Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
										Revert to Default
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>

					{/* Install Font From URL */}
					<SectionGroup title="INSTALL FONT PACK FROM URL">
						<View style={{ padding: 12 }}>
							<TextInput
								value={fontUrl}
								onChangeText={setFontUrl}
								placeholder="https://... / font.json"
								placeholderTextColor="#80848E"
								autoCapitalize="none"
								autoCorrect={false}
								style={{
									backgroundColor: '#1E1F22',
									color: '#FFFFFF',
									paddingHorizontal: 12,
									paddingVertical: 10,
									borderRadius: 8,
									fontSize: 14,
									marginBottom: 12,
								}}
							/>
							<ActionButton
								variant="primary"
								text={loading ? 'Downloading Font Pack...' : 'Install & Apply Font'}
								onPress={() => handleInstallFont()}
							/>
						</View>
					</SectionGroup>

					{/* Quick Font Presets */}
					<View style={{ marginBottom: 16, gap: 8 }}>
						<ActionButton
							variant="secondary"
							text={'\uD83D\uDD24 Preset: Google Sans'}
							onPress={() => {
								handleInstallFont('https://raw.githubusercontent.com/MarGar12/fontjson/main/jsons/GoogleSans-font.json')
							}}
						/>
						<ActionButton
							variant="secondary"
							text={'\uD83D\uDD24 Preset: Minecraft Tweaked'}
							onPress={() => {
								handleInstallFont('https://discordfonts-silly.nekoweb.org/MinecraftTweakedFont/MinecraftTweaked.json')
							}}
						/>
						<ActionButton
							variant="secondary"
							text={'\uD83D\uDD24 Preset: SF Pro'}
							onPress={() => {
								handleInstallFont('https://raw.githubusercontent.com/MarGar12/fontjson/main/jsons/SFPro-font.json')
							}}
						/>
					</View>

					{/* Installed Fonts List */}
					<SectionGroup title={`INSTALLED FONTS (${installedFonts.length})`}>
						{installedFonts.length === 0 ? (
							<View style={{ padding: 16, alignItems: 'center' }}>
								<Text style={{ color: '#80848E', fontSize: 14 }}>No custom font packs installed yet.</Text>
							</View>
						) : (
							installedFonts.map((font) => (
								<FontListItem
									key={font.name}
									font={font}
									isSelected={font.name === storage.selectedFontName}
									storage={storage}
									jsonStorage={api.jsonStorage}
									onSelectFont={handleSelectFont}
								/>
							))
						)}
					</SectionGroup>
				</View>
			)}

			<View style={{ height: 40 }} />
		</ScrollView>
	)
}
