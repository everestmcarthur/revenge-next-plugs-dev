import { React, ReactNative as RN } from '../../vendetta'
import { installPlugin, plugins, removePlugin } from '../../vendetta'
import { useProxy } from '../../vendetta'
import { getAssetIDByName } from '../../vendetta'
import { showToast } from '../../vendetta'

import { ActionSheet, hideActionSheet } from '../common/ActionSheet'
import Text from '../common/Text'
import { Lang } from '../../lang'
import { formatBytes } from '../../types'
import { lang, vstorage } from '../../index'
import { grabEverything } from '../../stuff/syncStuff'
import IgnoredPluginsPage from '../pages/IgnoredPluginsPage'

const antied = {
	old: 'https://angelix1.github.io/VP/antied/',
	new: 'https://angelix1.github.io/MP/angel/antied/',
}

export default function TooMuchDataSheet({ navigation }: { navigation: any }) {
	useProxy(plugins)

	const hasOldAntied = !!(plugins as any)[antied.old]
	const [data, setData] = React.useState<number | null>(null)

	React.useEffect(() => {
		grabEverything()
			.then(val => setData(JSON.stringify(val).length))
			.catch(() => setData(0))
	}, [])

	return (
		<ActionSheet
			title={lang.format('alert.too_much_data.title', {})}
			style={{ gap: 12, padding: 16 }}
		>
			<Text
				variant="text-md/medium"
				color="TEXT_DEFAULT"
				style={{ marginBottom: 8 }}
			>
				{Lang.basicFormat(
					lang.format('alert.too_much_data.body', {
						storage: data === null ? '... B' : formatBytes(data),
					}),
				)}
			</Text>
			{hasOldAntied && (
				<RN.TouchableOpacity
					style={{
						backgroundColor: '#2b2d31',
						padding: 12,
						borderRadius: 8,
						marginBottom: 8,
					}}
					onPress={async () => {
						const { enabled } = (plugins as any)[antied.old]

						if (!(plugins as any)[antied.new]) {
							await installPlugin(antied.new, enabled)
								.then(() => {
									removePlugin(antied.old)
									showToast(
										lang.format('toast.antied.installed', {}),
										getAssetIDByName('DownloadIcon'),
									)
								})
								.catch(() =>
									showToast(
										lang.format('toast.antied.failed', {}),
										getAssetIDByName('CircleWarningIcon-primary'),
									),
								)
						} else {
							removePlugin(antied.old)
							showToast(
								lang.format('toast.antied.already_installed', {}),
								getAssetIDByName('CircleWarningIcon-primary'),
							)
						}
					}}
				>
					<Text variant="text-md/semibold" color="TEXT_DEFAULT">
						{lang.format('alert.too_much_data.antied.label', {})}
					</Text>
					<Text variant="text-sm/medium" color="TEXT_MUTED">
						{lang.format('alert.too_much_data.antied.desc', {})}
					</Text>
				</RN.TouchableOpacity>
			)}
			<RN.TouchableOpacity
				style={{
					backgroundColor: '#2b2d31',
					padding: 12,
					borderRadius: 8,
					marginBottom: 8,
				}}
				onPress={() => {
					hideActionSheet()
					navigation.push('VendettaCustomPage', {
						render: IgnoredPluginsPage,
					})
				}}
			>
				<Text variant="text-md/semibold" color="TEXT_DEFAULT">
					{lang.format('alert.too_much_data.ignore_plugins.label', {})}
				</Text>
				<Text variant="text-sm/medium" color="TEXT_MUTED">
					{lang.format('alert.too_much_data.ignore_plugins.desc', {})}
				</Text>
			</RN.TouchableOpacity>
			<RN.TouchableOpacity
				style={{
					backgroundColor: '#5865f2',
					padding: 12,
					borderRadius: 8,
					alignItems: 'center',
					marginTop: 8,
				}}
				onPress={() => {
					hideActionSheet()
					vstorage.realTrackingAnalyticsSentToChina.tooMuchData = false
				}}
			>
				<Text style={{ color: '#fff', fontWeight: 'bold' }}>
					{lang.format('alert.too_much_data.continue', {})}
				</Text>
			</RN.TouchableOpacity>
		</ActionSheet>
	)
}
