import { Text, TextInput, TouchableOpacity, View } from 'react-native'

const PRESETS = [
	'#5865F2',
	'#10A37F',
	'#D97706',
	'#4285F4',
	'#00E5FF',
	'#F1C40F',
	'#EB459E',
	'#ED4245',
	'#23A55A',
	'#FFFFFF',
]

export function isValidHex(color: string): boolean {
	return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color.trim())
}

interface ColorInputProps {
	title: string
	value?: string
	placeholder?: string
	onChange: (value: string) => void
}

export default function ColorInput({
	title,
	value,
	placeholder,
	onChange,
}: ColorInputProps) {
	const valid = !value || isValidHex(value)
	const swatchColor = isValidHex(value ?? '')
		? value!
		: isValidHex(placeholder ?? '')
			? placeholder!
			: '#5865F2'

	return (
		<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
			<View
				style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
			>
				<View
					style={{
						width: 20,
						height: 20,
						borderRadius: 6,
						backgroundColor: swatchColor,
						marginRight: 10,
						borderWidth: 1,
						borderColor: 'rgba(128,128,128,0.35)',
					}}
				/>
				<Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>{title}</Text>
			</View>
			<TextInput
				value={value ?? ''}
				placeholder={placeholder ?? '#5865F2'}
				placeholderTextColor="#80848E"
				onChangeText={onChange}
				autoCapitalize="none"
				autoCorrect={false}
				style={{
					borderWidth: 1,
					borderColor: valid ? 'rgba(128,128,128,0.35)' : '#ED4245',
					borderRadius: 8,
					paddingHorizontal: 10,
					paddingVertical: 8,
					fontSize: 14,
					color: '#FFFFFF',
					marginBottom: 8,
				}}
			/>
			<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
				{PRESETS.map(preset => {
					const active = value?.toLowerCase() === preset.toLowerCase()
					return (
						<TouchableOpacity
							key={preset}
							onPress={() => onChange(preset)}
							style={{
								width: 24,
								height: 24,
								borderRadius: 6,
								backgroundColor: preset,
								marginRight: 8,
								marginBottom: 8,
								borderWidth: active ? 2 : 1,
								borderColor: active ? '#FFFFFF' : 'rgba(128,128,128,0.35)',
							}}
						/>
					)
				})}
			</View>
			{!valid && (
				<Text style={{ color: '#ED4245', marginTop: 2, fontSize: 12 }}>
					Invalid hex color, e.g. #5865F2
				</Text>
			)}
		</View>
	)
}
