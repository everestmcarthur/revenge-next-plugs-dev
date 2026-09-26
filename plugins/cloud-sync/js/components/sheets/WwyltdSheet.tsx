import { ReactNative as RN } from '../../vendetta'
import { getAssetIDByName } from '../../vendetta'
import { showToast } from '../../vendetta'

import { ActionSheet, hideActionSheet } from '../common/ActionSheet'
import Text from '../common/Text'
import { lang } from '../../index'
import { saveData } from '../../stuff/api'
import type { UserData } from '../../stores/CacheStore'
import ImportActionSheet from './ImportActionSheet'
import TooMuchDataSheet from './TooMuchDataSheet'

export default function WwyltdSheet({
	backup,
	navigation,
}: {
	backup: UserData
	navigation: any
}) {
	return (
		<ActionSheet
			title={lang.format('sheet.wwyltd.title', {})}
			style={{ gap: 8, padding: 16 }}
		>
			<RN.TouchableOpacity
				style={{
					backgroundColor: '#2b2d31',
					padding: 14,
					borderRadius: 8,
					flexDirection: 'row',
					alignItems: 'center',
					marginBottom: 8,
				}}
				onPress={async () => {
					hideActionSheet()
					showToast(
						lang.format('toast.saving', {}),
						getAssetIDByName('UploadIcon'),
					)
					try {
						await saveData(backup)
					} catch (e: any) {
						if (
							e?.message?.toLowerCase().includes('request entity too large')
						) {
							ActionSheet.open(TooMuchDataSheet, { navigation })
						}
					}
				}}
			>
				<Text variant="text-md/semibold" color="TEXT_DEFAULT">
					{lang.format('sheet.wwyltd.actions.save_to_cloud', {})}
				</Text>
			</RN.TouchableOpacity>
			<RN.TouchableOpacity
				style={{
					backgroundColor: '#2b2d31',
					padding: 14,
					borderRadius: 8,
					flexDirection: 'row',
					alignItems: 'center',
				}}
				onPress={() =>
					ActionSheet.open(ImportActionSheet, {
						data: backup,
						navigation,
					})
				}
			>
				<Text variant="text-md/semibold" color="TEXT_DEFAULT">
					{lang.format('sheet.wwyltd.actions.import', {})}
				</Text>
			</RN.TouchableOpacity>
			<RN.View style={{ height: 16 }} />
		</ActionSheet>
	)
}
