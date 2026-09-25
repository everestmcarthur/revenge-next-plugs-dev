import {
	Alert,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { deleteFont, selectFont, saveFont } from './lib/fonts'
import { deleteTheme, extractFontFromTheme, selectTheme } from './lib/themes'
import type { CustomFontDefinition, InstalledTheme, ThemeifyStorage } from './types'

export function ActionButton({
	text,
	onPress,
	variant = 'primary',
	disabled = false,
}: {
	text: string
	onPress: () => void
	variant?: 'primary' | 'secondary' | 'danger'
	disabled?: boolean
}) {
	const bg =
		variant === 'danger'
			? '#DA373C'
			: variant === 'secondary'
				? '#4E5058'
				: '#5865F2'

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.7}
			style={{
				backgroundColor: disabled ? '#35373C' : bg,
				paddingVertical: 12,
				paddingHorizontal: 16,
				borderRadius: 8,
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>{text}</Text>
		</TouchableOpacity>
	)
}

export function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<View style={{ marginBottom: 16 }}>
			<Text
				style={{
					color: '#949BA4',
					fontSize: 12,
					fontWeight: '700',
					letterSpacing: 0.5,
					marginBottom: 8,
					paddingHorizontal: 4,
				}}
			>
				{title}
			</Text>
			<View
				style={{
					backgroundColor: '#2B2D31',
					borderRadius: 12,
					overflow: 'hidden',
				}}
			>
				{children}
			</View>
		</View>
	)
}

export function ThemeListItem({
	theme,
	isSelected,
	storage,
	jsonStorage,
	restartApp,
}: {
	theme: InstalledTheme
	isSelected: boolean
	storage: ThemeifyStorage
	jsonStorage: any
	restartApp: () => void
}) {
	const fontPack = extractFontFromTheme(theme.data)

	return (
		<View
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
						onPress={() => selectTheme(jsonStorage, theme.id, storage)}
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
							saveFont(jsonStorage, fontPack, true, storage)
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
					onPress={() => deleteTheme(jsonStorage, theme.id, storage)}
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
}

export function FontListItem({
	font,
	isSelected,
	storage,
	jsonStorage,
	onSelectFont,
}: {
	font: CustomFontDefinition
	isSelected: boolean
	storage: ThemeifyStorage
	jsonStorage: any
	onSelectFont: (name: string) => void
}) {
	return (
		<View
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
					{font.description && (
						<Text style={{ color: '#949BA4', fontSize: 12, marginTop: 2 }}>
							{font.description}
						</Text>
					)}
				</View>
			</View>

			<View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
				{!isSelected ? (
					<TouchableOpacity
						onPress={() => onSelectFont(font.name)}
						style={{
							backgroundColor: '#5865F2',
							paddingVertical: 8,
							paddingHorizontal: 16,
							borderRadius: 6,
						}}
					>
						<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
							Select Font
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
					onPress={() => deleteFont(jsonStorage, font.name, storage)}
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
}
