import type { JsonStorage } from '@revenge-mod/json-storage'
import type { Account, MoreAltsStorage } from './types'
import { simpleHash } from './passwordUtils'

function getUserStore() {
	const everest = (globalThis as any).__everest ?? (revenge as any)?.everest
	if (typeof everest?.getUserStore === 'function') {
		return everest.getUserStore()
	}
	return (revenge.discord.flux.Stores as any)?.UserStore
}

function getMultiAccountStore() {
	return (revenge.discord.flux.Stores as any)?.MultiAccountStore
}

function getTokenManager() {
	try {
		const { filters, lookupModule } = revenge.modules.finders
		return lookupModule(filters.withProps('getToken'))?.[0]
	} catch {}
	return undefined
}

function getAuthActions() {
	try {
		const { filters, lookupModule } = revenge.modules.finders
		return lookupModule(filters.withProps('switchAccountToken'))?.[0]
	} catch {}
	return undefined
}

function getMultiAccountActions() {
	try {
		const { filters, lookupModule } = revenge.modules.finders
		return lookupModule(filters.withProps('switchAccount'))?.[0]
	} catch {}
	return undefined
}

export function getCurrentUser() {
	return getUserStore()?.getCurrentUser?.()
}

export function getCurrentToken(): string | undefined {
	return getTokenManager()?.getToken?.()
}

export function getAllAccounts(storage: JsonStorage<MoreAltsStorage>): Account[] {
	const current = storage.cache ?? {}
	const customAccounts = { ...(current.accounts ?? {}) }
	const customOrder = current.accountOrder ?? []

	const nativeStore = getMultiAccountStore()
	const nativeUsers: any[] = nativeStore?.getUsers?.() ?? []

	const combinedMap: Record<string, Account> = { ...customAccounts }
	const combinedOrder: string[] = [...customOrder]

	for (const u of nativeUsers) {
		if (u?.id) {
			if (!combinedMap[u.id]) {
				combinedMap[u.id] = {
					id: u.id,
					username: u.username,
					discriminator: u.discriminator || '0',
					avatar: u.avatar || null,
					displayName: u.globalName || u.username,
					token: u.pushSyncToken || u.id,
					addedAt: Date.now(),
					isNative: true,
				}
				if (!combinedOrder.includes(u.id)) {
					combinedOrder.push(u.id)
				}
			} else {
				combinedMap[u.id] = {
					...combinedMap[u.id],
					avatar: u.avatar || combinedMap[u.id].avatar,
					username: u.username || combinedMap[u.id].username,
					displayName: u.globalName || combinedMap[u.id].displayName,
					isNative: true,
				}
			}
		}
	}

	return combinedOrder
		.filter((id) => combinedMap[id])
		.map((id) => combinedMap[id])
}

export async function switchToAccount(tokenOrId: string, username?: string, isNative?: boolean): Promise<boolean> {
	if (isNative || !tokenOrId.includes('.')) {
		const multiActions = getMultiAccountActions()
		if (typeof multiActions?.switchAccount === 'function') {
			try {
				await multiActions.switchAccount(tokenOrId)
				return true
			} catch (e) {
				console.error('[MoreAlts] Native switchAccount error:', e)
			}
		}
	}

	const auth = getAuthActions()
	if (!auth?.switchAccountToken) {
		console.error('[MoreAlts] switchAccountToken action not found')
		return false
	}

	try {
		await auth.switchAccountToken(tokenOrId)
		return true
	} catch (e) {
		console.error('[MoreAlts] Switch account error:', e)
		return false
	}
}

export async function addCurrentAccount(
	storage: JsonStorage<MoreAltsStorage>,
): Promise<{ success: boolean; message: string }> {
	const user = getCurrentUser()
	const token = getCurrentToken()

	if (!user || !token) {
		return { success: false, message: 'Could not resolve current account or token' }
	}

	const current = storage.cache ?? {}
	const accounts = { ...(current.accounts ?? {}) }
	const order = [...(current.accountOrder ?? [])]

	if (accounts[user.id]) {
		return { success: false, message: `Account "${user.username}" is already saved` }
	}

	const newAccount: Account = {
		id: user.id,
		username: user.username,
		discriminator: user.discriminator || '0',
		avatar: user.avatar ?? null,
		displayName: user.globalName || user.username,
		token,
		addedAt: Date.now(),
	}

	accounts[user.id] = newAccount
	if (!order.includes(user.id)) order.push(user.id)

	await storage.set({ accounts, accountOrder: order })
	return { success: true, message: `Account "${user.username}" saved!` }
}

export async function addAccountWithToken(
	storage: JsonStorage<MoreAltsStorage>,
	rawToken: string,
): Promise<{ success: boolean; message: string }> {
	let token = rawToken.trim()
	if (!token) {
		const curr = getCurrentToken()
		if (curr) token = curr
	}

	if (!token) {
		return { success: false, message: 'Please provide a valid token' }
	}

	try {
		const response = await fetch('https://discord.com/api/v9/users/@me', {
			headers: { Authorization: token, 'Content-Type': 'application/json' },
		})

		if (!response.ok) {
			return { success: false, message: 'Invalid or expired token' }
		}

		const user = await response.json()
		const current = storage.cache ?? {}
		const accounts = { ...(current.accounts ?? {}) }
		const order = [...(current.accountOrder ?? [])]

		if (accounts[user.id]) {
			return { success: false, message: `Account "${user.username}" is already saved` }
		}

		const newAccount: Account = {
			id: user.id,
			username: user.username,
			discriminator: user.discriminator || '0',
			avatar: user.avatar ?? null,
			displayName: user.global_name || user.username,
			token,
			addedAt: Date.now(),
		}

		accounts[user.id] = newAccount
		if (!order.includes(user.id)) order.push(user.id)

		await storage.set({ accounts, accountOrder: order })
		return { success: true, message: `Account "${user.username}" added!` }
	} catch (e: any) {
		return { success: false, message: `Failed to add account: ${e?.message ?? e}` }
	}
}

export async function addAccountWithCredentials(
	storage: JsonStorage<MoreAltsStorage>,
	email: string,
	pass: string,
): Promise<{ success: boolean; message: string }> {
	const trimmedEmail = email.trim()
	const trimmedPass = pass.trim()

	if (!trimmedEmail || !trimmedPass) {
		return { success: false, message: 'Please enter both email and password' }
	}

	try {
		const response = await fetch('https://discord.com/api/v9/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				login: trimmedEmail,
				password: trimmedPass,
				undelete: false,
				login_source: null,
				gift_code_sku_id: null,
			}),
		})

		const loginData = await response.json()
		if (!response.ok || !loginData.token) {
			if (loginData.captcha_key || loginData.captcha_sitekey) {
				return {
					success: false,
					message: 'Captcha challenge required by Discord. Please use "Add Current Account" or token.',
				}
			}
			if (loginData.mfa || loginData.ticket) {
				return {
					success: false,
					message: '2FA/MFA is enabled on this account. Please use "Add Current Account" or token.',
				}
			}

			// Parse detailed field errors if present
			if (loginData.errors) {
				try {
					const fieldErrors: string[] = []
					for (const [field, val] of Object.entries(loginData.errors as Record<string, any>)) {
						const errList = val?._errors
						if (Array.isArray(errList)) {
							for (const err of errList) {
								if (err?.message) fieldErrors.push(`${field}: ${err.message}`)
							}
						}
					}
					if (fieldErrors.length > 0) {
						return { success: false, message: fieldErrors.join(' | ') }
					}
				} catch {}
			}

			return { success: false, message: loginData.message || 'Login failed - check credentials' }
		}

		return addAccountWithToken(storage, loginData.token)
	} catch (e: any) {
		return { success: false, message: `Login request failed: ${e?.message ?? e}` }
	}
}

export async function removeAccount(
	storage: JsonStorage<MoreAltsStorage>,
	accountId: string,
) {
	const current = storage.cache ?? {}
	const accounts = { ...(current.accounts ?? {}) }
	delete accounts[accountId]
	const order = (current.accountOrder ?? []).filter((id) => id !== accountId)
	await storage.set({ accounts, accountOrder: order })

	const multiActions = getMultiAccountActions()
	if (typeof multiActions?.removeAccount === 'function') {
		try {
			multiActions.removeAccount(accountId)
		} catch {}
	}
}

export async function forceLogout(): Promise<void> {
	const auth = getAuthActions()
	if (auth?.switchAccountToken) {
		const fakeToken = ['MTExMTExMTExMTExMTExMTEx', 'GxxxXx', 'xXxXxXxXxXxXxXxXxXxXxXxXxXxXx'].join('.')
		try {
			await auth.switchAccountToken(fakeToken)
		} catch {}
	}
}

export function exportAccountsJson(storage: JsonStorage<MoreAltsStorage>): string {
	const accounts = getAllAccounts(storage)

	const exportData = {
		accounts: accounts.map((a) => ({
			id: a.id,
			username: a.username,
			discriminator: a.discriminator,
			avatar: a.avatar,
			displayName: a.displayName,
			token: a.token,
			addedAt: a.addedAt,
		})),
		exportPasswordHash: storage.cache?.exportPasswordHash ?? null,
		exportedAt: Date.now(),
		version: '2.0',
	}

	return JSON.stringify(exportData, null, 2)
}

export async function importAccountsJson(
	storage: JsonStorage<MoreAltsStorage>,
	rawJson: string,
	password?: string,
): Promise<{ success: boolean; imported: number; skipped: number; message?: string }> {
	try {
		const data = JSON.parse(rawJson.trim())
		const accountsArray = Array.isArray(data.accounts) ? data.accounts : Array.isArray(data) ? data : null

		if (!accountsArray) {
			return { success: false, imported: 0, skipped: 0, message: 'Invalid import JSON structure' }
		}

		const current = storage.cache ?? {}
		if (data.exportPasswordHash) {
			const expectedHash = data.exportPasswordHash
			if (!password || simpleHash(password) !== expectedHash) {
				return { success: false, imported: 0, skipped: 0, message: 'Incorrect import password' }
			}
		}

		const existing = { ...(current.accounts ?? {}) }
		const order = [...(current.accountOrder ?? [])]
		let imported = 0
		let skipped = 0

		for (const acc of accountsArray) {
			if (acc.id && acc.token && acc.username) {
				if (!existing[acc.id]) {
					existing[acc.id] = {
						id: acc.id,
						username: acc.username,
						discriminator: acc.discriminator ?? '0',
						avatar: acc.avatar ?? null,
						displayName: acc.displayName ?? acc.username,
						token: acc.token,
						addedAt: acc.addedAt ?? Date.now(),
					}
					if (!order.includes(acc.id)) order.push(acc.id)
					imported++
				} else {
					skipped++
				}
			}
		}

		await storage.set({ accounts: existing, accountOrder: order })
		return { success: true, imported, skipped }
	} catch (e: any) {
		return { success: false, imported: 0, skipped: 0, message: e?.message ?? 'JSON parse error' }
	}
}
