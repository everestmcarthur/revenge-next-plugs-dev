export interface TokenPayload {
	userId: string
}

function base64UrlEncode(str: string): string {
	return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(str: string): string {
	let s = str.replace(/-/g, '+').replace(/_/g, '/')
	while (s.length % 4) s += '='
	return atob(s)
}

const getSecretKey = async (secret: string, usage: 'sign' | 'verify') => {
	const enc = new TextEncoder()
	return await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		[usage],
	)
}

export async function getUser(token?: string): Promise<TokenPayload | null> {
	if (!token) return null
	const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token
	try {
		const parts = cleanToken.split('.')
		if (parts.length !== 3) return null
		const [headerB64, payloadB64, sigB64] = parts
		const secret = process.env.JWT_SECRET || 'default_secret'
		const key = await getSecretKey(secret, 'verify')
		const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
		const rawSig = Uint8Array.from(base64UrlDecode(sigB64), c =>
			c.charCodeAt(0),
		)
		const valid = await crypto.subtle.verify('HMAC', key, rawSig, data)
		if (!valid) return null
		const payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload & {
			exp?: number
		}
		if (payload.exp && payload.exp < Date.now() / 1000) return null
		return { userId: payload.userId }
	} catch {
		return null
	}
}

export async function createToken(userId: string): Promise<string> {
	const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
	const now = Math.floor(Date.now() / 1000)
	const payload = base64UrlEncode(
		JSON.stringify({
			userId,
			iat: now,
			exp: now + 365 * 24 * 3600,
		}),
	)
	const data = `${header}.${payload}`
	const secret = process.env.JWT_SECRET || 'default_secret'
	const key = await getSecretKey(secret, 'sign')
	const sig = await crypto.subtle.sign(
		'HMAC',
		key,
		new TextEncoder().encode(data),
	)
	const sigB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)))
	return `${data}.${sigB64}`
}
