import { findByProps } from '../../vendetta'
import { React, ReactNative as RN } from '../../vendetta'
import type { ImageSourcePropType, ViewProps } from 'react-native'

const _ActionSheet = findByProps('ActionSheet')?.ActionSheet ?? RN.View
const { BottomSheetTitleHeader } = findByProps('BottomSheetTitleHeader') ?? {
	BottomSheetTitleHeader: ({ title, trailing }: any) => (
		<RN.View
			style={{
				flexDirection: 'row',
				justifyContent: 'space-between',
				padding: 16,
			}}
		>
			<RN.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
				{title}
			</RN.Text>
			{trailing}
		</RN.View>
	),
}
const { ActionSheetCloseButton } = findByProps('ActionSheetCloseButton') ?? {
	ActionSheetCloseButton: ({ onPress }: any) => (
		<RN.TouchableOpacity onPress={onPress}>
			<RN.Text style={{ color: '#fff' }}>✕</RN.Text>
		</RN.TouchableOpacity>
	),
}

export const LazyActionSheet = (findByProps('openLazy', 'hideActionSheet') ?? {
	openLazy: () => {},
	hideActionSheet: () => {},
}) as {
	openLazy: (component: Promise<any>, key: string, props?: object) => void
	hideActionSheet: () => void
}
export const { openLazy, hideActionSheet } = LazyActionSheet

export const { showSimpleActionSheet } = (findByProps(
	'showSimpleActionSheet',
) ?? {
	showSimpleActionSheet: () => {},
}) as {
	showSimpleActionSheet: (props: {
		key: 'CardOverflow'
		header: {
			title: string
			subtitle?: string
			icon?: React.ReactNode
			onClose?: () => void
		}
		options: {
			label: string
			icon?: ImageSourcePropType
			isDestructive?: boolean
			onPress?: () => void
		}[]
	}) => void
}

type ActionSheetProps = React.PropsWithChildren<
	ViewProps & {
		title: string
		onClose?: () => void
	}
>

export const ActionSheet = ((props: ActionSheetProps) => {
	const { title, onClose, children, ...rest } = props
	return (
		<_ActionSheet
			header={
				<BottomSheetTitleHeader
					title={title}
					trailing={
						<ActionSheetCloseButton
							onPress={onClose ?? (() => hideActionSheet())}
						/>
					}
				/>
			}
		>
			<RN.View {...rest}>{children}</RN.View>
		</_ActionSheet>
	)
}) as {
	(props: ActionSheetProps): JSX.Element
	open: <Sheet extends React.FunctionComponent<any>>(
		sheet: Sheet,
		props: Parameters<Sheet>[0],
	) => void
}

ActionSheet.open = (sheet, props) => {
	openLazy(
		Promise.resolve({
			default: sheet,
		}) as any,
		'ActionSheet',
		props,
	)
}
