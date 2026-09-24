import React, { useMemo, useState } from 'react'
import {
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { cleanMessage } from '../lib/cleanMessage'
import JsonView from './JsonView'

export default function RawPage({
	message,
	onClose,
}: {
	message: any
	onClose?: () => void
}) {
	const [query, setQuery] = useState('')

	const stringMessage = useMemo(() => {
		try {
			return JSON.stringify(cleanMessage(message), null, 4)
		} catch (e) {
			return String(e)
		}
	}, [message?.id])

	const copyText = (text: string, label: string) => {
		try {
			revenge.react.ReactNative?.Clipboard?.setString?.(text)
			revenge.discord.actions?.ToastActionCreators?.open?.({
				content: `Copied ${label} to clipboard!`,
			})
		} catch {}
	}

	return (
		<View style={{ flex: 1, backgroundColor: '#1E1F22' }}>
			{/* Top Action Bar (Copy Buttons + Optional Standalone Close Button) */}
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					paddingHorizontal: 16,
					paddingTop: 12,
					paddingBottom: 10,
					borderBottomWidth: 1,
					borderBottomColor: 'rgba(255,255,255,0.08)',
				}}
			>
				{onClose ? (
					<TouchableOpacity
						onPress={onClose}
						style={{
							paddingVertical: 6,
							paddingHorizontal: 12,
							backgroundColor: '#313338',
							borderRadius: 6,
						}}
					>
						<Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
							Back
						</Text>
					</TouchableOpacity>
				) : (
					<Text style={{ color: '#949BA4', fontSize: 12, fontWeight: '600' }}>
						PAYLOAD INSPECTOR
					</Text>
				)}

				<View style={{ flexDirection: 'row', gap: 8 }}>
					{!!message?.content && (
						<TouchableOpacity
							onPress={() => copyText(message.content, 'message content')}
							style={{
								backgroundColor: '#5865F2',
								borderRadius: 6,
								paddingVertical: 6,
								paddingHorizontal: 10,
							}}
						>
							<Text
								style={{
									color: '#FFFFFF',
									fontSize: 12,
									fontWeight: '600',
								}}
							>
								Copy Text
							</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity
						onPress={() => copyText(stringMessage, 'raw JSON')}
						style={{
							backgroundColor: '#5865F2',
							borderRadius: 6,
							paddingVertical: 6,
							paddingHorizontal: 10,
						}}
					>
						<Text
							style={{
								color: '#FFFFFF',
								fontSize: 12,
								fontWeight: '600',
							}}
						>
							Copy JSON
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Main Scrollable Content */}
			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
				keyboardShouldPersistTaps="handled"
			>
				{/* Search Input */}
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="Search keys or values…"
					placeholderTextColor="#888"
					autoCapitalize="none"
					autoCorrect={false}
					style={{
						backgroundColor: '#2B2D31',
						borderWidth: 1,
						borderColor: 'rgba(255,255,255,0.1)',
						borderRadius: 8,
						paddingHorizontal: 12,
						paddingVertical: 10,
						marginBottom: 14,
						color: '#DBDEE1',
						fontSize: 14,
					}}
				/>

				{/* Message Content Preview */}
				{!!message?.content && (
					<View
						style={{
							backgroundColor: '#2B2D31',
							borderRadius: 8,
							padding: 12,
							marginBottom: 16,
							borderLeftWidth: 3,
							borderLeftColor: '#5865F2',
						}}
					>
						<Text
							style={{
								fontSize: 11,
								color: '#949BA4',
								marginBottom: 6,
								fontWeight: '700',
								letterSpacing: 0.5,
							}}
						>
							MESSAGE CONTENT
						</Text>
						<Text
							selectable
							style={{
								fontFamily: 'monospace',
								fontSize: 13,
								color: '#DBDEE1',
								lineHeight: 18,
							}}
						>
							{message.content}
						</Text>
					</View>
				)}

				<Text
					style={{
						fontSize: 11,
						color: '#949BA4',
						marginBottom: 8,
						fontWeight: '700',
						letterSpacing: 0.5,
					}}
				>
					RAW DATA (JSON)
				</Text>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator
					style={{
						backgroundColor: '#111214',
						borderRadius: 8,
						padding: 12,
					}}
				>
					<JsonView text={stringMessage} query={query} />
				</ScrollView>
			</ScrollView>
		</View>
	)
}
