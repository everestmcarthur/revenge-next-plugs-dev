export const getFinders = () => {
	try {
		if (typeof revenge !== 'undefined' && revenge?.modules?.finders) {
			return revenge.modules.finders
		}
	} catch {}
	return (globalThis as any).revenge?.modules?.finders
}

export const getMod = (filter: any) => {
	const finders = getFinders()
	if (!finders?.lookupModule) return undefined
	const res = finders.lookupModule(filter) as any
	const m = Array.isArray(res) ? res[0] : res
	if (!m) return undefined
	return m.default || m
}

export const DISCORD_EPOCH = 1420070400000n

export const getSnowflakeDate = (id: string | bigint) => {
	try {
		const ms = Number((BigInt(id) >> 22n) + DISCORD_EPOCH)
		return Math.floor(ms / 1000)
	} catch {
		return null
	}
}

export const isEphemeralArg = (val: any) => {
	if (val === undefined || val === null || val === '') return false
	if (typeof val === 'string') {
		const s = val.toLowerCase().trim()
		return s === 'true' || s === 'yes' || s === '1'
	}
	if (typeof val === 'boolean') return val
	return false
}

export function parseOptionValues(rawOptions: any) {
	const args: Record<string, any> = {}
	if (!rawOptions) return args

	const extractVal = (item: any): any => {
		if (item === null || item === undefined) return undefined
		if (typeof item !== 'object') return item
		if (item.value !== undefined) return item.value
		if (item.text !== undefined) return item.text
		if (item.id !== undefined) return item.id
		if (item.userId !== undefined) return item.userId
		return item
	}

	if (Array.isArray(rawOptions)) {
		for (const opt of rawOptions) {
			if (!opt) continue
			const optName = opt.name || opt.displayName
			if (optName) {
				args[optName] = extractVal(opt)
			}
		}
	} else if (typeof rawOptions === 'object') {
		for (const [key, val] of Object.entries(rawOptions)) {
			if (Array.isArray(val)) {
				const first: any = val[0]
				const optName = first?.name || key
				args[optName] = extractVal(first)
				if (optName !== key) {
					args[key] = args[optName]
				}
			} else if (typeof val === 'object' && val !== null) {
				const optName = (val as any).name || key
				args[optName] = extractVal(val)
				if (optName !== key) {
					args[key] = args[optName]
				}
			} else {
				args[key] = val
			}
		}
	}
	return args
}

export const getUserStore = () => {
	const filters = getFinders()?.filters
	return getMod(filters?.withProps('getCurrentUser'))
}
export const getUserProfileStore = () => {
	const filters = getFinders()?.filters
	return getMod(filters?.withProps('getUserProfile'))
}
export const getGuildStore = () => {
	const filters = getFinders()?.filters
	return getMod(filters?.withProps('getGuild'))
}
export const getGuildMemberStore = () => {
	const filters = getFinders()?.filters
	return getMod(filters?.withProps('getMember'))
}
export const getGuildMemberCountStore = () => {
	const filters = getFinders()?.filters
	return getMod(filters?.withProps('getMemberCount'))
}
export const getChannelStore = () => {
	const filters = getFinders()?.filters
	return getMod(filters?.withProps('getChannel'))
}
export const getSelectedChannelStore = () => {
	const filters = getFinders()?.filters
	return getMod(filters?.withProps('getLastSelectedChannelId')) || getMod(filters?.withProps('getChannelId'))
}

export const getSelectedChannelIdSafe = () => {
	try {
		const s = getSelectedChannelStore()
		return s?.getLastSelectedChannelId?.() || s?.getChannelId?.() || null
	} catch {
		return null
	}
}

export const getMessageActions = () => {
	const filters = getFinders()?.filters
	const scopes = filters?.FilterScopes
	return (
		getMod(filters?.withProps('sendMessage', 'editMessage')) ||
		getFinders()?.lookupModule?.(filters?.withProps('receiveMessage', 'sendMessage'), scopes?.All || 1)?.[0] ||
		(revenge as any)?.everest?.getMessageActions?.()
	)
}

export const getBotMessageMod = () => {
	const filters = getFinders()?.filters
	const scopes = filters?.FilterScopes
	return (
		getMod(filters?.withProps('createBotMessage')) ||
		getFinders()?.lookupModule?.(filters?.withProps('createBotMessage'), scopes?.All || 1)?.[0] ||
		(revenge as any)?.everest?.getBotMessageMod?.()
	)
}

export const getDispatcher = () => {
	const filters = getFinders()?.filters
	const scopes = filters?.FilterScopes
	return (
		getMod(filters?.withProps('dispatch', 'subscribe')) ||
		getFinders()?.lookupModule?.(filters?.withProps('dispatch', 'subscribe'), scopes?.All || 1)?.[0] ||
		(revenge as any)?.everest?.getDispatcher?.()
	)
}

export const getApplicationStore = () => {
	try {
		const filters = getFinders()?.filters
		const scopes = filters?.FilterScopes
		const mods = getFinders()?.lookupModule?.(filters?.withProps('getApplication'), scopes?.All || 1)
		if (Array.isArray(mods)) {
			for (const mod of mods) {
				const exp = mod?.default || mod
				if (typeof exp?.getApplication === 'function') return exp
			}
		}
		return getMod(filters?.withProps('getApplication'))
	} catch {
		return null
	}
}

export const getIndexStore = () => {
	const filters = getFinders()?.filters
	return getMod(filters?.withProps('indices'))
}

export const getCurrentUserSafe = () => {
	try {
		const us = getUserStore()
		return (
			us?.getCurrentUser?.() || {
				id: '0',
				username: 'You',
				avatar: '858e9559e7ec01b194a2750ad12ab57e',
			}
		)
	} catch {
		return { id: '0', username: 'You', avatar: '858e9559e7ec01b194a2750ad12ab57e' }
	}
}

export const getUserSafe = (id: any) => {
	try {
		const us = getUserStore()
		return us?.getUser?.(id) || null
	} catch {
		return null
	}
}

export const getAvatarUrl = (user: any) => {
	if (!user) return 'https://cdn.discordapp.com/embed/avatars/0.png'
	if (user.avatar) {
		const ext = user.avatar.startsWith('a_') ? 'gif' : 'png'
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=1024`
	}
	const idx = (BigInt(user.id || 0) >> 22n) % 6n
	return `https://cdn.discordapp.com/embed/avatars/${idx}.png`
}

export const getBannerUrl = (user: any, profile: any) => {
	const banner = profile?.banner || user?.banner
	if (!banner) return null
	const ext = banner.startsWith('a_') ? 'gif' : 'png'
	return `https://cdn.discordapp.com/banners/${user.id}/${banner}.${ext}?size=1024`
}

export const getInitialsAvatar = (name: string) => {
	const parts = (name || '').trim().split(/\s+/)
	const initials = (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2) || 'CU').toUpperCase()
	return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=5865F2&color=fff&rounded=true`
}
