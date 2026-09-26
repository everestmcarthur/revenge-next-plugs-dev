import { React, ReactNative as RN } from '../vendetta'

import Text from './common/Text'
import { lang } from '../index'

export default function DataStat({
	subtitle,
	count,
}: {
	subtitle: string
	count: string | number
}) {
	return (
		<RN.View
			style={{
				alignItems: 'center',
				justifyContent: 'center',
				marginHorizontal: 16,
			}}
		>
			<Text variant="text-lg/bold" color="TEXT_DEFAULT" align="center">
				{count}
			</Text>
			<Text variant="text-md/medium" color="TEXT_MUTED" align="center">
				{lang.format(subtitle, {})}
			</Text>
		</RN.View>
	)
}
