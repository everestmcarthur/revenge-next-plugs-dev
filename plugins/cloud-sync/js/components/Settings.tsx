import { plugin, settings } from '../vendetta'
import { findByStoreName } from '../vendetta'
import {
	NavigationNative,
	React,
	ReactNative as RN,
	stylesheet,
} from '../vendetta'
import { storage } from '../vendetta'
import { useProxy } from '../vendetta'
import { semanticColors } from '../vendetta'
import { getAssetIDByName } from '../vendetta'
import { Forms } from '../vendetta'

import { BetterTableRowGroup } from './common/BetterTableRow'
import Text from './common/Text'
import { initState, lang, vstorage } from '../index'
import { useAuthorizationStore } from '../stores/AuthorizationStore'
import { useCacheStore } from '../stores/CacheStore'
import { getData } from '../stuff/api'
import DataStat from './DataStat'
import NerdConfig from './NerdConfig'
import IgnoredPluginsPage from './pages/IgnoredPluginsPage'
import { AuthorizationSection, DataManagementSection } from './SettingsSections'

const UserStore = findByStoreName('UserStore')
const { FormRow, FormSwitchRow } = Forms

export default function Settings() {
	useProxy(storage)
	const [, forceUpdate] = React.useReducer(x => ~x, 0)

	const [showDev, setShowDev] = React.useState(false)
	const [isBusy, setIsBusy] = React.useState<string[]>([])
	const { data, at } = useCacheStore()
	const { isAuthorized } = useAuthorizationStore()

	const userId = UserStore.getCurrentUser()?.id ?? null
	if (initState.didInit !== userId) {
		initState.didInit = userId
		if (isAuthorized()) {
			getData()
		}
	}

	const navigation = NavigationNative.useNavigation()

	const setBusy = (x: string) =>
		!isBusy.includes(x) && setIsBusy([...isBusy, x])
	const unBusy = (x: string) => {
		setIsBusy(isBusy.filter(y => x !== y))
	}
	let lastTap = 0

	const styles = stylesheet.createThemedStyleSheet({
		androidRipple: {
			color: semanticColors.ANDROID_RIPPLE,
			cornerRadius: 4,
		},
		titleIcon: {
			width: 16,
			height: 16,
			marginTop: 1.5,
			tintColor: semanticColors.TEXT_MUTED,
		},
	})

	return (
		<RN.ScrollView>
			<BetterTableRowGroup
				title={lang.format('settings.your_data.title', {})}
				icon={getAssetIDByName(
					(plugin.manifest as any)?.vendetta?.icon ?? 'CloudIcon',
				)}
				padding={true}
			>
				<RN.View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						marginVertical: 8,
					}}
				>
					<DataStat
						count={data ? Object.keys(data.plugins).length : '-'}
						subtitle={'settings.your_data.plugins'}
					/>
					<DataStat
						count={data ? Object.keys(data.themes).length : '-'}
						subtitle={'settings.your_data.themes'}
					/>
					<DataStat
						count={
							data
								? Object.keys(data.fonts.installed).length +
									data.fonts.custom.length
								: '-'
						}
						subtitle={'settings.your_data.fonts'}
					/>
				</RN.View>
				{at && (
					<Text variant="text-sm/medium" color="TEXT_MUTED" align="center">
						{lang.format('settings.your_data.last_synced', {
							date: new Date(at).toLocaleString(undefined, {
								weekday: 'long',
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								hour: 'numeric',
								minute: 'numeric',
								second: 'numeric',
							}),
						})}
					</Text>
				)}
			</BetterTableRowGroup>

			<BetterTableRowGroup
				title={
					<RN.Pressable
						android_ripple={styles.androidRipple}
						accessibilityRole={'button'}
						onPress={
							settings.developerSettings
								? () => {
										if (lastTap >= Date.now()) {
											vstorage.realTrackingAnalyticsSentToChina.pressedSettings = true
											setShowDev(!showDev)
											lastTap = 0
										} else {
											lastTap = Date.now() + 500
										}
									}
								: undefined
						}
						style={{ width: '100%', marginBottom: 8 }}
					>
						<RN.View
							style={{
								gap: 4,
								flexDirection: 'row',
								alignItems: 'center',
								alignSelf: 'flex-start',
							}}
						>
							<RN.Image
								style={styles.titleIcon}
								source={getAssetIDByName('SettingsIcon')}
								resizeMode="cover"
							/>
							<Text variant="text-sm/semibold" color="TEXT_MUTED">
								{lang.format('settings.config.title', {})}
							</Text>
						</RN.View>
					</RN.Pressable>
				}
				icon={getAssetIDByName('SettingsIcon')}
			>
				<FormSwitchRow
					label={lang.format('settings.config.auto_save.title', {})}
					subLabel={
						vstorage.realTrackingAnalyticsSentToChina.tooMuchData ? (
							<Text color="TEXT_FEEDBACK_CRITICAL" variant="text-sm/bold">
								{lang.format('settings.config.auto_save.description.error', {})}
							</Text>
						) : (
							lang.format('settings.config.auto_save.description', {})
						)
					}
					leading={<FormRow.Icon source={getAssetIDByName('RefreshIcon')} />}
					onValueChange={() => {
						vstorage.realTrackingAnalyticsSentToChina.tooMuchData = false
						vstorage.config.autoSync = !vstorage.config.autoSync
						forceUpdate()
					}}
					value={vstorage.config.autoSync}
				/>
				<FormSwitchRow
					label={lang.format('settings.config.settings_pin.title', {})}
					subLabel={lang.format('settings.config.settings_pin.description', {})}
					leading={<FormRow.Icon source={getAssetIDByName('PinIcon')} />}
					onValueChange={() => {
						vstorage.config.addToSettings = !vstorage.config.addToSettings
					}}
					value={vstorage.config.addToSettings}
				/>
				<FormRow
					label={lang.format('page.ignored_plugins.title', {
						count: vstorage.config.ignoredPlugins.length.toString(),
					})}
					leading={
						<FormRow.Icon source={getAssetIDByName('ListBulletsIcon')} />
					}
					trailing={<FormRow.Arrow />}
					onPress={() =>
						navigation.push('VendettaCustomPage', {
							render: IgnoredPluginsPage,
						})
					}
				/>
			</BetterTableRowGroup>

			{showDev && <NerdConfig />}

			<AuthorizationSection
				navigation={navigation}
				isBusy={isBusy}
				setBusy={setBusy}
				unBusy={unBusy}
			/>

			<DataManagementSection
				navigation={navigation}
				isBusy={isBusy}
				setBusy={setBusy}
				unBusy={unBusy}
			/>

			<RN.View style={{ height: 12 }} />
		</RN.ScrollView>
	)
}
