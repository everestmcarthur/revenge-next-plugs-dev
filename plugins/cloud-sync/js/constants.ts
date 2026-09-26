import { vstorage } from './index'
import { redirectRoute } from './stuff/api'

export const defaultHost = 'https://cloud.allyapp.cc/'
export const fallbackHost = 'https://cloudsync.allyapp.workers.dev/'
export const defaultClientId = '1538636934568607744'

const api = () => {
	const host = vstorage?.custom?.host || defaultHost
	return !host.endsWith('/') ? `${host}/` : host
}

export default {
	get api() {
		return api()
	},
	oauth2: {
		get clientId() {
			return vstorage?.custom?.clientId || defaultClientId
		},
		get redirectURL() {
			return `${api()}${redirectRoute}`
		},
	},
}
