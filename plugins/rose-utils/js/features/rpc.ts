import { RoseUtilsSettings } from '../types'
import { getClientUtils } from '../shared'
import { discordModules } from '../../../shared/discord-modules'

let activeGame: any = null
let lastActivity: any = null
let refreshTimer: any = null
let currentPid: number | null = null

export const RPC_PRESETS = [
	{ label: 'Minecraft', name: 'Minecraft', id: '356875570916753438' },
	{ label: 'Valorant', name: 'VALORANT', id: '700136079562375258' },
	{ label: 'GTA V', name: 'Grand Theft Auto V', id: '356876176465199104' },
	{ label: 'Fortnite', name: 'Fortnite', id: '432980957394370572' },
	{ label: 'Roblox', name: 'Roblox', id: '363445589247131668' },
	{ label: 'Genshin Impact', name: 'Genshin Impact', id: '762434991303950386' },
	{ label: 'League of Legends', name: 'League of Legends', id: '401518684763586560' },
	{ label: 'Apex Legends', name: 'Apex Legends', id: '544098364343959564' },
	{ label: 'CS2', name: 'Counter-Strike 2', id: '1158156325710045184' },
	{ label: 'Cyberpunk 2077', name: 'Cyberpunk 2077', id: '364313997048693760' },
	{ label: 'GTA 6', name: 'Grand Theft Auto VI', id: '', icon: 'https://upload.wikimedia.org/wikipedia/en/a/a5/Grand_Theft_Auto_VI_logo.png' },
	{ label: 'Spotify', name: 'Spotify', id: 'spotify:1' },
	{ label: 'Visual Studio Code', name: 'Visual Studio Code', id: '383226320970055681' },
]

function getGatewaySocket() {
	try {
		const r = (globalThis as any).__r
		const socketId = discordModules['modules/gateway/GatewayConnectionStore.tsx'] || 5489
		const raw = r?.(socketId)
		const store = raw?.default || raw
		return store?.getSocket?.() || null
	} catch {
		return null
	}
}

function getPresenceInfo() {
	try {
		const rawU = (globalThis as any).__r?.(1372)
		const userStore = rawU?.default || rawU
		const rawP = (globalThis as any).__r?.(4796)
		const presenceStore = rawP?.default || rawP
		const myId = userStore?.getCurrentUser?.()?.id
		return { myId, presenceStore }
	} catch {
		return { myId: null, presenceStore: null }
	}
}

function sendPresenceToGateway(rpcActivity: any | null): boolean {
	try {
		const socket = getGatewaySocket()
		if (!socket || !socket.isConnected?.()) {
			if (rpcActivity) {
				setTimeout(() => {
					sendPresenceToGateway(rpcActivity)
				}, 1500)
			}
			return false
		}
		const { myId, presenceStore } = getPresenceInfo()
		const currentActivities = (myId && presenceStore?.getActivities?.(myId)) || []
		const remainingActivities = currentActivities.filter((a: any) => a && a.type !== 0)
		const currentStatus = (myId && presenceStore?.getStatus?.(myId)) || 'online'
		const activities = rpcActivity ? [...remainingActivities, rpcActivity] : remainingActivities

		socket.send(3, {
			status: currentStatus === 'offline' ? 'online' : currentStatus,
			since: 0,
			activities: activities,
			afk: false,
		})
		return true
	} catch {
		return false
	}
}

function getDispatcher() {
	try {
		const raw = (globalThis as any).__r?.(573)
		return raw?.default || raw
	} catch {
		return null
	}
}

function getRunningGameStore() {
	try {
		const raw = (globalThis as any).__r?.(1999)
		return raw?.default || raw
	} catch {
		return null
	}
}

let origGetRunningGames: any = null
let origGetGameForPID: any = null

function patchRunningGameStore(game: any) {
	const store = getRunningGameStore()
	if (!store) return
	if (!origGetRunningGames) origGetRunningGames = store.getRunningGames
	if (!origGetGameForPID) origGetGameForPID = store.getGameForPID

	store.getRunningGames = function () {
		const orig = origGetRunningGames ? origGetRunningGames.apply(this, arguments) : []
		return [game, ...orig.filter((g: any) => g.pid !== game.pid)]
	}

	store.getGameForPID = function (pid: number) {
		if (pid === game.pid) return game
		return origGetGameForPID ? origGetGameForPID.apply(this, arguments) : null
	}
}

function unpatchRunningGameStore() {
	const store = getRunningGameStore()
	if (!store) return
	if (origGetRunningGames) {
		store.getRunningGames = origGetRunningGames
		origGetRunningGames = null
	}
	if (origGetGameForPID) {
		store.getGameForPID = origGetGameForPID
		origGetGameForPID = null
	}
}

function buildActivity(settings: RoseUtilsSettings, startTime: number): any {
	const name = settings.rpcAppName?.trim() || 'Game'
	const appId = settings.rpcAppId?.trim() || '0'

	const activity: any = {
		name: name,
		type: 0,
		created_at: startTime,
	}

	if (appId !== '0') {
		activity.application_id = appId
	}

	if (settings.rpcDetails?.trim()) activity.details = settings.rpcDetails.trim()
	if (settings.rpcState?.trim()) activity.state = settings.rpcState.trim()
	if (settings.rpcShowElapsed) activity.timestamps = { start: Math.floor(startTime / 1000) }

	const hasKeyedAssets = appId !== '0' && (settings.rpcLargeImage || settings.rpcSmallImage)
	const hasExternalIcon = settings.rpcIconUrl && settings.rpcIconUrl.startsWith('http')

	if (hasKeyedAssets || hasExternalIcon) {
		activity.assets = {}
		if (hasKeyedAssets) {
			if (settings.rpcLargeImage) activity.assets.large_image = settings.rpcLargeImage.trim()
			if (settings.rpcLargeText) activity.assets.large_text = settings.rpcLargeText.trim()
			if (settings.rpcSmallImage) activity.assets.small_image = settings.rpcSmallImage.trim()
			if (settings.rpcSmallText) activity.assets.small_text = settings.rpcSmallText.trim()
		} else if (hasExternalIcon) {
			activity.assets.large_image = 'mp:external/' + encodeURIComponent(settings.rpcIconUrl.trim())
			if (settings.rpcLargeText) activity.assets.large_text = settings.rpcLargeText.trim()
		}
	}

	const buttons: string[] = []
	const metadata: any = { button_urls: [] }
	if (settings.rpcButton1Label?.trim() && settings.rpcButton1Url?.trim()) {
		buttons.push(settings.rpcButton1Label.trim())
		metadata.button_urls.push(settings.rpcButton1Url.trim())
	}
	if (settings.rpcButton2Label?.trim() && settings.rpcButton2Url?.trim()) {
		buttons.push(settings.rpcButton2Label.trim())
		metadata.button_urls.push(settings.rpcButton2Url.trim())
	}
	if (buttons.length > 0) {
		activity.buttons = buttons
		activity.metadata = metadata
	}

	return activity
}

export async function startCustomPresence(settings: RoseUtilsSettings): Promise<boolean> {
	const name = settings.rpcAppName?.trim()
	if (!name) return false

	const appId = settings.rpcAppId?.trim() || '0'
	const pid = currentPid || Math.floor(Math.random() * 10000 + 2500) * 4
	currentPid = pid
	const startTime = activeGame?.start || Date.now()

	const safeName = name.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Game'
	const exe = safeName.replace(/\s+/g, '') + '.exe'

	const game = {
		id: appId,
		name: name,
		icon: null,
		pid: pid,
		pidPath: [pid],
		processName: name,
		start: startTime,
		exeName: exe,
		exePath: 'c:/program files/' + safeName.toLowerCase() + '/' + exe,
		cmdLine: 'C:\\Program Files\\' + safeName + '\\' + exe,
		executables: [{ os: 'win32', name: exe, is_launcher: false }],
		windowHandle: 0,
		fullscreenType: 0,
		overlay: true,
		sandboxed: false,
		hidden: false,
		isLauncher: false,
	}

	activeGame = game
	patchRunningGameStore(game)

	const dispatcher = getDispatcher()
	const runStore = getRunningGameStore()

	try {
		dispatcher?.dispatch?.({
			type: 'RUNNING_GAMES_CHANGE',
			added: [game],
			removed: [],
			games: runStore?.getRunningGames?.() || [game],
		})
	} catch {}

	const activity = buildActivity(settings, startTime)
	lastActivity = activity
	sendPresenceToGateway(activity)

	try {
		dispatcher?.dispatch?.({
			type: 'LOCAL_ACTIVITY_UPDATE',
			socketId: null,
			pid: pid,
			activity: activity,
		})
	} catch {}

	if (!refreshTimer) {
		refreshTimer = setInterval(() => {
			if (!activeGame || !lastActivity) return
			sendPresenceToGateway(lastActivity)
			try {
				dispatcher?.dispatch?.({
					type: 'LOCAL_ACTIVITY_UPDATE',
					socketId: null,
					pid: currentPid || 0,
					activity: lastActivity,
				})
			} catch {}
		}, 30000)
	}

	return true
}

export function stopCustomPresence(): boolean {
	if (refreshTimer) {
		clearInterval(refreshTimer)
		refreshTimer = null
	}
	lastActivity = null
	sendPresenceToGateway(null)
	const dispatcher = getDispatcher()
	const lastPid = currentPid || 9999
	try {
		dispatcher?.dispatch?.({
			type: 'LOCAL_ACTIVITY_UPDATE',
			socketId: null,
			pid: lastPid,
			activity: null,
		})
	} catch {}

	if (activeGame) {
		const removed = [activeGame]
		activeGame = null
		unpatchRunningGameStore()
		try {
			dispatcher?.dispatch?.({
				type: 'RUNNING_GAMES_CHANGE',
				added: [],
				removed: removed,
				games: [],
			})
		} catch {}
	} else {
		unpatchRunningGameStore()
	}

	currentPid = null
	return true
}

export function getCustomPresenceStatus() {
	return {
		active: !!activeGame,
		game: activeGame,
	}
}

export function initRpc(settings: RoseUtilsSettings): () => void {
	const cleanups: (() => void)[] = []
	const clientUtils = getClientUtils()

	if (clientUtils?.registerCommand) {
		clientUtils.registerCommand(
			{
				name: 'rpc',
				displayName: 'rpc',
				description: 'Control or check your custom Rich Presence status',
				options: [
					{
						type: 3,
						name: 'action',
						displayName: 'action',
						description: 'Action to perform (start, stop, status)',
						required: false,
						choices: [
							{ name: 'start', displayName: 'Start', value: 'start' },
							{ name: 'stop', displayName: 'Stop', value: 'stop' },
							{ name: 'status', displayName: 'Status', value: 'status' },
						],
					},
					{
						type: 3,
						name: 'ephemeral',
						displayName: 'ephemeral',
						description: 'Show response only to you (optional)',
						required: false,
						choices: [{ name: 'True', displayName: 'True', value: 'true' }],
					},
				],
				execute: async (args: any, ctx: any) => {
					const isEphemeral = args.ephemeral === 'true' || args.ephemeral === true || args.ephemeral === 'True'
					const action = args.action || 'status'

					if (action === 'start') {
						const started = await startCustomPresence(settings)
						ctx.reply({
							ephemeral: isEphemeral,
							content: started
								? `Rich Presence started for **${settings.rpcAppName || 'Game'}**`
								: 'Failed to start Rich Presence. Make sure an App Name is set in settings.',
						})
					} else if (action === 'stop') {
						stopCustomPresence()
						ctx.reply({
							ephemeral: isEphemeral,
							content: 'Custom Rich Presence stopped.',
						})
					} else {
						const status = getCustomPresenceStatus()
						ctx.reply({
							ephemeral: isEphemeral,
							content: status.active
								? `Rich Presence is currently active: **${status.game?.name}**`
								: 'Custom Rich Presence is currently inactive.',
						})
					}
				},
			},
			{
				id: 'dev.everestmcarthur.rose-utils',
				name: 'Rose Utils',
				description: 'Rose Utils commands',
			}
		)
		cleanups.push(() => {
			clientUtils.unregisterCommand('rpc')
		})
	}

	const dispatcher = getDispatcher()
	if (dispatcher?.subscribe) {
		const onConnOpen = () => {
			if (activeGame && lastActivity) {
				sendPresenceToGateway(lastActivity)
			}
		}
		dispatcher.subscribe('CONNECTION_OPEN', onConnOpen)
		cleanups.push(() => {
			dispatcher.unsubscribe?.('CONNECTION_OPEN', onConnOpen)
		})
	}

	if (settings.rpcEnabled && !activeGame && settings.rpcAppName?.trim()) {
		startCustomPresence(settings)
	} else if (!settings.rpcEnabled && activeGame) {
		stopCustomPresence()
	} else if (settings.rpcEnabled && activeGame) {
		startCustomPresence(settings)
	}

	return () => {
		for (const fn of cleanups) fn()
	}
}
