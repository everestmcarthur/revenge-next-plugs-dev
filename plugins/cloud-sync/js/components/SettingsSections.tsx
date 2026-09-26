import { React, ReactNative as RN, url } from '../vendetta'
import { Forms } from '../vendetta'
import { showToast } from '../vendetta'
import { showConfirmationAlert } from '../vendetta'
import { getAssetIDByName } from '../vendetta'

import { ActionSheet } from './common/ActionSheet'
import { BetterTableRowGroup } from './common/BetterTableRow'
import Text from './common/Text'
import { lang, vstorage } from '../index'
import { useAuthorizationStore } from '../stores/AuthorizationStore'
import { useCacheStore } from '../stores/CacheStore'
import {
	decompressRawData,
	deleteData,
	getRawData,
	type RawData,
	rawDataURL,
	saveData,
} from '../stuff/api'
import { canSaveFileNatively, pickFile, saveFile } from '../stuff/files'
import { openOauth2Modal } from '../stuff/oauth2'
import { grabEverything, setImportCallback } from '../stuff/syncStuff'
import type { UserData } from '../types'
import ImportActionSheet from './sheets/ImportActionSheet'
import TooMuchDataSheet from './sheets/TooMuchDataSheet'
import WwyltdSheet from './sheets/WwyltdSheet'

const { FormRow } = Forms

interface SectionProps {
	navigation: any
	isBusy: string[]
	setBusy: (id: string) => void
	unBusy: (id: string) => void
}

export function AuthorizationSection({
	isBusy,
	setBusy,
	unBusy,
}: SectionProps) {
	const { isAuthorized } = useAuthorizationStore()

	return (
		<BetterTableRowGroup
			title={lang.format('settings.auth.title', {})}
			icon={getAssetIDByName('LockIcon')}
		>
			{isAuthorized() ? (
				<>
					<FormRow
						label={lang.format('settings.auth.log_out.title', {})}
						subLabel={lang.format('settings.auth.log_out.description', {})}
						leading={<FormRow.Icon source={getAssetIDByName('DoorExitIcon')} />}
						destructive
						onPress={() =>
							!isBusy.length &&
							showConfirmationAlert({
								title: lang.format('alert.log_out.title', {}),
								content: lang.format('alert.log_out.body', {}),
								onConfirm: () => {
									useCacheStore.getState().updateData()
									useAuthorizationStore.getState().setToken(undefined)
									vstorage.realTrackingAnalyticsSentToChina.tooMuchData = false

									showToast(
										lang.format('toast.logout', {}),
										getAssetIDByName('DoorExitIcon'),
									)
								},
							})
						}
					/>
					<FormRow
						label={lang.format('settings.auth.delete_data.title', {})}
						subLabel={lang.format('settings.auth.delete_data.description', {})}
						leading={
							isBusy.includes('delete_data') ? (
								<RN.ActivityIndicator size="small" />
							) : (
								<FormRow.Icon source={getAssetIDByName('TrashIcon')} />
							)
						}
						onPress={() =>
							!isBusy.length &&
							showConfirmationAlert({
								title: lang.format('alert.delete_data.title', {}),
								content: lang.format('alert.delete_data.body', {}),
								confirmText: lang.format('alert.delete_data.confirm', {}),
								confirmColor: 'red' as any,
								onConfirm: async () => {
									setBusy('delete_data')
									await deleteData()
									useAuthorizationStore.getState().setToken(undefined)

									unBusy('delete_data')
									showToast(
										lang.format('toast.deleted_data', {}),
										getAssetIDByName('TrashIcon'),
									)
								},
							})
						}
					/>
				</>
			) : (
				<FormRow
					label={lang.format('settings.auth.authorize', {})}
					leading={<FormRow.Icon source={getAssetIDByName('LinkIcon')} />}
					trailing={FormRow.Arrow}
					onPress={openOauth2Modal}
				/>
			)}
		</BetterTableRowGroup>
	)
}

export function DataManagementSection({
	navigation,
	isBusy,
	setBusy,
	unBusy,
}: SectionProps) {
	const { isAuthorized } = useAuthorizationStore()
	const { hasData } = useCacheStore()

	return (
		<>
			<BetterTableRowGroup
				title={lang.format('settings.manage_data.title', {})}
				icon={getAssetIDByName('UserIcon')}
				padding={!isAuthorized() || !hasData()}
			>
				{isAuthorized() && hasData() ? (
					<>
						<FormRow
							label={lang.format('settings.manage_data.save_data.title', {})}
							subLabel={lang.format(
								'settings.manage_data.save_data.description',
								{},
							)}
							leading={
								isBusy.includes('save_api') ? (
									<RN.ActivityIndicator size="small" />
								) : (
									<FormRow.Icon source={getAssetIDByName('UploadIcon')} />
								)
							}
							onPress={() => {
								if (isBusy.length) return

								if (vstorage.realTrackingAnalyticsSentToChina.tooMuchData) {
									return ActionSheet.open(TooMuchDataSheet, {
										navigation,
									})
								}

								showConfirmationAlert({
									title: lang.format('alert.save_data.title', {}),
									content: lang.format('alert.save_data.body', {}),
									confirmText: lang.format('alert.save_data.confirm', {}),
									onConfirm: async () => {
										setBusy('save_api')
										try {
											const everything = await grabEverything()
											await saveData(everything)

											showToast(
												lang.format('toast.saved_data', {}),
												getAssetIDByName('CircleCheckIcon-primary'),
											)
										} catch (e: any) {
											if (
												e?.message
													?.toLowerCase()
													.includes('request entity too large')
											) {
												ActionSheet.open(TooMuchDataSheet, {
													navigation,
												})
											}
										}

										unBusy('save_api')
									},
								})
							}}
						/>
						<FormRow
							label={lang.format('sheet.import_data.title', {})}
							subLabel={lang.format(
								'settings.manage_data.import_data.description',
								{},
							)}
							leading={
								isBusy.includes('import_api') ? (
									<RN.ActivityIndicator size="small" />
								) : (
									<FormRow.Icon source={getAssetIDByName('DownloadIcon')} />
								)
							}
							onPress={() => {
								if (isBusy.length) return

								setImportCallback(x =>
									x ? setBusy('import_api') : unBusy('import_api'),
								)
								ActionSheet.open(ImportActionSheet, {
									navigation,
								})
							}}
						/>
					</>
				) : !isAuthorized() ? (
					<Text variant="text-md/semibold" color="TEXT_DEFAULT" align="center">
						{lang.format('settings.label.auth_needed', {})}
					</Text>
				) : (
					<RN.ActivityIndicator size="small" style={{ flex: 1 }} />
				)}
			</BetterTableRowGroup>

			{isAuthorized() && hasData() && (
				<BetterTableRowGroup nearby>
					<FormRow
						label={lang.format(
							'settings.manage_data.download_compressed.title',
							{},
						)}
						subLabel={lang.format(
							'settings.manage_data.download_compressed.description',
							{},
						)}
						leading={
							isBusy.includes('download_compressed') ? (
								<RN.ActivityIndicator size="small" />
							) : (
								<FormRow.Icon source={getAssetIDByName('DownloadIcon')} />
							)
						}
						onPress={async () => {
							if (isBusy.length) return

							if (!canSaveFileNatively()) return url.openURL(rawDataURL())

							setBusy('download_compressed')
							let data: RawData
							try {
								data = await getRawData()
							} catch {
								unBusy('download_compressed')
								return
							}

							const saved = await saveFile(data.file, data.data).catch(
								console.error,
							)
							unBusy('download_compressed')
							if (!saved || saved.error) {
								showToast(
									lang.format('toast.backup_not_saved', {}),
									getAssetIDByName('CircleXIcon-primary'),
								)
								console.error('backup not saved', saved && saved.error)
								return
							}

							showToast(
								lang.format('toast.backup_saved', {
									file: saved.name ?? '',
								}),
								getAssetIDByName('FileIcon'),
							)
						}}
					/>
					<FormRow
						label={lang.format(
							'settings.manage_data.import_compressed.title',
							{},
						)}
						subLabel={lang.format(
							'settings.manage_data.import_compressed.description',
							{},
						)}
						leading={
							isBusy.includes('import_compressed') ? (
								<RN.ActivityIndicator size="small" />
							) : (
								<FormRow.Icon source={getAssetIDByName('UploadIcon')} />
							)
						}
						onPress={async () => {
							if (isBusy.length) return
							setBusy('import_compressed')

							const text = await pickFile().catch(e => new Error(e))
							if (!text || text instanceof Error) {
								unBusy('import_compressed')
								showToast(
									lang.format('toast.failed_file_open', {}),
									getAssetIDByName('CircleXIcon-primary'),
								)
								console.error(text)
								return
							}

							let backup: UserData
							try {
								backup = await decompressRawData(text)
							} catch {
								unBusy('import_compressed')
								return
							}

							ActionSheet.open(WwyltdSheet, {
								backup,
								navigation,
							})
							unBusy('import_compressed')
							setImportCallback(val =>
								val
									? setBusy('import_compressed')
									: unBusy('import_compressed'),
							)
						}}
					/>
				</BetterTableRowGroup>
			)}
		</>
	)
}
