import { compressData, decompressData, latestDataVersion } from './conversion'
import { migrateUserData, RawSQLUserData } from './migration'

export interface UserData {
	plugins: Record<string, { enabled: boolean; storage?: string }>
	themes: Record<string, { enabled: boolean }>
	fonts: {
		installed: Record<string, { enabled: boolean }>
		custom: Array<Record<string, any>>
	}
}

export const validateUserData = (data: any): boolean => {
	if (!data || typeof data !== 'object') return false
	if (typeof data.plugins !== 'object' || typeof data.themes !== 'object')
		return false
	return true
}

export type ApiUserData = {
	data: UserData
	at: string
}

let env: Env
export function assignEnv(_env: Env) {
	env = _env
}

export function sql(query: string, params: string[]) {
	return env.DB.prepare(query).bind(...params)
}

export async function saveUserData(
	userId: string,
	data: string | UserData,
	at: string,
) {
	return await sql(
		'insert or replace into data (user, version, sync, at) values (?, ?, ?, ?)',
		[
			userId,
			String(latestDataVersion),
			typeof data === 'string' ? data : await compressData(data),
			at,
		],
	).run()
}

export async function deleteUserData(userId: string) {
	return await sql('delete from data where user = ?', [userId]).run()
}

export async function getUserData(userId: string): Promise<ApiUserData> {
	const data = await retrieveUserData(userId)
	if (!data) {
		return {
			data: { plugins: {}, themes: {}, fonts: { installed: {}, custom: [] } },
			at: new Date().toISOString(),
		}
	}

	const decomp = await decompressData(data.data)
	return {
		data: decomp,
		at: data.at,
	}
}

export async function retrieveUserData(
	userId: string,
): Promise<{ data: string; at: string } | null> {
	const data = await sql('select * from data where user = ?', [
		userId,
	]).first<RawSQLUserData>()
	if (!data) return null

	return await migrateUserData(data, saveUserData)
}
