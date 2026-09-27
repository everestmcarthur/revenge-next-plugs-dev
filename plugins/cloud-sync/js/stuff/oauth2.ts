import { findByName, findByProps, findByStoreName } from '../vendetta'
import { getAssetIDByName } from '../vendetta'
import { showToast } from '../vendetta'

import { lang } from '../index'
import constants from '../constants'
import { useAuthorizationStore } from '../stores/AuthorizationStore'
import { authFetch, getData, loginWithUserId } from './api'

const getUserStore = () =>
	(globalThis as any).revenge?.discord?.flux?.Stores?.UserStore ??
	findByStoreName('UserStore')

const getModal = () => ({
	pushModal: findByProps('pushModal', 'popModal')?.pushModal ?? (() => {}),
	popModal: findByProps('pushModal', 'popModal')?.popModal ?? (() => {}),
})

const getOAuth2AuthorizeModal = () => findByName('OAuth2AuthorizeModal')

export async function authorizeUser() {
	const currentUser = getUserStore()?.getCurrentUser?.()
	if (!constants.oauth2.clientId) {
		// 1-click direct authorization using the current user ID
		if (currentUser?.id) {
			try {
				await loginWithUserId(currentUser.id)
				showToast(
					lang.format('toast.oauth.authorized', {}),
					getAssetIDByName('CircleCheckIcon-primary'),
				)
				return
			} catch (e: any) {
				showToast(
					`Authorization failed: ${e?.message || e}`,
					getAssetIDByName('CircleXIcon-primary'),
				)
				return
			}
		}
	}

	if (!OAuth2AuthorizeModal) {
		if (currentUser?.id) {
			await loginWithUserId(currentUser.id)
			showToast(
				lang.format('toast.oauth.authorized', {}),
				getAssetIDByName('CircleCheckIcon-primary'),
			)
		}
		return
	}

	openOauth2Modal()
}

export function openOauth2Modal() {
	const { pushModal, popModal } = getModal()
	pushModal({
		key: 'oauth2-authorize',
		modal: {
			key: 'oauth2-authorize',
			modal: getOAuth2AuthorizeModal(),
			animation: 'slide-up',

			shouldPersistUnderModals: false,
			props: {
				clientId: constants.oauth2.clientId,
				redirectUri: constants.oauth2.redirectURL,

				scopes: ['identify'],
				responseType: 'code',
				permissions: 0n,
				cancelCompletesFlow: false,
				callback: async ({ location }: { location?: string }) => {
					if (!location) return
					try {
						const res = await authFetch(location)
						const token = await res?.text()
						if (token) {
							useAuthorizationStore.getState().setToken(token)
							getData()

							showToast(
								lang.format('toast.oauth.authorized', {}),
								getAssetIDByName('CircleCheckIcon-primary'),
							)
						}
					} catch {
						// handled in authFetch
					}
				},
				dismissOAuthModal: () => popModal('oauth2-authorize'),
			},
			closable: true,
		},
	})
}
