import PluginList from './PluginList'
import {
	getLogs,
	clearLogs,
	isDebugLoggingEnabled,
	setDebugLoggingEnabled,
	onLog,
} from '../lib/log'

export default function Settings() {
	const { Page, FormSwitch, TableRowAssetIcon } = (revenge.components ?? {}) as any
	const { ScrollView, View } = revenge.react.ReactNative
	const { Stack, Text, Card, TableRowGroup, TableRow } =
		revenge.discord.design.Design as any

	const [debugEnabled, setDebugEnabled] = revenge.react.React.useState(() =>
		isDebugLoggingEnabled(),
	)
	const [showAllLogs, setShowAllLogs] = revenge.react.React.useState(false)
	const [copied, setCopied] = revenge.react.React.useState(false)
	const [, forceUpdate] = revenge.react.React.useReducer((x: number) => x + 1, 0)

	revenge.react.React.useEffect(() => {
		return onLog(() => {
			forceUpdate()
		})
	}, [])

	const logs = getLogs()

	const handleToggleDebug = (value: boolean) => {
		setDebugEnabled(value)
		setDebugLoggingEnabled(value)
	}

	const handleCopyLogs = () => {
		try {
			const formatted = logs
				.map(
					(l) =>
						`[${new Date(l.timestamp).toISOString()}] [${l.id}] [${l.level.toUpperCase()}] ${l.found ? 'SUCCESS' : 'FAILED'} - ${l.action}: ${l.target} (Attempt #${l.attempt ?? 1})${l.message ? `\n  Error: ${l.message}` : ''}`,
				)
				.join('\n')

			revenge.externals.ReactNativeClipboard?.setString?.(formatted)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (e) {
			console.error('[EverestLib] Failed to copy logs to clipboard:', e)
		}
	}

	return (
		<Page>
			<View style={{ flex: 1, position: 'relative' }}>
				<ScrollView contentContainerStyle={{ padding: 16 }}>
					<Stack spacing={16}>
						<Card>
							<View style={{ padding: 16 }}>
								<Text variant="heading-md/semibold">
									Everest Library
								</Text>
								<Text
									variant="text-sm/normal"
									color="text-muted"
									style={{ marginTop: 6 }}
								>
									Shared utility modules, Discord finders,
									navigators, and native helpers for Everest
									plugins on Revenge Next.
								</Text>
							</View>
						</Card>

						<PluginList />

						<TableRowGroup title="Logging & Diagnostics">
							<TableRow
								label="Debug Logging"
								subLabel="Mirror finder and store resolution logs to console, ADB logcat, and Logfox"
								trailing={
									FormSwitch ? (
										<FormSwitch
											value={debugEnabled}
											onValueChange={handleToggleDebug}
										/>
									) : undefined
								}
							/>
							<TableRow
								label="Copy All Logs"
								subLabel={
									copied
										? 'Copied to clipboard!'
										: `Export ${logs.length} log entries for bug reporting`
								}
								onPress={handleCopyLogs}
							/>
							<TableRow
								label="Clear In-Memory Logs"
								subLabel="Reset the visual log history"
								onPress={() => clearLogs()}
							/>
							<TableRow
								label={showAllLogs ? 'Hide Global Logs' : 'Show Global Logs'}
								subLabel={`${logs.length} actions captured`}
								onPress={() => setShowAllLogs(!showAllLogs)}
								arrow
							/>
						</TableRowGroup>

						{showAllLogs && logs.length > 0 && (
							<TableRowGroup title={`All Library Logs (${logs.length})`}>
								{logs.map((log, idx) => {
									const iconName =
										log.found !== false
											? 'CheckmarkLargeIcon'
											: 'CrossMediumIcon'

									return (
										<TableRow
											key={idx}
											icon={
												TableRowAssetIcon ? (
													<TableRowAssetIcon name={iconName} />
												) : undefined
											}
											label={`${log.id.split('.').pop() || log.id}: ${log.action}`}
											subLabel={log.target || log.message}
											trailing={
												Text ? (
													<Text
														variant="text-sm/normal"
														color="text-muted"
													>
														#{log.attempt ?? 1}
													</Text>
												) : undefined
											}
										/>
									)
								})}
							</TableRowGroup>
						)}
					</Stack>
				</ScrollView>
			</View>
		</Page>
	)
}
