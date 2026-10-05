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
	const pluginDir = join(PLUGINS_DIR, entry.name)
	const androidJar = join(pluginDir, 'build', 'outputs', 'plugin', 'plugin.jar')
	const hasJar = manifest.dist?.android?.path && existsSync(androidJar)

	// Use bsdtar (Linux/BSD) or tar -a -c -f on Windows to make clean zip
	const tarCmd = existsSync('/usr/bin/bsdtar') ? 'bsdtar' : 'tar'
	const tarArgs = [
		'-a', '-c', '-f', zipPath,
		'-C', pluginDir, 'manifest.json',
		'-C', join(pluginDir, 'build', 'js'), 'index.js',
	]
	if (hasJar) {
		tarArgs.push('-C', join(pluginDir, 'build', 'outputs', 'plugin'), 'plugin.jar')
	}

	const res = spawnSync(tarCmd, tarArgs, { stdio: 'pipe' })
	if (res.status !== 0) {
		const pyRes = spawnSync('python3', [
			'-c',
			`import zipfile; z = zipfile.ZipFile('${zipPath}', 'w', zipfile.ZIP_DEFLATED); z.write('${manifestPath}', 'manifest.json'); z.write('${jsPath}', 'index.js'); ${hasJar ? `z.write('${androidJar}', 'plugin.jar');` : ''} z.close()`,
		])
		if (pyRes.status !== 0) {
			const files = [`'${manifestPath}'`, `'${jsPath}'`]
			if (hasJar) files.push(`'${androidJar}'`)
			spawnSync('powershell', [
				'-Command',
				`Compress-Archive -Force -Path ${files.join(',')} -DestinationPath '${zipPath}'`,
			])
		}
	}
	console.log(`Packaged ${id} -> ${zipPath}${hasJar ? ' (with plugin.jar)' : ''}`)
}

console.log('\nGenerating index.json...')
const baseUrl = process.env.BASE_URL || 'https://dev-next.jarviscli.dev'
const gen = spawnSync('bun', [
	'node_modules/@revenge-mod/plugin-cli/src/main.ts',
	'generate-index',
	'--dist', DIST_DIR,
	'--base-url', baseUrl,
	'--out', join(DIST_DIR, 'index.json'),
], { stdio: 'inherit' })

console.log('Done!')
