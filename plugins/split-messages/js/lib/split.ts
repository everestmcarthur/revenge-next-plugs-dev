const CODE_BLOCK_RE = /```[\s\S]*?```/g

interface Piece {
	text: string
	isCode: boolean
}

function segment(content: string): Piece[] {
	const pieces: Piece[] = []
	let lastIndex = 0
	for (const match of content.matchAll(CODE_BLOCK_RE)) {
		const index = match.index ?? 0
		if (index > lastIndex) pieces.push({ text: content.slice(lastIndex, index), isCode: false })
		pieces.push({ text: match[0], isCode: true })
		lastIndex = index + match[0].length
	}
	if (lastIndex < content.length) pieces.push({ text: content.slice(lastIndex), isCode: false })
	return pieces
}

function hardSlice(text: string, maxLength: number): string[] {
	const slices: string[] = []
	for (let i = 0; i < text.length; i += maxLength) {
		slices.push(text.slice(i, i + maxLength))
	}
	return slices
}

function packByLine(lines: string[], maxLength: number, sep: string): string[] {
	const chunks: string[] = []
	let current = ''
	for (const line of lines) {
		const candidate = current ? current + sep + line : line
		if (candidate.length > maxLength) {
			if (current) chunks.push(current)
			current = line
		} else {
			current = candidate
		}
	}
	if (current) chunks.push(current)
	return chunks
}

function splitText(text: string, maxLength: number, splitOnWords: boolean): string[] {
	if (!splitOnWords) {
		const lineChunks = packByLine(text.split('\n'), maxLength, '\n')
		if (lineChunks.length && !lineChunks.some((c) => c.length > maxLength)) {
			return lineChunks
		}
	}

	const wordChunks = packByLine(text.split(' '), maxLength, ' ')
	// Guaranteed safety: if any single word, URL, or unbroken string exceeds maxLength, hard-slice it
	return wordChunks.flatMap((c) => (c.length > maxLength ? hardSlice(c, maxLength) : [c]))
}

function splitCodeBlock(block: string, maxLength: number): string[] {
	if (block.length <= maxLength) return [block]

	const fenceMatch = block.match(/^```(\S*)\n/)
	const lang = fenceMatch?.[1] ?? ''
	const innerStart = fenceMatch ? fenceMatch[0].length : 3
	const inner = block.slice(innerStart, block.length - 3)
	const fenceOverhead = lang.length + 8
	const innerMax = Math.max(maxLength - fenceOverhead, 100)

	const lineChunks = packByLine(inner.split('\n'), innerMax, '\n')
	const safeChunks = lineChunks.flatMap((c) => (c.length > innerMax ? hardSlice(c, innerMax) : [c]))

	return safeChunks.map((c) => '```' + lang + '\n' + c + '\n```')
}

export function intoChunks(content: string, maxLength: number, splitOnWords: boolean): string[] {
	const atoms: string[] = []
	for (const piece of segment(content)) {
		if (!piece.text) continue
		if (piece.isCode) {
			atoms.push(...splitCodeBlock(piece.text, maxLength))
		} else {
			atoms.push(...splitText(piece.text, maxLength, splitOnWords))
		}
	}

	// Ensure all atoms are strictly <= maxLength
	const safeAtoms = atoms.flatMap((a) => (a.length > maxLength ? hardSlice(a, maxLength) : [a]))

	const chunks: string[] = []
	let current = ''
	for (const atom of safeAtoms) {
		const candidate = current ? current + '\n' + atom : atom
		if (candidate.length > maxLength) {
			if (current) chunks.push(current)
			current = atom
		} else {
			current = candidate
		}
	}
	if (current) chunks.push(current)

	return chunks.map((c) => c.trim()).filter(Boolean)
}
