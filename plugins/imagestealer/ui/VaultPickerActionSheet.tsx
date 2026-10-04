import { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Dimensions,
	FlatList,
	Image,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { fetchCloudflareVault } from '../api'
import {
	ActionSheet,
	BottomSheetTitleHeader,
	findByProps,
	getCurrentUserId,
	hideActionSheet,
	SearchInput,
	showToast,
} from '../components'
import { getStoredSettings, updateStoredSettings } from '../storage'
import type { VaultItem } from '../types'

export const VAULT_PICKER_SHEET_KEY = 'ImageStealerVaultPickerSheet'

function getSelectedChannelId(): string {
	try {
		const rev = (globalThis as any).revenge
		const sel =
			rev?.everest?.getSelectedChannelStore?.() ||
			findByProps('getLastSelectedChannelId') ||
			findByProps('getChannelId')
		return sel?.getLastSelectedChannelId?.() || sel?.getChannelId?.() || ''
	} catch {
		return ''
	}
}

function getMessageActions(): any {
	try {
		const rev = (globalThis as any).revenge
		const finders = rev?.modules?.finders
		const filters = finders?.filters
		if (finders?.lookupModule && filters?.withProps) {
			const mods = finders.lookupModule(
				filters.withProps('sendMessage', 'editMessage'),
			)
			if (mods?.[0]?.sendMessage || mods?.[0]?._sendMessage) return mods[0]
		}
	} catch {}
	return findByProps('sendMessage', 'editMessage') ?? findByProps('sendMessage')
}

export function formatEmojiForChat(
	item: VaultItem,
	format: 'cdn' | 'markdown' | 'attachment' = 'cdn',
): string {
	// If it has an emoji id, use Discord's lossless emoji CDN URL
	const ext = item.animated ? 'gif' : 'webp'
	const cdnUrl = /^[0-9]+$/.test(item.id)
		? `https://cdn.discordapp.com/emojis/${item.id}.${ext}?size=48&quality=lossless`
		: item.url

	if (format === 'markdown') {
		return `[​](${cdnUrl})` // Zero-width space link
	}
	return cdnUrl
}

export function sendVaultEmojiToChannel(
	channelId: string,
	item: VaultItem,
): boolean {
	if (!channelId) {
		showToast('Failed to send emoji: channel not found')
		return false
	}
	try {
		const settings = getStoredSettings()
		const formatted = formatEmojiForChat(item, settings.sendFormat)
		const actions = getMessageActions()
		const nonce = (BigInt(Date.now() - 1420070400000) << 22n).toString()
		const msgPayload = {
			content: formatted,
			tts: false,
			invalidEmojis: [],
			validNonShortcutEmojis: [],
		}
		const opts = { nonce }

		if (typeof actions?._sendMessage === 'function') {
			actions._sendMessage(channelId, msgPayload, opts)
			showToast(`Sent :${item.name}:!`)
			return true
		}
		if (typeof actions?.sendMessage === 'function') {
			actions.sendMessage(channelId, msgPayload, void 0, opts)
			showToast(`Sent :${item.name}:!`)
			return true
		}
	} catch (e) {
		console.error('[ImageStealer] Error sending vault emoji:', e)
	}
	return false
}

export default function VaultPickerActionSheet() {
	const [vault, setVault] = useState<VaultItem[]>([])
	const [query, setQuery] = useState('')
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		const local = getStoredSettings().vault
		setVault(local)

		// Background sync with Cloudflare KV
		const userId = getCurrentUserId()
		if (userId) {
			setLoading(true)
			fetchCloudflareVault(userId).then(cloudItems => {
				setLoading(false)
				if (cloudItems && cloudItems.length > 0) {
					// Merge and deduplicate
					const merged = [...cloudItems]
					for (const l of local) {
						if (!merged.some(m => m.id === l.id)) {
							merged.push(l)
						}
					}
					setVault(merged)
					updateStoredSettings({ vault: merged })
				}
			})
		}
	}, [])

	const filtered = vault.filter(item =>
		item.name.toLowerCase().includes(query.toLowerCase()),
	)

	const handleSelect = (item: VaultItem) => {
		const channelId = getSelectedChannelId()
		const sent = sendVaultEmojiToChannel(channelId, item)
		if (sent) {
			hideActionSheet(VAULT_PICKER_SHEET_KEY)
		}
	}

	const numColumns = 5
	const screenWidth = Dimensions.get('window').width
	const itemSize = Math.floor((screenWidth - 48) / numColumns)

	return (
		<ActionSheet>
			<BottomSheetTitleHeader
				title="Emoji Vault"
				subtitle={`${vault.length} item${vault.length === 1 ? '' : 's'} available`}
			/>

			<View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
				<SearchInput
					placeholder="Search Vault..."
					value={query}
					onChange={setQuery}
					onChangeText={setQuery}
				/>
			</View>

			{loading && vault.length === 0 ? (
				<ActivityIndicator
					size="small"
					color="#5865F2"
					style={{ marginVertical: 32 }}
				/>
			) : filtered.length === 0 ? (
				<View style={{ padding: 32, alignItems: 'center' }}>
					<Text style={{ color: '#9A9A9A', fontSize: 14, textAlign: 'center' }}>
						{vault.length === 0
							? 'Your Vault is empty! Long-press any message in chat to steal emojis and stickers.'
							: 'No matching emojis found.'}
					</Text>
				</View>
			) : (
				<FlatList
					data={filtered}
					keyExtractor={item => item.id}
					numColumns={numColumns}
					contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
					renderItem={({ item }) => (
						<TouchableOpacity
							onPress={() => handleSelect(item)}
							style={{
								width: itemSize,
								height: itemSize,
								alignItems: 'center',
								justifyContent: 'center',
								margin: 3,
								backgroundColor: 'rgba(255,255,255,0.06)',
								borderRadius: 8,
							}}
						>
							<Image
								source={{ uri: item.url }}
								style={{
									width: itemSize - 12,
									height: itemSize - 12,
									resizeMode: 'contain',
								}}
							/>
						</TouchableOpacity>
					)}
				/>
			)}
		</ActionSheet>
	)
}
