export type YouBarButtonId = 'dms' | 'notifications' | 'settings'
export type YouBarPosition = 'left' | 'middle' | 'right'

export interface YouBarPlusStorage {
	showDMButton: boolean
	showSettingsButton: boolean
	showNotificationsButton: boolean
	order: [YouBarButtonId, YouBarButtonId, YouBarButtonId]
}

export const DEFAULT_STORAGE: YouBarPlusStorage = {
	showDMButton: true,
	showSettingsButton: true,
	showNotificationsButton: true,
	order: ['dms', 'notifications', 'settings'],
}

export const POSITIONS: YouBarPosition[] = ['left', 'middle', 'right']

export function getButtonPosition(
	order: [YouBarButtonId, YouBarButtonId, YouBarButtonId] = DEFAULT_STORAGE.order,
	buttonId: YouBarButtonId,
): YouBarPosition {
	const validOrder = Array.isArray(order) && order.length === 3 ? order : DEFAULT_STORAGE.order
	const idx = validOrder.indexOf(buttonId)
	if (idx === 0) return 'left'
	if (idx === 1) return 'middle'
	return 'right'
}

export function setButtonPosition(
	order: [YouBarButtonId, YouBarButtonId, YouBarButtonId] = DEFAULT_STORAGE.order,
	buttonId: YouBarButtonId,
	targetPosition: YouBarPosition,
): [YouBarButtonId, YouBarButtonId, YouBarButtonId] {
	const validOrder = Array.isArray(order) && order.length === 3 ? order : DEFAULT_STORAGE.order
	const targetIdx = targetPosition === 'left' ? 0 : targetPosition === 'middle' ? 1 : 2
	const currentIdx = validOrder.indexOf(buttonId)
	if (currentIdx === -1 || currentIdx === targetIdx) return [...validOrder] as any

	const newOrder = [...validOrder] as [YouBarButtonId, YouBarButtonId, YouBarButtonId]
	const displaced = newOrder[targetIdx]
	newOrder[targetIdx] = buttonId
	newOrder[currentIdx] = displaced
	return newOrder
}

