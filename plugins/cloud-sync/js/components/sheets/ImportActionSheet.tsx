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
		unproxiedPlugins: Object.keys(data?.plugins ?? {}).filter(
			id => !(plugins as any)[id] && !isPluginProxied(id) && canImport(id),
		).length,
		plugins: Object.keys(data?.plugins ?? {}).filter(
			id => !(plugins as any)[id] && isPluginProxied(id) && canImport(id),
		).length,
		themes: Object.keys(data?.themes ?? {}).filter(id => !(themes as any)[id])
			.length,
		fonts:
			Object.keys(data?.fonts?.installed ?? {}).filter(
				id => !hasFontBySource(id, fonts),
			).length +
			(data?.fonts?.custom ?? []).filter(
				({ name }: any) => !hasFontByName(name, fonts),
			).length,
	}
	const total = [has.unproxiedPlugins, has.plugins, has.themes].reduce(
		(x, a) => x + a,
		0,
	)
	const [options, setOptions] = React.useState<SyncImportOptions>(
		defOptions ?? {
			unproxiedPlugins: false,
			plugins: !!has.plugins,
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
		!options.unproxiedPlugins &&
		!options.plugins &&
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
						label={lang.format('sheet.import_data.unproxied_plugins', {
							count: String(has.unproxiedPlugins),
						})}
						disabled={!has.unproxiedPlugins}
						onPress={() => {
							if (!has.unproxiedPlugins) return
							if (!options.unproxiedPlugins && !defOptions) {
								showConfirmationAlert({
									title: lang.format('alert.unproxied_plugin_warn.title', {}),
									content: lang.format('alert.unproxied_plugin_warn.body', {}),
									isDismissable: true,
									confirmText: lang.format(
										'alert.unproxied_plugin_warn.confirm',
										{},
									),
									onConfirm: () => {
										ActionSheet.open(ImportActionSheet, {
											data,
											navigation,
											defOptions: {
												...options,
												unproxiedPlugins: true,
											},
										})
									},
								})
							} else {
								setOptions({
									...options,
									unproxiedPlugins: !options.unproxiedPlugins,
								})
							}
						}}
						selected={options.unproxiedPlugins}
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
						Plugins: {has.plugins}, Themes: {has.themes}, Fonts: {has.fonts}
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
