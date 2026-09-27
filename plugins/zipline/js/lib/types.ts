export interface ZiplineStorage {
	token?: string
	host?: string
	directHost?: string
	autoUpload: boolean
	autoShorten: boolean
	chunkUpload?: boolean
	chunkSizeMb?: number
}

export const DEFAULT_STORAGE: ZiplineStorage = {
	token: '',
	host: 'i.allyapp.cc',
	directHost: 'direct-i.allyapp.cc',
	autoUpload: true,
	autoShorten: true,
	chunkUpload: true,
	chunkSizeMb: 50,
}
