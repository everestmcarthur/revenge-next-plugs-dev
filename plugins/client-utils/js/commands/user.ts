import { registerCommand } from '../registry'
import { ephemeralOption } from './options'
import {
	isEphemeralArg,
	getSnowflakeDate,
	getAvatarUrl,
	getBannerUrl,
	getUserSafe,
	getUserProfileStore,
	getGuildMemberStore,
} from '../stores'

export function registerUserCommands() {
	registerCommand({
		name: 'avatar',
		description: 'View the avatar of yourself or another user',
		options: [
			{
				type: 6,
				name: 'user',
				displayName: 'user',
				description: 'The user whose avatar you want to view',
				required: false,
			},
			ephemeralOption,
		],
		execute: async (args: any, ctx: any) => {
			let targetUser = ctx.currentUser
			if (args.user) {
				const u = getUserSafe(args.user) || getUserSafe(args.user?.id)
				if (u) targetUser = u
			}
			const avatarUrl = getAvatarUrl(targetUser)
			const isEphemeral = isEphemeralArg(args.ephemeral)
			const name = targetUser.globalName || targetUser.username

			ctx.reply({
				ephemeral: isEphemeral,
				content: '',
				imageUrl: avatarUrl,
				embed: {
					type: 'rich',
					title: `${name}'s Avatar`,
					url: avatarUrl,
					color: 0x5865f2,
					description: `[Open Original in Browser](${avatarUrl})`,
					image: {
						url: avatarUrl,
						proxyURL: avatarUrl,
						width: 1024,
						height: 1024,
					},
				},
			})
		},
	})

	registerCommand({
		name: 'banner',
		description: 'View the profile banner of yourself or another user',
		options: [
			{
				type: 6,
				name: 'user',
				displayName: 'user',
				description: 'The user whose banner you want to view',
				required: false,
			},
			ephemeralOption,
		],
		execute: async (args: any, ctx: any) => {
			let targetUser = ctx.currentUser
			if (args.user) {
				const u = getUserSafe(args.user) || getUserSafe(args.user?.id)
				if (u) targetUser = u
			}
			const profStore = getUserProfileStore()
			const profile = profStore?.getUserProfile?.(targetUser.id)
			const bannerUrl = getBannerUrl(targetUser, profile)
			const isEphemeral = isEphemeralArg(args.ephemeral)
			const name = targetUser.globalName || targetUser.username

			if (!bannerUrl) {
				ctx.reply({
					ephemeral: isEphemeral,
					content: `ℹ️ **${name}** does not have a custom profile banner.`,
				})
				return
			}

			ctx.reply({
				ephemeral: isEphemeral,
				content: '',
				imageUrl: bannerUrl,
				embed: {
					type: 'rich',
					title: `${name}'s Banner`,
					url: bannerUrl,
					color: 0x5865f2,
					description: `[Open Original in Browser](${bannerUrl})`,
					image: {
						url: bannerUrl,
						proxyURL: bannerUrl,
						width: 1024,
						height: 576,
					},
				},
			})
		},
	})

	registerCommand({
		name: 'userinfo',
		description: 'View detailed account information for a user',
		options: [
			{
				type: 6,
				name: 'user',
				displayName: 'user',
				description: 'The user to inspect',
				required: false,
			},
			ephemeralOption,
		],
		execute: async (args: any, ctx: any) => {
			let targetUser = ctx.currentUser
			if (args.user) {
				const u = getUserSafe(args.user) || getUserSafe(args.user?.id)
				if (u) targetUser = u
			}
			const isEphemeral = isEphemeralArg(args.ephemeral)
			const avatarUrl = getAvatarUrl(targetUser)
			const createdUnix = getSnowflakeDate(targetUser.id)
			const name = targetUser.globalName
				? `${targetUser.globalName} (@${targetUser.username})`
				: `@${targetUser.username}`

			const fields = [
				{ name: 'User ID', value: `\`${targetUser.id}\``, inline: true },
				{ name: 'Bot Account', value: targetUser.bot ? 'Yes' : 'No', inline: true },
				{
					name: 'Account Created',
					value: createdUnix ? `<t:${createdUnix}:F> (<t:${createdUnix}:R>)` : 'Unknown',
					inline: false,
				},
			]

			if (ctx.guildId) {
				const memStore = getGuildMemberStore()
				const member = memStore?.getMember?.(ctx.guildId, targetUser.id)
				if (member?.joinedAt) {
					const joinedUnix = Math.floor(new Date(member.joinedAt).getTime() / 1000)
					fields.push({
						name: 'Joined Server',
						value: `<t:${joinedUnix}:F> (<t:${joinedUnix}:R>)`,
						inline: false,
					})
				}
				if (member?.roles && member.roles.length > 0) {
					const rolesStr =
						member.roles
							.slice(0, 10)
							.map((r: string) => `<@&${r}>`)
							.join(' ') + (member.roles.length > 10 ? ` +${member.roles.length - 10} more` : '')
					fields.push({ name: `Roles (${member.roles.length})`, value: rolesStr, inline: false })
				}
			}

			ctx.reply({
				ephemeral: isEphemeral,
				embed: {
					type: 'rich',
					title: `User Info: ${name}`,
					color: 0x5865f2,
					thumbnail: {
						url: avatarUrl,
						proxyURL: avatarUrl,
						width: 128,
						height: 128,
					},
					fields,
				},
			})
		},
	})
}
