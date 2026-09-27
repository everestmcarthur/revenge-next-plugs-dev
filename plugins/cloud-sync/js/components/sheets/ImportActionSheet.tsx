import { React, ReactNative as RN, stylesheet } from '../../vendetta'
import { plugins } from '../../vendetta'
import { themes } from '../../vendetta'
import { semanticColors } from '../../vendetta'
import { showConfirmationAlert } from '../../vendetta'
import { getAssetIDByName } from '../../vendetta'
import { Forms } from '../../vendetta'

import { ActionSheet, hideActionSheet } from '../common/ActionSheet'
import Text from '../common/Text'
import { canImport, isPluginProxied, lang } from '../../index'
import { useCacheStore, type UserData } from '../../stores/CacheStore'
import { getFonts, hasFontByName, hasFontBySource } from '../../stuff/fonts'
import { importData, type SyncImportOptions } from '../../stuff/syncStuff'
import { openImportLogsPage } from '../pages/ImportLogsPage'

const { FormCheckboxRow } = Forms as any

export default function ImportActionSheet({
	defOptions,
	data = useCacheStore.getState().data!,
	navigation,
}: {
	defOptions?: SyncImportOptions
	data?: UserData
	navigation: any
}) {
	const fonts = getFonts()
	const has = {
		plugins: Object.keys(data?.plugins ?? {}).filter(canImport).length,
		repos: data?.repos?.length ?? 0,
		settings: Object.keys(data?.settings ?? {}).length,
		experiments: Object.keys(data?.experiments ?? {}).length,
		themes: Object.keys(data?.themes ?? {}).length,
		fonts:
			Object.keys(data?.fonts?.installed ?? {}).length +
			(data?.fonts?.custom ?? []).length,
	}
	const total =
		has.plugins +
		has.repos +
		has.settings +
		has.experiments +
		has.themes +
		has.fonts

	const [options, setOptions] = React.useState<SyncImportOptions>(
		defOptions ?? {
			plugins: !!has.plugins,
			repos: !!has.repos,
			settings: !!has.settings,
			experiments: !!has.experiments,
			themes: !!has.themes,
			fonts: !!has.fonts,
		},
	)

	const styles = stylesheet.createThemedStyleSheet({
		icon: {
			width: 18,
			height: 18,
			tintColor: (semanticColors as any).TEXT_BRAND ?? '#5865f2',
			marginRight: 4,
		},
		btn: {
			backgroundColor: '#5865f2',
			padding: 12,
			borderRadius: 8,
			alignItems: 'center',
			justifyContent: 'center',
			marginHorizontal: 16,
			marginVertical: 16,
		},
	})

	const isImportDisabled =
		!options.plugins &&
		!options.repos &&
		!options.settings &&
		!options.experiments &&
		!options.themes &&
		!options.fonts

	return (
		<ActionSheet title={lang.format('sheet.import_data.title', {})}>
			{!total && (
				<RN.View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'center',
						marginTop: 8,
					}}
				>
					<RN.Image
						source={getAssetIDByName('CircleInformationIcon-primary')}
						style={styles.icon}
						resizeMode="cover"
					/>
					<Text variant="text-md/semibold" color="TEXT_BRAND" align="center">
						{lang.format('sheet.import_data.already_synced', {})}
					</Text>
				</RN.View>
			)}
			{FormCheckboxRow ? (
				<>
					<FormCheckboxRow
						label={lang.format('sheet.import_data.repos', {
							count: String(has.repos),
						})}
						disabled={!has.repos}
						onPress={() =>
							has.repos &&
							setOptions({
								...options,
								repos: !options.repos,
							})
						}
						selected={options.repos}
					/>
					<FormCheckboxRow
						label={lang.format('sheet.import_data.plugins', {
							count: String(has.plugins),
						})}
						disabled={!has.plugins}
						onPress={() =>
							has.plugins &&
							setOptions({
								...options,
								plugins: !options.plugins,
							})
						}
						selected={options.plugins}
					/>
					<FormCheckboxRow
						label={lang.format('sheet.import_data.experiments', {
							count: String(has.experiments),
						})}
						disabled={!has.experiments}
						onPress={() =>
							has.experiments &&
							setOptions({
								...options,
								experiments: !options.experiments,
							})
						}
						selected={options.experiments}
					/>
					<FormCheckboxRow
						label={lang.format('sheet.import_data.settings', {
							count: String(has.settings),
						})}
						disabled={!has.settings}
						onPress={() =>
							has.settings &&
							setOptions({
								...options,
								settings: !options.settings,
							})
						}
						selected={options.settings}
					/>
					<FormCheckboxRow
						label={lang.format('sheet.import_data.themes', {
							count: String(has.themes),
						})}
						disabled={!has.themes}
						onPress={() =>
							has.themes &&
							setOptions({
								...options,
								themes: !options.themes,
							})
						}
						selected={options.themes}
					/>
					<FormCheckboxRow
						label={lang.format('sheet.import_data.fonts', {
							count: String(has.fonts),
						})}
						disabled={!has.fonts}
						onPress={() =>
							has.fonts &&
							setOptions({
								...options,
								fonts: !options.fonts,
							})
						}
						selected={options.fonts}
					/>
				</>
			) : (
				<RN.View style={{ padding: 16 }}>
					<Text color="TEXT_MUTED">
						Plugins: {has.plugins}, Repos: {has.repos}, Experiments: {has.experiments}, Settings: {has.settings}
					</Text>
				</RN.View>
			)}
			<RN.TouchableOpacity
				style={[styles.btn, isImportDisabled ? { opacity: 0.5 } : {}]}
				disabled={isImportDisabled}
				onPress={() => {
					openImportLogsPage(navigation)
					importData(data, options)
					hideActionSheet()
				}}
			>
				<Text style={{ color: '#fff', fontWeight: 'bold' }}>
					{lang.format('sheet.import_data.import', {})}
				</Text>
			</RN.TouchableOpacity>
		</ActionSheet>
	)
}
