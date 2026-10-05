import React from 'react'
import { ActivityIndicator, Image, ScrollView, View } from 'react-native'
import { checkQuoteAllowed, generateQuoteCard } from './api'
import {
	ActionSheet,
	ActionSheetCloseButton,
	BottomSheetTitleHeader,
	Button,
	hideActionSheet,
	TableRowGroup,
	TableSwitchRow,
	TextInput,
} from './components'
import { copyToClipboard, sendQuoteToChannel, showToast } from './quotes'
import { defaultSettings, storage } from './storage'
import type { ExtractedMessageInfo } from './quotes'

export const ACTION_SHEET_KEY = 'MakeItAQuoteSheet'

interface QuoteActionSheetProps {
	initialInfo: ExtractedMessageInfo
}

export default function QuoteActionSheet({
	initialInfo,
}: QuoteActionSheetProps) {
	const saved =
		storage.use?.()?.defaultSettings ??
		storage.cache?.defaultSettings ??
		defaultSettings.defaultSettings

	// Style switches
	const [light, setLight] = React.useState<boolean>(Boolean(saved.light))
	const [color, setColor] = React.useState<boolean>(Boolean(saved.color))
	const [bold, setBold] = React.useState<boolean>(Boolean(saved.bold))
	const [flip, setFlip] = React.useState<boolean>(Boolean(saved.flip))
	const [newLayout, setNewLayout] = React.useState<boolean>(Boolean(saved.new))
	const [gif, setGif] = React.useState<boolean>(Boolean(saved.gif))
	const [watermark, setWatermark] = React.useState<boolean>(
		Boolean(saved.watermark),
	)
	const [watermarkText, setWatermarkText] = React.useState<string>(
		saved.watermarkText || 'Make It A Quote',
	)

	// Custom Quote mode
	const [customMode, setCustomMode] = React.useState<boolean>(false)
	const [text, setText] = React.useState<string>(initialInfo.text)
	const [displayName, setDisplayName] = React.useState<string>(
		initialInfo.displayName,
	)
	const [username, setUsername] = React.useState<string>(initialInfo.username)
	const [avatarUrl, setAvatarUrl] = React.useState<string>(
		initialInfo.avatarUrl,
	)

	// Quote generation state
	const [quoteUrl, setQuoteUrl] = React.useState<string | null>(null)
	const [isZipline, setIsZipline] = React.useState<boolean>(false)
	const [loading, setLoading] = React.useState<boolean>(false)
	const [sending, setSending] = React.useState<boolean>(false)

	const isCustom =
		customMode &&
		(text !== initialInfo.text ||
			displayName !== initialInfo.displayName ||
			username !== initialInfo.username ||
			avatarUrl !== initialInfo.avatarUrl)

	const getPayload = () => ({
		text: text || '...',
		avatar: avatarUrl,
		username: username,
		display_name: displayName,
		color: Boolean(color),
		watermark: watermark ? watermarkText.trim() : '',
		light: Boolean(light),
		bold: Boolean(bold),
		flip: Boolean(flip),
		new: Boolean(newLayout),
		gif: Boolean(gif),
	})

	const generateCurrentQuote = async (): Promise<string | null> => {
		setLoading(true)
		try {
			// Check with Cloudflare privacy rules and generate quote card concurrently
			const checkPromise = checkQuoteAllowed(
				initialInfo.targetUserId,
				initialInfo.hasSpoilers,
				isCustom,
			)
			const cardPromise = generateQuoteCard(getPayload())

			const [check, res] = await Promise.all([checkPromise, cardPromise])

			if (!check.allowed) {
				const reason =
					check.reason || 'This user has disallowed quotes of their messages.'
				showToast(reason)
				setLoading(false)
				return null
			}

			if (res.success && res.url) {
				const finalUrl = res.ziplineUrl || res.url
				setIsZipline(Boolean(res.ziplineUrl))
				setQuoteUrl(finalUrl)
				return finalUrl
			} else {
				showToast(res.error || 'Failed to generate quote')
				return null
			}
		} catch (e) {
			console.error('[Quote] Error generating quote:', e)
			showToast('Error generating quote')
			return null
		} finally {
			setLoading(false)
		}
	}

	// Debounced auto-preview when options change
	React.useEffect(() => {
		const timeout = setTimeout(() => {
			generateCurrentQuote()
		}, 350)
		return () => clearTimeout(timeout)
	}, [light, color, bold, flip, newLayout, gif, watermark, watermarkText])

	const handleSend = async () => {
		setSending(true)
		const url = quoteUrl || (await generateCurrentQuote())
		if (url) {
			const sent = sendQuoteToChannel(initialInfo.channelId, url)
			if (sent) {
				hideActionSheet(ACTION_SHEET_KEY)
			}
		}
		setSending(false)
	}

	const handleCopy = async () => {
		const url = quoteUrl || (await generateCurrentQuote())
		if (url) {
			copyToClipboard(url)
			hideActionSheet(ACTION_SHEET_KEY)
		}
	}

	return (
		<ActionSheet>
			<BottomSheetTitleHeader
				title="Make it a Quote"
				subtitle={
					initialInfo.replyAuthor
						? `Replying to @${initialInfo.replyAuthor}`
						: isZipline
							? 'Quote Card (Hosted on Zipline)'
							: 'Customize your quote card'
				}
				trailing={
					<ActionSheetCloseButton
						onPress={() => hideActionSheet(ACTION_SHEET_KEY)}
					/>
				}
			/>
			<ScrollView style={{ paddingHorizontal: 16 }}>
				{/* Live Preview Card */}
				{loading && !quoteUrl ? (
					<View
						style={{
							height: 180,
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<ActivityIndicator size="large" color="#5865F2" />
					</View>
				) : quoteUrl ? (
					<View style={{ marginVertical: 8, alignItems: 'center' }}>
						<Image
							source={{ uri: quoteUrl }}
							style={{
								width: '100%',
								height: 180,
								borderRadius: 8,
								resizeMode: 'contain',
								backgroundColor: '#1e1f22',
							}}
						/>
						{loading && (
							<View style={{ position: 'absolute', top: 12, right: 12 }}>
								<ActivityIndicator size="small" color="#5865F2" />
							</View>
						)}
					</View>
				) : null}

				{/* Style Options */}
				<TableRowGroup title="Quote Style">
					<TableSwitchRow
						label="Colored Avatar / Profile"
						subLabel="Render user avatar in full color instead of black & white"
						value={color}
						onValueChange={setColor}
					/>
					<TableSwitchRow
						label="Bold Text"
						subLabel="Format quote text in bold"
						value={bold}
						onValueChange={setBold}
					/>
					<TableSwitchRow
						label="Watermark"
						subLabel="Show watermark text in bottom right"
						value={watermark}
						onValueChange={setWatermark}
					/>
					{watermark && (
						<TextInput
							label="Watermark Text"
							value={watermarkText}
							onChange={setWatermarkText}
							onChangeText={setWatermarkText}
							placeholder="Make It A Quote"
						/>
					)}
					<TableSwitchRow
						label="Light Background"
						subLabel="Use light background theme"
						value={light}
						onValueChange={setLight}
					/>
					<TableSwitchRow
						label="Flip Layout"
						subLabel="Swap avatar and text positions"
						value={flip}
						onValueChange={setFlip}
					/>
					<TableSwitchRow
						label="Modern Layout"
						subLabel="Use redesigned quote card structure"
						value={newLayout}
						onValueChange={setNewLayout}
					/>
					<TableSwitchRow
						label="Single-frame GIF"
						subLabel="Generate as GIF image"
						value={gif}
						onValueChange={setGif}
					/>
				</TableRowGroup>

				{/* Content Customization */}
				<TableRowGroup title="Customize Content">
					{Boolean(initialInfo.attachmentUrl) && (
						<TableSwitchRow
							label="Use Held Image as Avatar"
							subLabel="Feature the attached image on the quote card instead of user avatar"
							value={avatarUrl === initialInfo.attachmentUrl}
							onValueChange={(val: boolean) => {
								setAvatarUrl(
									val
										? (initialInfo.attachmentUrl as string)
										: initialInfo.avatarUrl,
								)
							}}
						/>
					)}
					<TableSwitchRow
						label="Custom Quote Mode"
						subLabel="Edit text, author name, or avatar"
						value={customMode}
						onValueChange={setCustomMode}
					/>
					{customMode && (
						<TextInput
							label="Quote Text"
							value={text}
							onChange={setText}
							onChangeText={setText}
							multiline
						/>
					)}
					{customMode && (
						<TextInput
							label="Display Name"
							value={displayName}
							onChange={setDisplayName}
							onChangeText={setDisplayName}
						/>
					)}
					{customMode && (
						<TextInput
							label="Username / Handle (@)"
							value={username}
							onChange={setUsername}
							onChangeText={setUsername}
						/>
					)}
					{customMode && (
						<TextInput
							label="Avatar URL"
							value={avatarUrl}
							onChange={setAvatarUrl}
							onChangeText={setAvatarUrl}
						/>
					)}
					{customMode && (
						<View style={{ marginHorizontal: 16, marginVertical: 8 }}>
							<Button
								text="Update Preview"
								variant="secondary"
								size="sm"
								onPress={() => generateCurrentQuote()}
							/>
						</View>
					)}
				</TableRowGroup>

				{/* Actions */}
				<View style={{ flexDirection: 'column', gap: 10, marginVertical: 18 }}>
					<Button
						text="Refresh Preview"
						variant="secondary"
						size="md"
						loading={loading}
						onPress={() => generateCurrentQuote()}
					/>
					<Button
						text="Send to Channel"
						variant="primary"
						size="md"
						loading={sending}
						disabled={loading}
						onPress={handleSend}
					/>
					<Button
						text={isZipline ? 'Copy Zipline Link' : 'Copy Image URL'}
						variant="secondary"
						size="md"
						disabled={loading}
						onPress={handleCopy}
					/>
				</View>
			</ScrollView>
		</ActionSheet>
	)
}
