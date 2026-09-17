let cachedTransitionRouter: any = null
let cachedUserProfileActions: any = null
let cachedNavigation: any = null

export function getTransitionRouter() {
	if (typeof cachedTransitionRouter?.transitionToGuild === 'function') {
		return cachedTransitionRouter
	}

	const everest = (globalThis as any).__everest ?? (revenge as any)?.everest
	if (typeof everest?.transitionToGuild === 'function') {
		cachedTransitionRouter = everest
		return everest
	}

	try {
		const { filters, lookupModule } = revenge.modules.finders
		const res = lookupModule(filters.withProps('transitionToGuild'))
		if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
			const mod = res[0]?.default ?? res[0]
			if (typeof mod?.transitionToGuild === 'function') {
				cachedTransitionRouter = mod
				return mod
			}
		}
	} catch {}

	return undefined
}

export function getUserProfileActions() {
	if (cachedUserProfileActions) return cachedUserProfileActions

	try {
		const { filters, lookupModule } = revenge.modules.finders
		const res = lookupModule(filters.withProps('openUserProfileModal'))
		if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
			cachedUserProfileActions = res[0]
			return res[0]
		}
	} catch {}

	try {
		const { filters, lookupModule } = revenge.modules.finders
		const res = lookupModule(filters.withProps('showUserProfile'))
		if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
			cachedUserProfileActions = res[0]
			return res[0]
		}
	} catch {}

	return undefined
}

export function getNavigation() {
	if (cachedNavigation) return cachedNavigation

	try {
		const { filters, lookupModule } = revenge.modules.finders
		const res = lookupModule(filters.withProps('push', 'pushLazy', 'pop'))
		if (res && res !== revenge.modules.finders.NotFoundResult && res[0]) {
			cachedNavigation = res[0]
			return res[0]
		}
	} catch {}

	return undefined
}

export function openUserProfile(userId: string) {
	try {
		const actions = getUserProfileActions()
		if (actions?.openUserProfileModal) {
			actions.openUserProfileModal({ userId })
			return
		}
		if (actions?.showUserProfile) {
			actions.showUserProfile({ userId })
			return
		}
		if (actions?.openUserProfile) {
			actions.openUserProfile({ userId })
			return
		}

		revenge.discord?.flux?.Dispatcher?.dispatch({
			type: 'USER_PROFILE_MODAL_OPEN',
			userId,
		})
	} catch (e) {
		console.error('[BetterInbox] Failed to open user profile:', e)
	}
}

export function navigateToChannel(guildId?: string, channelId?: string, messageId?: string) {
	try {
		const router = getTransitionRouter()
		if (router?.transitionToGuild && channelId) {
			router.transitionToGuild(guildId || '@me', channelId, messageId)
			return
		}
		if (router?.transitionToGuild && guildId) {
			router.transitionToGuild(guildId)
			return
		}
	} catch (e) {
		console.error('[BetterInbox] Navigation error:', e)
	}
}

export function navigateToGuild(guildId: string) {
	try {
		const router = getTransitionRouter()
		if (router?.transitionToGuild) {
			router.transitionToGuild(guildId)
			return
		}
	} catch (e) {
		console.error('[BetterInbox] Navigate to guild error:', e)
	}
}

export function copyToClipboard(text: string) {
	try {
		const { Clipboard } = revenge.react.ReactNative
		if (Clipboard?.setString) {
			Clipboard.setString(text)
			return
		}
		const { filters, lookupModule } = revenge.modules.finders
		const clip = lookupModule(filters.withProps('setString', 'getString'))?.[0]
		if (clip?.setString) {
			clip.setString(text)
			return
		}
	} catch (e) {
		console.error('[BetterInbox] Clipboard error:', e)
	}
}

export function showToast(message: string) {
	try {
		const { ToastAndroid } = revenge.react.ReactNative
		if (ToastAndroid?.show) {
			ToastAndroid.show(message, ToastAndroid.SHORT)
			return
		}
		const { filters, lookupModule } = revenge.modules.finders
		const toast = lookupModule(filters.withProps('showToast'))?.[0]
		if (toast?.showToast) {
			toast.showToast({ title: message })
			return
		}
	} catch {}
}

export function getAvatarUrl(author: any): string {
	if (!author) return 'https://cdn.discordapp.com/embed/avatars/0.png'
	const { id, avatar, discriminator } = author

	if (avatar) {
		const ext = typeof avatar === 'string' && avatar.startsWith('a_') ? 'gif' : 'png'
		return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=128`
	}

	try {
		const defaultIndex =
			discriminator && discriminator !== '0'
				? Number.parseInt(discriminator, 10) % 5
				: Number((BigInt(id || '0') >> 22n) % 6n)
		return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`
	} catch {
		return 'https://cdn.discordapp.com/embed/avatars/0.png'
	}
}
