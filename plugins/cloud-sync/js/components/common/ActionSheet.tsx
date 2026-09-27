import { findByProps } from '../../vendetta'
import { React, ReactNative as RN } from '../../vendetta'
import type { ImageSourcePropType, ViewProps } from 'react-native'

const getActionSheet = () =>
	(globalThis as any).revenge?.discord?.design?.Design?.ActionSheet ??
	findByProps('ActionSheet')?.ActionSheet ??
	RN.View

const getBottomSheetTitleHeader = () =>
	(globalThis as any).revenge?.discord?.design?.Design?.BottomSheetTitleHeader ??
	findByProps('BottomSheetTitleHeader')?.BottomSheetTitleHeader ??
	(({ title, trailing }: any) => (
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
	))

const getActionSheetCloseButton = () =>
	findByProps('ActionSheetCloseButton')?.ActionSheetCloseButton ??
	(({ onPress }: any) => (
		<RN.TouchableOpacity onPress={onPress}>
			<RN.Text style={{ color: '#fff' }}>✕</RN.Text>
		</RN.TouchableOpacity>
	))

const getActionSheetModule = () =>
	(globalThis as any).revenge?.everest?.getActionSheetActionCreators?.() ??
	findByProps('openLazy', 'hideActionSheet')

export const openLazy = (component: any, key: string, props?: object) => {
	if (typeof (globalThis as any).revenge?.everest?.openLazyActionSheet === 'function') {
		try {
			return (globalThis as any).revenge.everest.openLazyActionSheet(component, key, props)
		} catch {}
	}
	const mod = getActionSheetModule()
	if (typeof mod?.openLazy === 'function') {
		return mod.openLazy(component, key, props)
	}
}

export const hideActionSheet = () => {
	const mod = getActionSheetModule()
	if (typeof mod?.hideActionSheet === 'function') {
		return mod.hideActionSheet()
	}
}

export const LazyActionSheet = {
	openLazy,
	hideActionSheet,
}

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
	const SheetComp = getActionSheet()
	const HeaderComp = getBottomSheetTitleHeader()
	const CloseBtnComp = getActionSheetCloseButton()

	return (
		<SheetComp
			header={
				<HeaderComp
					title={title}
					trailing={
						<CloseBtnComp
							onPress={onClose ?? (() => hideActionSheet())}
						/>
					}
				/>
			}
		>
			<RN.View {...rest}>{children}</RN.View>
		</SheetComp>
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
