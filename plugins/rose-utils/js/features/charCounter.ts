import { getReact, getReactNative, getModule, getFilters } from '../shared'
import { discordModules } from '../../../shared/discord-modules'
import type { RoseUtilsSettings } from '../types'

export function initCharCounter(settings: RoseUtilsSettings): () => void {
	if (!settings.charCounter) return () => {}

	const cleanups: (() => void)[] = []
	const React = getReact()
	const RN = getReactNative()
	if (!React || !RN) return () => {}

	const ChannelStore = (revenge as any).everest?.getSelectedChannelStore?.() || getModule(getFilters().withProps('getChannelId', 'getLastSelectedChannelId'))
	const rawDraft = getModule(getFilters().withProps('getDraft'))
	const DraftStore = Array.isArray(rawDraft) ? rawDraft[0] : (rawDraft?.default || rawDraft)
	const UserStore = (revenge as any).everest?.getUserStore?.() || getModule(getFilters().withProps('getCurrentUser'))

	try {
		const r = (globalThis as any).__r
		const containerId = discordModules['modules/chat_input/native/FloatingChatInputContainer.tsx']
		const containerMod = r?.(containerId)
		if (!containerMod || typeof containerMod.default !== 'function') return () => {}

		const CharCounterPill = () => {
			const [count, setCount] = React.useState(0)

			React.useEffect(() => {
				const update = () => {
					try {
						const cid = ChannelStore?.getChannelId?.()
						const draft = cid && DraftStore?.getDraft ? DraftStore.getDraft(cid, 0) || '' : ''
						setCount(draft.length)
					} catch {}
				}
				update()
				if (DraftStore?.addChangeListener) DraftStore.addChangeListener(update)
				if (ChannelStore?.addChangeListener) ChannelStore.addChangeListener(update)
				const timer = setInterval(update, 200)
				return () => {
					if (DraftStore?.removeChangeListener) DraftStore.removeChangeListener(update)
					if (ChannelStore?.removeChangeListener) ChannelStore.removeChangeListener(update)
					clearInterval(timer)
				}
			}, [])

			if (count === 0) return null

			const user = UserStore?.getCurrentUser?.()
			const limit = user?.premiumType === 2 ? 4000 : 2000
			const remaining = limit - count

			let textColor = settings.charCounterCustomColor || ''
			if (!textColor) {
				textColor = remaining < 0 ? '#ed4245' : remaining < 100 ? '#faa81a' : '#8e9297'
			}

			const label = settings.charCounterFormat === 'count' ? `${count}` : `${count}/${limit}`

			const isAbove = settings.charCounterPosition === 'above-right'
			const positionStyle = isAbove
				? {
						right: 12,
						top: -24,
				  }
				: {
						right: 88,
						bottom: 12,
				  }

			const ViewComp = RN.View || 'View'
			const TextComp = RN.Text || 'Text'

			return React.createElement(
				ViewComp,
				{
					pointerEvents: 'none',
					style: {
						position: 'absolute',
						backgroundColor: 'rgba(0,0,0,0.65)',
						paddingHorizontal: 5,
						paddingVertical: 1,
						borderRadius: 6,
						zIndex: 99999,
						elevation: 10,
						...positionStyle,
					},
				},
				React.createElement(
					TextComp,
					{
						style: {
							color: textColor,
							fontSize: 10,
							fontWeight: '600',
						},
					},
					label
				)
			)
		}

		const unpatch = revenge.patcher.instead(containerMod, 'default', (args: any[], Original: any) => {
			const res = Original(...args)
			try {
				if (!res?.props) return res
				const pill = React.createElement(CharCounterPill)
				return React.cloneElement(res, null, res.props.children, pill)
			} catch {}
			return res
		})
		cleanups.push(unpatch)
	} catch {}

	return () => {
		for (const fn of cleanups) fn()
	}
}
