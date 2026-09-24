export enum ComponentType {
	ACTION_ROW = 1,
	BUTTON = 2,
	STRING_SELECT = 3,
	TEXT_INPUT = 4,
	USER_SELECT = 5,
	ROLE_SELECT = 6,
	MENTIONABLE_SELECT = 7,
	CHANNEL_SELECT = 8,
	SECTION = 9,
	TEXT_DISPLAY = 10,
	THUMBNAIL = 11,
	MEDIA_GALLERY = 12,
	FILE = 13,
	SEPARATOR = 14,
	CONTENT_INVENTORY_ENTRY = 16,
	CONTAINER = 17,
}

export enum ButtonStyle {
	PRIMARY = 1,
	SECONDARY = 2,
	SUCCESS = 3,
	DESTRUCTIVE = 4,
	DANGER = 4,
	LINK = 5,
}

export function parseColor(color: string | number | undefined): number | undefined {
	if (color === undefined || color === null) return undefined
	if (typeof color === 'number') return color
	if (typeof color === 'string') {
		const clean = color.replace(/^#/, '').trim()
		const parsed = parseInt(clean, 16)
		return isNaN(parsed) ? undefined : parsed
	}
	return undefined
}

export class EmbedBuilder {
	data: any = { type: 'rich' }

	setTitle(title: string): this {
		this.data.title = title
		return this
	}

	setDescription(description: string): this {
		this.data.description = description
		return this
	}

	setUrl(url: string): this {
		this.data.url = url
		return this
	}

	setColor(color: string | number): this {
		const c = parseColor(color)
		if (c !== undefined) this.data.color = c
		return this
	}

	setTimestamp(timestamp: string | Date = new Date()): this {
		this.data.timestamp = timestamp instanceof Date ? timestamp.toISOString() : timestamp
		return this
	}

	setFooter(text: string, iconURL?: string): this {
		this.data.footer = { text, icon_url: iconURL, proxy_icon_url: iconURL }
		return this
	}

	setImage(url: string): this {
		this.data.image = { url, proxyURL: url }
		return this
	}

	setThumbnail(url: string): this {
		this.data.thumbnail = { url, proxyURL: url }
		return this
	}

	setAuthor(name: string, iconURL?: string, url?: string): this {
		this.data.author = { name, icon_url: iconURL, proxy_icon_url: iconURL, url }
		return this
	}

	addFields(...fields: { name: string; value: string; inline?: boolean }[]): this {
		if (!this.data.fields) this.data.fields = []
		this.data.fields.push(...fields)
		return this
	}

	setFields(fields: { name: string; value: string; inline?: boolean }[]): this {
		this.data.fields = [...fields]
		return this
	}

	toJSON(): any {
		return { ...this.data }
	}
}

export class ButtonBuilder {
	data: any = { type: ComponentType.BUTTON, style: ButtonStyle.PRIMARY }

	setCustomId(customId: string): this {
		this.data.custom_id = customId
		return this
	}

	setLabel(label: string): this {
		this.data.label = label
		return this
	}

	setStyle(style: ButtonStyle | number | 'primary' | 'secondary' | 'success' | 'danger' | 'link'): this {
		if (typeof style === 'number') {
			this.data.style = style
		} else {
			const map: Record<string, ButtonStyle> = {
				primary: ButtonStyle.PRIMARY,
				secondary: ButtonStyle.SECONDARY,
				success: ButtonStyle.SUCCESS,
				danger: ButtonStyle.DESTRUCTIVE,
				destructive: ButtonStyle.DESTRUCTIVE,
				link: ButtonStyle.LINK,
			}
			this.data.style = map[style.toLowerCase()] || ButtonStyle.PRIMARY
		}
		return this
	}

	setUrl(url: string): this {
		this.data.url = url
		this.data.style = ButtonStyle.LINK
		return this
	}

	setEmoji(emoji: string | { id?: string; name: string }): this {
		if (typeof emoji === 'string') {
			this.data.emoji = { name: emoji }
		} else {
			this.data.emoji = emoji
		}
		return this
	}

	setDisabled(disabled = true): this {
		this.data.disabled = disabled
		return this
	}

	toJSON(): any {
		return { ...this.data }
	}
}

export class StringSelectBuilder {
	data: any = { type: ComponentType.STRING_SELECT, options: [] }

	setCustomId(customId: string): this {
		this.data.custom_id = customId
		return this
	}

	setPlaceholder(placeholder: string): this {
		this.data.placeholder = placeholder
		return this
	}

	setMinValues(min: number): this {
		this.data.min_values = min
		return this
	}

	setMaxValues(max: number): this {
		this.data.max_values = max
		return this
	}

	setDisabled(disabled = true): this {
		this.data.disabled = disabled
		return this
	}

	addOptions(...options: { label: string; value: string; description?: string; emoji?: any; default?: boolean }[]): this {
		if (!this.data.options) this.data.options = []
		this.data.options.push(...options)
		return this
	}

	setOptions(options: { label: string; value: string; description?: string; emoji?: any; default?: boolean }[]): this {
		this.data.options = [...options]
		return this
	}

	toJSON(): any {
		return { ...this.data }
	}
}

export class ActionRowBuilder {
	data: any = { type: ComponentType.ACTION_ROW, components: [] }

	addComponents(...components: any[]): this {
		if (!this.data.components) this.data.components = []
		for (const comp of components) {
			this.data.components.push(comp?.toJSON ? comp.toJSON() : comp)
		}
		return this
	}

	setComponents(components: any[]): this {
		this.data.components = components.map((c) => (c?.toJSON ? c.toJSON() : c))
		return this
	}

	toJSON(): any {
		return { ...this.data }
	}
}

export class SectionBuilder {
	data: any = { type: ComponentType.SECTION, components: [] }

	addComponents(...components: any[]): this {
		if (!this.data.components) this.data.components = []
		for (const comp of components) {
			this.data.components.push(comp?.toJSON ? comp.toJSON() : comp)
		}
		return this
	}

	setAccessory(accessory: any): this {
		this.data.accessory = accessory?.toJSON ? accessory.toJSON() : accessory
		return this
	}

	toJSON(): any {
		return { ...this.data }
	}
}

export class ContainerBuilder {
	data: any = { type: ComponentType.CONTAINER, components: [] }

	setAccentColor(color: string | number): this {
		const c = parseColor(color)
		if (c !== undefined) this.data.accent_color = c
		return this
	}

	setSpoiler(spoiler = true): this {
		this.data.spoiler = spoiler
		return this
	}

	addComponents(...components: any[]): this {
		if (!this.data.components) this.data.components = []
		for (const comp of components) {
			this.data.components.push(comp?.toJSON ? comp.toJSON() : comp)
		}
		return this
	}

	toJSON(): any {
		return { ...this.data }
	}
}

export class SeparatorBuilder {
	data: any = { type: ComponentType.SEPARATOR, divider: true, spacing: 1 }

	setSpacing(spacing: 1 | 2 | 'small' | 'large'): this {
		this.data.spacing = typeof spacing === 'string' ? (spacing === 'large' ? 2 : 1) : spacing
		return this
	}

	setDivider(divider = true): this {
		this.data.divider = divider
		return this
	}

	toJSON(): any {
		return { ...this.data }
	}
}

export class MessageBuilder {
	data: any = { content: '', embeds: [], components: [] }

	setContent(content: string): this {
		this.data.content = content
		return this
	}

	setFormat(format: 'text' | 'embed' | 'cv2'): this {
		this.data.format = format
		return this
	}

	setEphemeral(ephemeral = true): this {
		this.data.ephemeral = ephemeral
		return this
	}

	addEmbed(embed: any): this {
		if (!this.data.embeds) this.data.embeds = []
		this.data.embeds.push(embed?.toJSON ? embed.toJSON() : embed)
		return this
	}

	setEmbeds(embeds: any[]): this {
		this.data.embeds = embeds.map((e) => (e?.toJSON ? e.toJSON() : e))
		return this
	}

	addComponent(component: any): this {
		if (!this.data.components) this.data.components = []
		this.data.components.push(component?.toJSON ? component.toJSON() : component)
		return this
	}

	setComponents(components: any[]): this {
		this.data.components = components.map((c) => (c?.toJSON ? c.toJSON() : c))
		return this
	}

	toJSON(): any {
		return { ...this.data }
	}
}
