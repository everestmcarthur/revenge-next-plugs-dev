import { useState } from 'react'
import { DEFAULTS } from './defaults'
import { installFont, removeFont, selectFont } from './lib/fonts'
import {
	fetchTheme,
	getCurrentTheme,
	removeTheme,
	selectTheme,
} from './lib/themes'
import type { PluginApi } from '@revenge-mod/plugins/types'
import type { FontDefinition, ThemeMasterStorage, VdThemeInfo } from './types'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: ThemeMasterStorage }>
}) {
	const { Page } =
		revenge.components as typeof import('@revenge-mod/components')
	const { ScrollView, View } = revenge.react.ReactNative
	const {
		Stack,
		TableRow,
		TableRowGroup,
		TableSwitchRow,
		TableRadioGroup,
		TableRadioRow,
		TextInput,
		Text,
	} = revenge.discord.design.Design

	const s = { ...DEFAULTS, ...(api.jsonStorage.use() ?? {}) }
	const set = (patch: Partial<ThemeMasterStorage>) =>
		api.jsonStorage.set({ ...s, ...patch })

	const [themeUrl, setThemeUrl] = useState('')
	const [fontUrl, setFontUrl] = useState('')
	const [status, setStatus] = useState('')

	const selectedFontName = s.selectedFontName

	const onInstallTheme = async () => {
		if (!themeUrl.trim()) return
		setStatus('Fetching theme...')
		try {
			const info = await fetchTheme(themeUrl.trim())
			set({
				themes: { ...s.themes, [info.id]: info },
			})
			setThemeUrl('')
			setStatus(`Installed theme: ${info.data.name ?? 'Unnamed'}`)
		} catch (e: any) {
			setStatus(`Failed: ${e?.message ?? e}`)
		}
	}

	const onSelectTheme = async (id: string) => {
		try {
			await selectTheme(api.jsonStorage, id)
			const active = getCurrentTheme(api.jsonStorage)
			setStatus(active ? `Selected: ${active.data.name ?? 'Unnamed'}` : '')
		} catch (e: any) {
			setStatus(`Failed to select: ${e?.message ?? e}`)
		}
	}

	const onRemoveTheme = async (id: string) => {
		try {
			await removeTheme(api.jsonStorage, id)
			setStatus('Theme removed')
		} catch (e: any) {
			setStatus(`Failed to remove: ${e?.message ?? e}`)
		}
	}

	const onInstallFont = async () => {
		if (!fontUrl.trim()) return
		setStatus('Fetching font...')
		try {
			const font = await installFont(api.jsonStorage, fontUrl.trim())
			setFontUrl('')
			setStatus(`Installed font: ${font.name}`)
		} catch (e: any) {
			setStatus(`Failed: ${e?.message ?? e}`)
		}
	}

	const onSelectFont = async (name: string | null) => {
		try {
			await selectFont(api.jsonStorage, name)
			setStatus(name ? `Selected font: ${name}` : 'Font disabled')
		} catch (e: any) {
			setStatus(`Failed: ${e?.message ?? e}`)
		}
	}

	const onRemoveFont = async (name: string) => {
		try {
			await removeFont(api.jsonStorage, name)
			setStatus('Font removed')
		} catch (e: any) {
			setStatus(`Failed to remove: ${e?.message ?? e}`)
		}
	}

	const current = getCurrentTheme(api.jsonStorage)

	return (
		<Page>
			<ScrollView contentContainerStyle={{ padding: 0 }}>
				<Stack>
					<TableRowGroup title="Theme">
						<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
							<TextInput
								value={themeUrl}
								onChange={setThemeUrl}
								placeholder="https://.../theme.json"
							/>
						</View>
						<TableRow label="Install from URL" onPress={onInstallTheme} />
					</TableRowGroup>

					{Object.keys(s.themes).length > 0 && (
						<TableRowGroup title="Installed themes">
							<TableRadioGroup
								defaultValue={s.selectedThemeId ?? ''}
								onChange={v => onSelectTheme(v as string)}
							>
								<TableRadioRow value="" label="None" />
								{Object.values(s.themes).map((t: VdThemeInfo) => (
									<TableRadioRow
										key={t.id}
										value={t.id}
										label={t.data.name ?? 'Unnamed'}
									/>
								))}
							</TableRadioGroup>
						</TableRowGroup>
					)}

					<TableRowGroup title="Font">
						<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
							<TextInput
								value={fontUrl}
								onChange={setFontUrl}
								placeholder="https://.../font.json"
							/>
						</View>
						<TableRow label="Install from URL" onPress={onInstallFont} />
					</TableRowGroup>

					{Object.keys(s.fonts).length > 0 && (
						<TableRowGroup title="Installed fonts">
							<TableRadioGroup
								defaultValue={s.selectedFontName ?? ''}
								onChange={v => onSelectFont((v as string) || null)}
							>
								<TableRadioRow value="" label="None" />
								{Object.values(s.fonts).map((f: FontDefinition) => (
									<TableRadioRow key={f.name} value={f.name} label={f.name} />
								))}
							</TableRadioGroup>
						</TableRowGroup>
					)}

					<TableRowGroup title="Options">
						<TableSwitchRow
							label="Show chat background"
							value={s.showChatBackground !== false}
							onValueChange={v => set({ showChatBackground: v })}
						/>
					</TableRowGroup>

					<TableRowGroup title="Manage">
						{current && (
							<TableRow
								label={`Remove theme: ${current.data.name ?? 'Unnamed'}`}
								onPress={() => onRemoveTheme(current.id)}
							/>
						)}
						{selectedFontName && (
							<TableRow
								label={`Remove font: ${selectedFontName}`}
								onPress={() => onRemoveFont(selectedFontName)}
							/>
						)}
					</TableRowGroup>

					{!!status && (
						<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
							<Text variant="text-xs/normal" color="text-muted">
								{status}
							</Text>
						</View>
					)}
				</Stack>
			</ScrollView>
		</Page>
	)
}
