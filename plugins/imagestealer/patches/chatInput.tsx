import {
	findByProps,
	getActionSheetActionCreators,
	openLazyActionSheet,
} from '../components'
import { getStoredSettings } from '../storage'
import VaultPickerActionSheet, {
	formatEmojiForChat,
	VAULT_PICKER_SHEET_KEY,
} from '../ui/VaultPickerActionSheet'

function getRevenge(): any {
	try {
		if (typeof revenge !== 'undefined') return revenge
	} catch {}
	return (globalThis as any).revenge
}

function getMessageActions(): any {
	try {
		const rev = getRevenge()
		const finders = rev?.modules?.finders
		const filters = finders?.filters
		if (finders?.lookupModule && filters?.withProps) {
			const mods = finders.lookupModule(
				filters.withProps('sendMessage', 'editMessage'),
			)
			if (mods?.[0]?.sendMessage || mods?.[0]?._sendMessage) return mods[0]
			const mods2 = finders.lookupModule(
				filters.withProps('receiveMessage', 'sendMessage'),
			)
			if (mods2?.[0]?.sendMessage || mods2?.[0]?._sendMessage) return mods2[0]
		}
	} catch {}
	return findByProps('sendMessage', 'editMessage') ?? findByProps('sendMessage')
}

function getActionSheetRow(): any {
	const rev = getRevenge()
	return (
		rev?.discord?.design?.Design?.ActionSheetRow ||
		rev?.modules?.finders?.lookupModule?.(
			rev.modules.finders.filters.withProps('ActionSheetRow'),
		)?.[0]?.ActionSheetRow
	)
}

function getVaultIconAsset(): any {
	const rev = getRevenge()
	return (
		rev?.assets?.getAssetIdByName?.('ic_reaction_add_24px') ??
		rev?.assets?.getAssetIdByName?.('ic_custom_emoji_24px') ??
		rev?.assets?.getAssetIdByName?.('DownloadIcon') ??
		399
	)
}

export function openVaultPicker(): void {
	openLazyActionSheet(VaultPickerActionSheet, VAULT_PICKER_SHEET_KEY)
}

export function patchChatInput(): () => void {
	const rev = getRevenge()
	const patcher = rev?.patcher
	const actions = getActionSheetActionCreators()
	const messageActions = getMessageActions()
	const patches: Array<() => void> = []

	// 1. Hook sendMessage / _sendMessage for Nitro-style text replacement
	if (messageActions && patcher?.before) {
		const transformContent = (payload: any) => {
			if (!payload || typeof payload.content !== 'string') return
			const settings = getStoredSettings()
			if (!settings.nitroBypass || !settings.vault.length) return

			let content = payload.content
			for (const item of settings.vault) {
				const pattern = new RegExp(`:${item.name}:`, 'g')
				if (pattern.test(content)) {
					const formatted = formatEmojiForChat(item, settings.sendFormat)
					content = content.replace(pattern, formatted)
				}
			}
			payload.content = content
		}

		if (typeof messageActions._sendMessage === 'function') {
			const unpatch = patcher.before(
				messageActions,
				'_sendMessage',
				(args: any[]) => {
					try {
						transformContent(args?.[1])
					} catch (e) {
						console.error('[ImageStealer] Error in _sendMessage hook:', e)
					}
					return args
				},
			)
			if (typeof unpatch === 'function') patches.push(unpatch)
		}

		if (typeof messageActions.sendMessage === 'function') {
			const unpatch = patcher.before(
				messageActions,
				'sendMessage',
				(args: any[]) => {
					try {
						transformContent(args?.[1])
					} catch (e) {
						console.error('[ImageStealer] Error in sendMessage hook:', e)
					}
					return args
				},
			)
			if (typeof unpatch === 'function') patches.push(unpatch)
		}
	}

	// 2. Chat action sheet ('+' button long-press or accessory sheet) hook
	if (actions?.openLazy && patcher?.before) {
		const unpatch = patcher.before(actions, 'openLazy', (args: any[]) => {
			try {
				const componentPromise = args?.[0]
				const key = String(args?.[1] || '')

				if (!componentPromise?.then) return args
				if (!/Chat|Input|Upload|Accessory/i.test(key)) return args

				componentPromise.then((instance: any) => {
					if (!instance || instance.__vaultPickerPatched) return
					instance.__vaultPickerPatched = true

					const isMemo =
						typeof instance.default === 'object' && instance.default !== null
					const target = isMemo ? instance.default : instance
					const prop = isMemo ? 'type' : 'default'

					if (typeof target[prop] !== 'function') return

					const unpatchTarget = patcher.after(target, prop, (comp: any) => {
						if (!comp) return comp
						try {
							const ActionSheetRow = getActionSheetRow()
							if (!ActionSheetRow) return comp

							const vaultRow = (
								<ActionSheetRow
									key="imagestealer-vault-picker-row"
									label="Emoji Vault"
									icon={getVaultIconAsset()}
									onPress={openVaultPicker}
								/>
							)

							if (Array.isArray(comp?.props?.children)) {
								comp.props.children.push(vaultRow)
							} else if (Array.isArray(comp)) {
								comp.push(vaultRow)
							}
						} catch (e) {
							console.error('[ImageStealer] error injecting vault row:', e)
						}
						return comp
					})
					if (typeof unpatchTarget === 'function') patches.push(unpatchTarget)
				})
			} catch (e) {
				console.error('[ImageStealer] openLazy chat hook error:', e)
			}
			return args
		})
		if (typeof unpatch === 'function') patches.push(unpatch)
	}

	return () => {
		for (const p of patches) {
			try {
				p()
			} catch {}
		}
	}
}
