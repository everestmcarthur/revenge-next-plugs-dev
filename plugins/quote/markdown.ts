/**
 * Converts Discord Markdown into styled Unicode characters so that
 * canvas/image generation APIs (like voids.top) can render formatted text
 * (bold, italic, strikethrough, underline, monospace) directly onto the quote card.
 */

function toBold(str: string): string {
	return str.replace(/[A-Za-z0-9]/g, ch => {
		const c = ch.charCodeAt(0)
		if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + c - 65) // A-Z sans-serif bold
		if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + c - 97) // a-z sans-serif bold
		if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ec + c - 48) // 0-9 sans-serif bold
		return ch
	})
}

function toItalic(str: string): string {
	return str.replace(/[A-Za-z]/g, ch => {
		const c = ch.charCodeAt(0)
		if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d608 + c - 65) // A-Z sans-serif italic
		if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d622 + c - 97) // a-z sans-serif italic
		return ch
	})
}

function toBoldItalic(str: string): string {
	return str.replace(/[A-Za-z]/g, ch => {
		const c = ch.charCodeAt(0)
		if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d63c + c - 65) // A-Z sans-serif bold italic
		if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d656 + c - 97) // a-z sans-serif bold italic
		return ch
	})
}

function toStrike(str: string): string {
	return str
		.split('')
		.map(c => (c === ' ' || c === '\n' ? c : `${c}\u0336`))
		.join('')
}

function toUnderline(str: string): string {
	return str
		.split('')
		.map(c => (c === ' ' || c === '\n' ? c : `${c}\u0332`))
		.join('')
}

function toMonospace(str: string): string {
	return str.replace(/[A-Za-z0-9]/g, ch => {
		const c = ch.charCodeAt(0)
		if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d670 + c - 65)
		if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d68a + c - 97)
		if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7f6 + c - 48)
		return ch
	})
}

export function renderDiscordMarkdownToUnicode(
	text: string,
	makeAllBold = false,
): string {
	if (!text) return ''
	let out = text

	// Masked links [text](url) -> text
	out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

	// Spoilers ||text|| -> text
	out = out.replace(/\|\|([\s\S]+?)\|\|/g, '$1')

	// Code blocks ```code```
	out = out.replace(/```(?:[a-zA-Z0-9_-]+\n)?([\s\S]+?)```/g, (_, code) =>
		toMonospace(code.trim()),
	)

	// Inline code `code`
	out = out.replace(/`([^`\n]+)`/g, (_, code) => toMonospace(code))

	// Bold Italic ***text*** or ___text___
	out = out.replace(/(?:\*\*\*|___)([\s\S]+?)(?:\*\*\*|___)/g, (_, t) =>
		toBoldItalic(t),
	)

	// Bold **text**
	out = out.replace(/\*\*([\s\S]+?)\*\*/g, (_, t) => toBold(t))

	// Italic *text* or _text_
	out = out.replace(/(?:^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, (m, t) =>
		m.replace(`*${t}*`, toItalic(t)),
	)
	out = out.replace(/(?:^|[^\w_])_([^_\n]+)_(?=[^\w_]|$)/g, (m, t) =>
		m.replace(`_${t}_`, toItalic(t)),
	)

	// Strikethrough ~~text~~
	out = out.replace(/~~([\s\S]+?)~~/g, (_, t) => toStrike(t))

	// Underline __text__
	out = out.replace(/__([\s\S]+?)__/g, (_, t) => toUnderline(t))

	// Quotes > text -> text
	out = out.replace(/^>\s*/gm, '')

	// Headers # text -> text
	out = out.replace(/^#{1,3}\s+/gm, '')

	if (makeAllBold) {
		out = toBold(out)
	}

	return out
}
