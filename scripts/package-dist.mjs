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

	// Use bsdtar (Linux/BSD) or tar -a -c -f on Windows (built-in libarchive bsdtar) to make clean zip without folder prefixes
	const tarCmd = existsSync('/usr/bin/bsdtar') ? 'bsdtar' : 'tar'
	const res = spawnSync(tarCmd, ['-a', '-c', '-f', zipPath, '-C', join(PLUGINS_DIR, entry.name), 'manifest.json', '-C', join(PLUGINS_DIR, entry.name, 'build', 'js'), 'index.js'], { stdio: 'pipe' })
	if (res.status !== 0) {
		const pyRes = spawnSync('python3', ['-c', `import zipfile; z = zipfile.ZipFile('${zipPath}', 'w', zipfile.ZIP_DEFLATED); z.write('${manifestPath}', 'manifest.json'); z.write('${jsPath}', 'index.js'); z.close()`])
		if (pyRes.status !== 0) {
			// Fallback to powershell Compress-Archive
			spawnSync('powershell', ['-Command', `Compress-Archive -Force -Path '${manifestPath}','${jsPath}' -DestinationPath '${zipPath}'`])
		}
	}
	console.log(`Packaged ${id} -> ${zipPath}`)
}

console.log('\nGenerating index.json...')
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8080'
const gen = spawnSync('bun', [
	'node_modules/@revenge-mod/plugin-cli/src/main.ts',
	'generate-index',
	'--dist', DIST_DIR,
	'--base-url', baseUrl,
	'--out', join(DIST_DIR, 'index.json'),
], { stdio: 'inherit' })

console.log('Done!')
