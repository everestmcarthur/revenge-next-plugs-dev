export interface RoseUtilsSettings {
	silentEdit: boolean
	silentEditAlways: boolean
	charCounter: boolean
	charCounterFormat: 'fraction' | 'count'
	charCounterCustomColor: string
	charCounterPosition: 'inside-right' | 'above-right'
	noTypingAnimation: boolean
	noTypingHideIncoming: boolean
	noTypingStopOutgoing: boolean
	anonymousFileNames: boolean
	anonymousFileLength: number
	validUser: boolean

	uwuify: boolean
	uwuifyConvertOutgoing: boolean
	piratifier: boolean
	piratifyConvertOutgoing: boolean
	gifRoulette: boolean
	urbanDictionary: boolean

	copyRoleColor: boolean
	roleColorEverywhere: boolean
	roleColorTyping: boolean
	roleColorMentions: boolean
	roleColorVoice: boolean
	roleColorChat: boolean
	customUserTags: boolean
	customUserTagsList: Record<string, { tag: string; color?: string; badge?: boolean }>
	serverInfo: boolean

	userNotif: boolean
	userNotifTrackFriends: boolean
	userNotifTrackedIds: string[]
	dislate: boolean
	dislateTargetLang: string

	rpcEnabled: boolean
	rpcAppName: string
	rpcAppId: string
	rpcDetails: string
	rpcState: string
	rpcLargeImage: string
	rpcLargeText: string
	rpcSmallImage: string
	rpcSmallText: string
	rpcIconUrl: string
	rpcButton1Label: string
	rpcButton1Url: string
	rpcButton2Label: string
	rpcButton2Url: string
	rpcShowElapsed: boolean
	rpcAutoStart: boolean

	translateIncomingEnabled: boolean
	translateIncomingTargetLang: string
	translateOutgoingEnabled: boolean
	translateOutgoingTargetLang: string
}

export const defaultSettings: RoseUtilsSettings = {
	silentEdit: true,
	silentEditAlways: false,
	charCounter: true,
	charCounterFormat: 'fraction',
	charCounterCustomColor: '',
	charCounterPosition: 'inside-right',
	noTypingAnimation: false,
	noTypingHideIncoming: true,
	noTypingStopOutgoing: true,
	anonymousFileNames: false,
	anonymousFileLength: 8,
	validUser: true,

	uwuify: false,
	uwuifyConvertOutgoing: false,
	piratifier: false,
	piratifyConvertOutgoing: false,
	gifRoulette: true,
	urbanDictionary: true,

	copyRoleColor: true,
	roleColorEverywhere: true,
	roleColorTyping: true,
	roleColorMentions: true,
	roleColorVoice: true,
	roleColorChat: true,
	customUserTags: true,
	customUserTagsList: {},
	serverInfo: true,

	userNotif: false,
	userNotifTrackFriends: true,
	userNotifTrackedIds: [],
	dislate: true,
	dislateTargetLang: 'en',

	rpcEnabled: false,
	rpcAppName: '',
	rpcAppId: '',
	rpcDetails: '',
	rpcState: '',
	rpcLargeImage: '',
	rpcLargeText: '',
	rpcSmallImage: '',
	rpcSmallText: '',
	rpcIconUrl: '',
	rpcButton1Label: '',
	rpcButton1Url: '',
	rpcButton2Label: '',
	rpcButton2Url: '',
	rpcShowElapsed: true,
	rpcAutoStart: false,

	translateIncomingEnabled: false,
	translateIncomingTargetLang: 'en',
	translateOutgoingEnabled: false,
	translateOutgoingTargetLang: 'en',
}
