import { getModule, getFilters, getDispatcher } from '../shared'
import type { RoseUtilsSettings } from '../types'

export function initNoTypingAnimation(settings: RoseUtilsSettings): () => void {
	if (!settings.noTypingAnimation) return () => {}

	const cleanups: (() => void)[] = []

	const TypingStore = getModule(getFilters().withProps('getTypingUsers'))
	if (TypingStore?.getTypingUsers) {
		const unpatch = revenge.patcher.instead(TypingStore, 'getTypingUsers', () => {
			return {}
		})
		cleanups.push(unpatch)
	}

	const TypingActions = getModule(getFilters().withProps('startTyping'))
	if (TypingActions?.startTyping) {
		const unpatchSend = revenge.patcher.instead(TypingActions, 'startTyping', () => {
			return Promise.resolve()
		})
		cleanups.push(unpatchSend)
	}

	const Dispatcher = getDispatcher()
	if (Dispatcher?.dispatch) {
		const unpatchDispatch = revenge.patcher.before(Dispatcher, 'dispatch', (args: any[]) => {
			const action = args?.[0]
			if (action?.type === 'TYPING_START' || action?.type === 'TYPING_STOP') {
				action.userId = ''
				action.channelId = ''
			}
			return args
		})
		cleanups.push(unpatchDispatch)
	}

	return () => {
		for (const fn of cleanups) fn()
	}
}
