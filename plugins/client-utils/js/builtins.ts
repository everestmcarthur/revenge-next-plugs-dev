import { registerCommand } from './registry'
import {
	isEphemeralArg,
	getSnowflakeDate,
	getAvatarUrl,
	getBannerUrl,
	getUserSafe,
	getUserProfileStore,
	getGuildMemberStore,
	getGuildStore,
	getGuildMemberCountStore,
	getChannelStore,
} from './stores'

export function registerBuiltinCommands() {
	const ephemeralOption = {
		type: 3,
		name: 'ephemeral',
		displayName: 'ephemeral',
		description: 'Show response only to you (optional)',
		required: false,
		choices: [
			{ name: 'True', displayName: 'True', value: 'true' },
		],
	}

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

	registerCommand({
		name: 'serverinfo',
		description: 'View information about the current server',
		options: [ephemeralOption],
		execute: async (args: any, ctx: any) => {
			const isEphemeral = isEphemeralArg(args.ephemeral)
			if (!ctx.guildId) {
				ctx.reply({
					ephemeral: isEphemeral,
					content: '❌ `/serverinfo` can only be used inside a server channel.',
				})
				return
			}

			const gStore = getGuildStore()
			const guild = gStore?.getGuild?.(ctx.guildId)
			if (!guild) {
				ctx.reply({
					ephemeral: isEphemeral,
					content: '❌ Server details not found.',
				})
				return
			}

			const iconUrl = guild.icon
				? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith('a_') ? 'gif' : 'png'}?size=1024`
				: null
			const createdUnix = getSnowflakeDate(guild.id)
			const cntStore = getGuildMemberCountStore()
			const memberCount = cntStore?.getMemberCount?.(guild.id) || 'Unknown'

			const fields = [
				{ name: 'Server ID', value: `\`${guild.id}\``, inline: true },
				{ name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
				{ name: 'Members', value: String(memberCount), inline: true },
				{
					name: 'Boost Tier',
					value: `Level ${guild.premiumTier || 0} (${guild.premiumSubscriptionCount || 0} boosts)`,
					inline: true,
				},
				{
					name: 'Created',
					value: createdUnix ? `<t:${createdUnix}:F> (<t:${createdUnix}:R>)` : 'Unknown',
					inline: false,
				},
			]

			ctx.reply({
				ephemeral: isEphemeral,
				embed: {
					type: 'rich',
					title: guild.name,
					color: 0x5865f2,
					thumbnail: iconUrl ? { url: iconUrl, proxyURL: iconUrl, width: 128, height: 128 } : undefined,
					fields,
				},
			})
		},
	})

	registerCommand({
		name: 'channelinfo',
		description: 'View information about the current or specified channel',
		options: [
			{
				type: 7,
				name: 'channel',
				displayName: 'channel',
				description: 'Channel to inspect',
				required: false,
			},
			ephemeralOption,
		],
		execute: async (args: any, ctx: any) => {
			const isEphemeral = isEphemeralArg(args.ephemeral)
			const targetChannelId = args.channel || ctx.channelId
			const chStore = getChannelStore()
			const channel = chStore?.getChannel?.(targetChannelId)

			if (!channel) {
				ctx.reply({
					ephemeral: isEphemeral,
					content: '❌ Channel not found.',
				})
				return
			}

			const createdUnix = getSnowflakeDate(channel.id)
			const fields = [
				{ name: 'Channel ID', value: `\`${channel.id}\``, inline: true },
				{
					name: 'Type',
					value:
						channel.type === 0
							? 'Text'
							: channel.type === 2
								? 'Voice'
								: channel.type === 4
									? 'Category'
									: channel.type === 5
										? 'Announcement'
										: String(channel.type),
					inline: true,
				},
				{ name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
				{
					name: 'Created',
					value: createdUnix ? `<t:${createdUnix}:F> (<t:${createdUnix}:R>)` : 'Unknown',
					inline: false,
				},
			]

			if (channel.topic) {
				fields.push({ name: 'Topic', value: channel.topic, inline: false })
			}

			ctx.reply({
				ephemeral: isEphemeral,
				embed: {
					type: 'rich',
					title: `#${channel.name || 'channel'}`,
					color: 0x5865f2,
					fields,
				},
			})
		},
	})

	registerCommand({
		name: 'inviteinfo',
		description: 'View detailed server and channel information for an invite link or code',
		options: [
			{
				type: 3,
				name: 'invite',
				displayName: 'invite',
				description: 'The invite link or code to look up',
				required: true,
			},
			ephemeralOption,
		],
		execute: async (args: any, ctx: any) => {
			const isEphemeral = isEphemeralArg(args.ephemeral)
			const rawInvite = args.invite
			if (!rawInvite) {
				ctx.reply({
					ephemeral: isEphemeral,
					content: '❌ Please provide an invite code or link.',
				})
				return
			}

			const cleanCode = rawInvite
				.replace(/^(https?:\/\/)?(discord\.(gg|com\/invite)\/)/i, '')
				.trim()

			try {
				const res = await fetch(
					`https://discord.com/api/v9/invites/${cleanCode}?with_counts=true&with_expiration=true`,
				)
				if (!res.ok) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: `❌ Could not resolve invite \`${cleanCode}\` (Status: ${res.status}).`,
					})
					return
				}

				const data = await res.json()
				const guild = data.guild || {}
				const channel = data.channel || {}
				const inviter = data.inviter
				const totalMembers = data.approximate_member_count || 0
				const onlineMembers = data.approximate_presence_count || 0
				const onlinePercent =
					totalMembers > 0 ? Math.round((onlineMembers / totalMembers) * 100) : 0
				const createdUnix = guild.id ? getSnowflakeDate(guild.id) : null
				const expiresUnix = data.expires_at
					? Math.floor(new Date(data.expires_at).getTime() / 1000)
					: null

				const iconUrl =
					guild.id && guild.icon
						? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith('a_') ? 'gif' : 'png'}?size=512`
						: null
				const bannerUrl =
					guild.id && guild.banner
						? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${guild.banner.startsWith('a_') ? 'gif' : 'png'}?size=1024`
						: null

				const fields = [
					{
						name: 'Members',
						value: `${totalMembers} total\n${onlineMembers} online (${onlinePercent}%)`,
						inline: true,
					},
					{ name: 'Created', value: createdUnix ? `<t:${createdUnix}:R>` : 'Unknown', inline: true },
					{
						name: 'Boosts',
						value: `Level ${guild.premium_tier || 0}\n${guild.premium_subscription_count || 0} boosts`,
						inline: true,
					},
					{ name: 'Invite URL', value: `https://discord.gg/${cleanCode}`, inline: false },
					{ name: 'Invite Code', value: `\`${cleanCode}\``, inline: true },
				]

				if (channel.name) {
					fields.push({ name: 'Channel', value: `#${channel.name}`, inline: true })
					if (channel.id) {
						fields.push({ name: 'Channel ID', value: `\`${channel.id}\``, inline: true })
					}
				}

				if (inviter) {
					fields.push({
						name: 'Inviter',
						value: `${inviter.global_name || inviter.username} (@${inviter.username})`,
						inline: false,
					})
					fields.push({ name: 'Inviter ID', value: `\`${inviter.id}\``, inline: true })
				}

				fields.push({
					name: 'Expires',
					value: expiresUnix ? `<t:${expiresUnix}:R>` : 'Never',
					inline: true,
				})
				fields.push({
					name: 'Max Uses',
					value: data.max_uses ? String(data.max_uses) : 'Unlimited',
					inline: true,
				})

				if (guild.id) {
					fields.push({ name: 'Server ID', value: `\`${guild.id}\``, inline: true })
				}

				ctx.reply({
					ephemeral: isEphemeral,
					embed: {
						type: 'rich',
						title: guild.name || `Invite: ${cleanCode}`,
						url: `https://discord.gg/${cleanCode}`,
						description: guild.description || undefined,
						color: 0x5865f2,
						thumbnail: iconUrl
							? { url: iconUrl, proxyURL: iconUrl, width: 128, height: 128 }
							: undefined,
						image: bannerUrl
							? { url: bannerUrl, proxyURL: bannerUrl, width: 1024, height: 576 }
							: undefined,
						fields,
					},
				})
			} catch (err: any) {
				ctx.reply({
					ephemeral: isEphemeral,
					content: `❌ Failed to inspect invite: ${err.message}`,
				})
			}
		},
	})

	registerCommand({
		name: 'updatechecker',
		description: 'Check for plugin updates on device and download available updates',
		options: [ephemeralOption],
		execute: async (args: any, ctx: any) => {
			const isEphemeral = isEphemeralArg(args.ephemeral)
			try {
				const repos = (globalThis as any).revenge?.hidden?.plugins?.repositories
				if (!repos?.refreshAllRepos || !repos?.listAllUpdates) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: '❌ Plugin repository manager is not available.',
					})
					return
				}

				await repos.refreshAllRepos()
				const updatesResult = await repos.listAllUpdates()
				const updates = Array.isArray(updatesResult)
					? updatesResult
					: updatesResult?.updates || []

				if (updates.length === 0) {
					ctx.reply({
						ephemeral: isEphemeral,
						content: '',
						embed: {
							type: 'rich',
							title: 'Plugin Updates',
							description: '✅ All plugins are up to date!',
							color: 0x57f287,
						},
					})
					return
				}

				if (repos.updateAllPlugins) {
					await repos.updateAllPlugins()
				}

				const pList = (globalThis as any).revenge?.hidden?.plugins?.internal?.pList
				const updatedNames = updates
					.map((u: any) => {
						const id = u.id || u.manifest?.id || u.name
						const pluginObj = pList?.get ? pList.get(id) : null
						const name = pluginObj?.manifest?.name || u.name || id || 'Plugin'
						const avail = Array.isArray(u.available)
							? u.available.join('.')
							: u.available?.nums
								? u.available.nums.join('.')
								: u.available || u.version || 'Latest'
						return `• **${name}** (v${avail})`
					})
					.join('\n')

				ctx.reply({
					ephemeral: isEphemeral,
					content: '',
					embed: {
						type: 'rich',
						title: 'Plugin Updates Downloaded',
						description: `Downloaded updates for **${updates.length}** plugin(s):\n\n${updatedNames}\n\n*Reload Discord to apply the updates.*`,
						color: 0x5865f2,
					},
				})
			} catch (e: any) {
				ctx.reply({
					ephemeral: isEphemeral,
					content: `❌ Failed to check for updates: ${e?.message || e}`,
				})
			}
		},
	})
}
