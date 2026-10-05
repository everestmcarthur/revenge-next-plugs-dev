import * as Actions from './actions'
import * as Avatar from './avatar'
import * as Filters from './filters'
import * as Finders from './finders'
import * as Guild from './guild'
import * as Http from './http'
import * as Icons from './icons'
import * as Log from './log'
import * as Modules from './modules'
import * as Navigation from './navigation'
import * as Patcher from './patcher'
import * as Registry from './registry'
import * as Sheets from './sheets'
import * as Stores from './stores'
import * as Toast from './toast'
import * as Tokens from './tokens'

export const EverestLib = {
	...Modules,
	...Filters,
	...Patcher,
	...Finders,
	...Stores,
	...Navigation,
	...Actions,
	...Http,
	...Avatar,
	...Icons,
	...Sheets,
	...Guild,
	...Registry,
	...Log,
	...Toast,
	...Tokens,
}

export type EverestLibApi = typeof EverestLib
