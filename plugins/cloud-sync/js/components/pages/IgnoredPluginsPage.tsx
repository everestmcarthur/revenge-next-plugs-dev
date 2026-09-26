import { logger } from '../../vendetta'
import { React, ReactNative as RN } from '../../vendetta'
import { plugins } from '../../vendetta'
import { showConfirmationAlert } from '../../vendetta'
import { getAssetIDByName } from '../../vendetta'
import { Search } from '../../vendetta'
import { showToast } from '../../vendetta'

import Text from '../common/Text'
import { formatBytes } from '../../types'
import { lang, vstorage } from '../../index'
import { grabEverything } from '../../stuff/syncStuff'

export default function IgnoredPluginsPage() {
	const [search, setSearch] = React.useState('')
	const [sizedPlugins, setSizedPlugins] = React.useState<
		| {
				id: string
				plugin: any
				size: number
		  }[]
		| null
	>(null)
	const [_, forceUpdate] = React.useReducer(x => ~x, 0)

	React.useEffect(() => setSearch(''), [])
	React.useEffect(() => {
		grabEverything(true)
			.then(val =>
				setSizedPlugins(
					Object.entries(plugins as any)
						.map(([id, plugin]: [string, any]) => ({
							id,
							plugin,
							size: (val.plugins[id]?.storage ?? '').length,
						}))
						.sort((a, b) => b.size - a.size),
				),
			)
			.catch(e => {
				showToast('Failed to grab plugins storage size')
				logger.error('grabEverything', e)
			})
	}, [])

	if (!sizedPlugins) {
		return (
			<RN.ActivityIndicator style={{ flex: 1, marginTop: 40 }} size="large" />
		)
	}

	const filtered = sizedPlugins.filter(x =>
		(x.plugin?.manifest?.name || x.id).toLowerCase().includes(search),
	)

	return (
		<RN.FlatList
			ListHeaderComponent={
				<RN.View style={{ marginBottom: 12 }}>
					<Search
						style={{ marginBottom: 8 }}
						onChangeText={(x: string) => setSearch(x.toLowerCase())}
					/>
					{vstorage.config.ignoredPlugins.length > 0 && (
						<RN.TouchableOpacity
							style={{
								backgroundColor: '#da373c',
								padding: 10,
								borderRadius: 8,
								alignItems: 'center',
								marginBottom: 8,
							}}
							onPress={() => {
								showConfirmationAlert({
									title: lang.format('alert.clear_ignored_plugins.title', {}),
									content: lang.format('alert.clear_ignored_plugins.body', {}),
									confirmText: lang.format(
										'alert.clear_ignored_plugins.confirm',
										{},
									),
									confirmColor: 'red' as any,
									onConfirm: () => {
										vstorage.config.ignoredPlugins = []
										forceUpdate()
									},
								})
							}}
						>
							<Text style={{ color: '#fff', fontWeight: 'bold' }}>
								{lang.format('alert.clear_ignored_plugins.title', {})} (
								{vstorage.config.ignoredPlugins.length})
							</Text>
						</RN.TouchableOpacity>
					)}
				</RN.View>
			}
			style={{ paddingHorizontal: 12, paddingTop: 12 }}
			contentContainerStyle={{ paddingBottom: 24 }}
			ItemSeparatorComponent={() => <RN.View style={{ height: 8 }} />}
			data={filtered}
			keyExtractor={item => item.id}
			renderItem={({ item: { id, plugin, size } }) => {
				const isIgnored = vstorage.config.ignoredPlugins.includes(id)
				return (
					<RN.View
						style={{
							backgroundColor: '#1e1f22',
							borderRadius: 12,
							padding: 12,
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}
					>
						<RN.View style={{ flex: 1, marginRight: 8 }}>
							<Text variant="text-md/semibold" color="TEXT_DEFAULT">
								{plugin?.manifest?.name || id}
							</Text>
							<Text variant="text-sm/medium" color="TEXT_MUTED">
								{formatBytes(size)}
							</Text>
						</RN.View>
						<RN.TouchableOpacity
							style={{
								backgroundColor: isIgnored ? '#5865f2' : '#2b2d31',
								paddingHorizontal: 12,
								paddingVertical: 6,
								borderRadius: 8,
							}}
							onPress={() => {
								if (isIgnored) {
									vstorage.config.ignoredPlugins.splice(
										vstorage.config.ignoredPlugins.indexOf(id),
										1,
									)
								} else {
									vstorage.config.ignoredPlugins.push(id)
								}
								forceUpdate()
							}}
						>
							<Text style={{ color: '#fff', fontWeight: '600' }}>
								{isIgnored ? 'Ignored' : 'Ignore'}
							</Text>
						</RN.TouchableOpacity>
					</RN.View>
				)
			}}
		/>
	)
}

export function openIgnoredPluginsPage(navigation: any) {
	navigation.push('VendettaCustomPage', {
		render: IgnoredPluginsPage,
		title: lang.format('page.ignored_plugins.title', {
			count: vstorage.config.ignoredPlugins.length.toString(),
		}),
	})
}
