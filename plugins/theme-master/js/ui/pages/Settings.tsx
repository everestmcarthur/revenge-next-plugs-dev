import { Design } from '@revenge-mod/discord/design'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { fetchThemeSpec, resolveSpecColors } from '../../lib/spec'
import type { PluginApi } from '@revenge-mod/plugins/types'
import type { ThemeMasterStorage } from '../../lib/types'

export default function Settings({
	api,
}: {
	api: PluginApi<{ jsonStorage: ThemeMasterStorage }>
}) {
	const { TableRowGroup, TableSwitchRow, TableRow, TextInput, Text } = Design
	const storage = api.jsonStorage.use()
	const [url, setUrl] = useState(storage?.specUrl ?? '')
	const [status, setStatus] = useState('')
	const [loading, setLoading] = useState(false)

	const loadFromUrl = async () => {
		if (!url.trim()) return
		setLoading(true)
		setStatus('Fetching...')
		try {
			const spec = await fetchThemeSpec(url.trim())
			const applied = resolveSpecColors(spec)
			api.jsonStorage.set(
				{
					enabled: true,
					specName: spec.name ?? 'Custom',
					specUrl: url.trim(),
					semanticColors: applied.resolvedColors,
				},
				true,
			)
			setStatus(
				`Applied "${spec.name ?? 'Custom'}" - ${applied.directCount} direct, ${applied.aliasedCount} aliased, ${applied.droppedCount} unmapped`,
			)
		} catch (e: any) {
			setStatus(`Failed to load: ${e?.message ?? e}`)
		} finally {
			setLoading(false)
		}
	}

	const reset = () => {
		api.jsonStorage.set(
			{ enabled: false, specName: '', specUrl: '', semanticColors: {} },
			true,
		)
		setUrl('')
		setStatus('')
	}

	return (
		<ScrollView style={{ flex: 1 }}>
			<View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
				<Text variant="text-sm/normal" color="text-muted">
					Paste a link to a Bunny/Vendetta-format theme spec (.json) to apply
					it. Older theme token names are mapped to Revenge's current color
					tokens on a best-effort basis, so some colors may not carry over
					exactly. Background images aren't supported yet.
				</Text>
			</View>

			<TableRowGroup title="Enable">
				<TableSwitchRow
					label="Apply Theme Master colors"
					subLabel={storage?.specName ? `Active: ${storage.specName}` : undefined}
					value={!!storage?.enabled}
					onValueChange={(v: boolean) => api.jsonStorage.set({ enabled: v })}
				/>
			</TableRowGroup>

			<TableRowGroup title="Theme">
				<View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
					<TextInput
						value={url}
						onChange={setUrl}
						placeholder="https://.../theme.json"
					/>
				</View>
				<TableRow label={loading ? 'Loading...' : 'Load from URL'} onPress={loadFromUrl} />
				{!!status && (
					<View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
						<Text variant="text-xs/normal" color="text-muted">
							{status}
						</Text>
					</View>
				)}
			</TableRowGroup>

			<TableRowGroup title="Advanced">
				<TableRow label="Reset everything" subLabel="Clear the active theme" onPress={reset} />
			</TableRowGroup>

			<View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
				<Text variant="text-xs/normal" color="text-muted">
					Theme Master by Raiden. Want a custom theme or plugin made? Contact
					Raiden.
				</Text>
			</View>

			<View style={{ height: 24 }} />
		</ScrollView>
	)
}
