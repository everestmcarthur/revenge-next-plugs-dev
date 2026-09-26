import { findByProps, findByStoreName } from './vendetta'
import { FluxDispatcher, ReactNative as RN } from './vendetta'
import { semanticColors } from './vendetta'

const ThemeStore = findByStoreName('ThemeStore')
const { triggerHaptic } = findByProps('triggerHaptic') ?? {
	triggerHaptic: () => {},
}

const colorModule = findByProps('colors', 'unsafe_rawColors')
const colorResolver = colorModule?.internal ?? colorModule?.meta

export const TextStyleSheet = (findByProps('TextStyleSheet')?.TextStyleSheet ??
	{}) as Record<string, any>
export const Navigator = findByProps('Navigator')?.Navigator
export const modalCloseButton = findByProps(
	'getHeaderCloseButton',
)?.getHeaderCloseButton
export const { popModal, pushModal } = findByProps('popModal', 'pushModal') ?? {
	popModal: () => {},
	pushModal: () => {},
}

export const { useThemeContext } = findByProps('useThemeContext') ?? {
	useThemeContext: () => ({ theme: ThemeStore?.theme ?? 'dark' }),
}

export function resolveSemanticColor(
	color: any,
	theme: string = ThemeStore?.theme ?? 'dark',
) {
	return (
		(color && colorResolver?.resolveSemanticColor?.(theme, color)) || '#000000'
	)
}

export function getUserAvatar(
	user: {
		discriminator: string
		avatar?: string
		id: string
	},
	animated?: boolean,
): string {
	const isPomelo = user.discriminator === '0'

	return user.avatar
		? `https://cdn.discordapp.com/avatars/${user.id}/${
				animated && user.avatar.startsWith('a_')
					? `${user.avatar}.gif`
					: `${user.avatar}.png`
			}`
		: `https://cdn.discordapp.com/embed/avatars/${
				isPomelo
					? (Number.parseInt(user.id) >> 22) % 6
					: Number.parseInt(user.discriminator) % 5
			}`
}

export function openModal(key: string, modal: any) {
	pushModal({
		key,
		modal: {
			key,
			modal,
			animation: 'slide-up',
			shouldPersistUnderModals: false,
			closable: true,
		},
	})
}

export function doHaptic(dur: number): Promise<void> {
	try {
		triggerHaptic?.()
		const interval = setInterval(() => triggerHaptic?.(), 1)
		return new Promise(res =>
			setTimeout(() => res(clearInterval(interval)), dur),
		)
	} catch {
		return Promise.resolve()
	}
}

export function fluxSubscribe(
	topic: string,
	callback: (data: any) => void,
	once?: boolean,
) {
	const cback = (data: any) => {
		callback(data)
		if (once) FluxDispatcher.unsubscribe(topic, cback)
	}
	FluxDispatcher.subscribe(topic, cback)
	return () => FluxDispatcher.unsubscribe(topic, cback)
}

export function formatBytes(bytes: number) {
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	if (bytes === 0) return '0 B'

	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`
}
