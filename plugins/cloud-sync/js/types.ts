import { findByProps, findByStoreName } from './vendetta'
import { FluxDispatcher, ReactNative as RN } from './vendetta'
import { semanticColors } from './vendetta'

const getThemeStore = () =>
	(globalThis as any).revenge?.discord?.flux?.Stores?.ThemeStore ??
	findByStoreName('ThemeStore')

const getTriggerHaptic = () => findByProps('triggerHaptic')?.triggerHaptic

export const TextStyleSheet = new Proxy(
	{},
	{
		get: (_, p) => findByProps('TextStyleSheet')?.TextStyleSheet?.[p] ?? {},
	},
)

export const Navigator = new Proxy(
	{},
	{
		get: (_, p) => findByProps('Navigator')?.Navigator?.[p],
	},
)

export const modalCloseButton = (...args: any[]) => {
	const fn =
		(globalThis as any).revenge?.everest?.getModalCloseButton?.() ??
		findByProps('getHeaderCloseButton')?.getHeaderCloseButton
	return typeof fn === 'function' ? fn(...args) : null
}

export const popModal = (...args: any[]) => {
	const fn = findByProps('popModal', 'pushModal')?.popModal
	return typeof fn === 'function' ? fn(...args) : undefined
}

export const pushModal = (...args: any[]) => {
	const fn = findByProps('popModal', 'pushModal')?.pushModal
	return typeof fn === 'function' ? fn(...args) : undefined
}

export const useThemeContext = () => {
	const themeStore = getThemeStore()
	return { theme: themeStore?.theme ?? 'dark' }
}

export function resolveSemanticColor(
	color: any,
	theme?: string,
) {
	const currentTheme = theme ?? getThemeStore()?.theme ?? 'dark'
	if ((globalThis as any).revenge?.everest?.resolveColor) {
		try {
			const res = (globalThis as any).revenge.everest.resolveColor(color, currentTheme)
			if (res) return res
		} catch {}
	}
	const colorModule = findByProps('colors', 'unsafe_rawColors')
	const colorResolver = colorModule?.internal ?? colorModule?.meta
	return (
		(color && colorResolver?.resolveSemanticColor?.(currentTheme, color)) || '#000000'
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
		const triggerHaptic = getTriggerHaptic()
		if (typeof triggerHaptic === 'function') {
			triggerHaptic()
			const interval = setInterval(() => triggerHaptic(), 1)
			return new Promise(res =>
				setTimeout(() => res(clearInterval(interval)), dur),
			)
		}
	} catch {}
	return Promise.resolve()
}

export function fluxSubscribe(
	topic: string,
	callback: (data: any) => void,
	once?: boolean,
) {
	const g = globalThis as any

	// 1. Revenge's native onFluxEventDispatched
	if (typeof g.revenge?.discord?.flux?.onFluxEventDispatched === 'function') {
		const unsub = g.revenge.discord.flux.onFluxEventDispatched(topic, (data: any) => {
			callback(data)
			if (once) {
				try {
					unsub?.()
				} catch {}
			}
		})
		return typeof unsub === 'function' ? unsub : () => {}
	}

	// 2. FluxDispatcher from revenge or vendetta
	const dispatcher =
		g.revenge?.discord?.common?.flux?.Dispatcher ??
		g.revenge?.discord?.flux?.Dispatcher ??
		g.revenge?.discord?.flux?.Stores?.ExperimentStore?._dispatcher ??
		FluxDispatcher

	if (typeof dispatcher?.subscribe === 'function') {
		const cback = (data: any) => {
			callback(data)
			if (once) {
				try {
					dispatcher.unsubscribe?.(topic, cback)
				} catch {}
			}
		}
		try {
			dispatcher.subscribe(topic, cback)
			return () => {
				try {
					dispatcher.unsubscribe?.(topic, cback)
				} catch {}
			}
		} catch {}
	}

	return () => {}
}

export function formatBytes(bytes: number) {
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	if (bytes === 0) return '0 B'

	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`
}
