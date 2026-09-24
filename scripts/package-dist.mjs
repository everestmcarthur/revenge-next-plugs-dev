import { readdir, readFile } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const PLUGINS_DIR = join(ROOT, 'plugins')
const DIST_DIR = join(ROOT, 'build', 'dist')

if (!existsSync(DIST_DIR)) {
	mkdirSync(DIST_DIR, { recursive: true })
}

const entries = await readdir(PLUGINS_DIR, { withFileTypes: true })

for (const entry of entries) {
	if (!entry.isDirectory() || entry.name === 'shared') continue
	const manifestPath = join(PLUGINS_DIR, entry.name, 'manifest.json')
	const jsPath = join(PLUGINS_DIR, entry.name, 'build', 'js', 'index.js')
	if (!existsSync(manifestPath) || !existsSync(jsPath)) continue

	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
	const id = manifest.id
	if (!id) continue

	const zipPath = join(DIST_DIR, `${id}.zip`)

	// Use tar -a -c -f on Windows (built-in libarchive bsdtar) to make clean zip without folder prefixes
	const res = spawnSync('tar', ['-a', '-c', '-f', zipPath, '-C', join(PLUGINS_DIR, entry.name), 'manifest.json', '-C', join(PLUGINS_DIR, entry.name, 'build', 'js'), 'index.js'], { stdio: 'pipe' })
	if (res.status !== 0) {
		// Fallback to powershell Compress-Archive
		spawnSync('powershell', ['-Command', `Compress-Archive -Force -Path '${manifestPath}','${jsPath}' -DestinationPath '${zipPath}'`])
	}
	console.log(`Packaged ${id} -> ${zipPath}`)
}

console.log('\nGenerating index.json...')
const gen = spawnSync('bun', [
	'node_modules/@revenge-mod/plugin-cli/src/main.ts',
	'generate-index',
	'--dist', DIST_DIR,
	'--base-url', 'http://192.168.12.237:8080',
	'--out', join(DIST_DIR, 'index.json'),
], { stdio: 'inherit' })

console.log('Done!')
