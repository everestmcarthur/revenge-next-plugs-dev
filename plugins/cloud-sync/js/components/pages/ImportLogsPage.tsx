import { constants, React, ReactNative as RN, stylesheet } from '../../vendetta'
import { semanticColors } from '../../vendetta'
import type { ScrollView } from 'react-native'

import { lang } from '../../index'

export let isInPage = false

let logged: () => void
const logs: [string, string][] = []

export function clearLogs() {
	logs.length = 0
	logged?.()
}
export function addLog(scope: keyof typeof logScopes, message: string) {
	logs.push([scope, message])
	logged?.()
}

const logScopes = {
	plugins: '#70d6ff',
	themes: '#ff70a6',
	fonts: '#ff9770',
	importer: '#ffd670',
}

const styles = stylesheet.createThemedStyleSheet({
	text: {
		fontFamily:
			(constants as any)?.Fonts?.CODE_SEMIBOLD ||
			(constants as any)?.Fonts?.CODE_NORMAL ||
			'monospace',
		includeFontPadding: false,
		color: (semanticColors as any)?.TEXT_DEFAULT ?? '#ffffff',

		marginHorizontal: 12,
		marginTop: 24,
	},
})

export const ImportLogsPage = () => {
	const [_, forceUpdate] = React.useReducer(x => ~x, 0)
	logged = forceUpdate

	const scroller = React.useRef<ScrollView | null>(null)

	React.useEffect(() => {
		isInPage = true
		return () => {
			isInPage = false
		}
	}, [])

	return (
		<RN.ScrollView
			style={{ flex: 1 }}
			ref={scroller}
			onContentSizeChange={() => {
				scroller.current?.scrollToEnd({ animated: true })
			}}
		>
			<RN.Text style={styles.text}>
				{logs.map(([scope, message]) => [
					<RN.Text
						key={scope + message}
						style={[
							styles.text,
							{
								color: logScopes[scope],
							},
						]}
					>
						[{lang.format(`log.${scope as keyof typeof logScopes}`, {})}
						]:
					</RN.Text>,
					` ${message}\n`,
				])}
			</RN.Text>
		</RN.ScrollView>
	)
}

export function openImportLogsPage(navigation: any) {
	navigation.push('VendettaCustomPage', {
		render: ImportLogsPage,
		title: lang.format('page.import_logs', {}),
	})
}
