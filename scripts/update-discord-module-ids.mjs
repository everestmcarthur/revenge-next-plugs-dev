#!/usr/bin/env bun
import { existsSync } from 'node:fs'
// Created by Kmio (https://github.com/kmmiio99o / https://kmmiio99o.dev)
// Refreshes Discord module IDs in plugins/shared/discord-modules.ts from
// lvwmwm/decord's data branch (latest build), then bumps the patch version of
// every plugin that imports the shared store.
//
// Usage: bun scripts/update-discord-module-ids.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLUGINS_DIR = join(ROOT, 'plugins')
const TARGET = join(PLUGINS_DIR, 'shared/discord-modules.ts')

const REPO = 'https://raw.githubusercontent.com/lvwmwm/decord/data'

// Modules that are part of Metro/Discord's static runtime bootstrap rather than
// normal path-mapped modules. Not present in module-paths.json; sourced from the
// decord data branch source tree instead (see deriveAsyncRequireId).
const STABLE_RUNTIME_MODULES = new Set(['asyncRequireImpl'])

const current = await import(pathToFileURL(TARGET).href)
const tracked = Object.keys(current.discordModules)

const [versionRes, pathsRes] = await Promise.all([
	fetch(`${REPO}/version.txt`),
	fetch(`${REPO}/module-paths.json`),
])
if (!versionRes.ok || !pathsRes.ok) {
	throw new Error(
		`decord fetch failed (${versionRes.status} / ${pathsRes.status})`,
	)
}

const remoteBuild = Number((await versionRes.text()).trim())
const remotePaths = await pathsRes.json()

async function deriveAsyncRequireId() {
	const treeRes = await fetch(
		`https://api.github.com/repos/lvwmwm/decord/git/trees/data?recursive=1`,
	)
	if (!treeRes.ok) return undefined
	const tree = await treeRes.json()
	const entry = tree.tree?.find(
		(t) => t.type === 'blob' && /_asyncRequireImpl\.js$/.test(t.path),
	)
	if (!entry) return undefined
	const fileRes = await fetch(`${REPO}/${entry.path}`)
	if (!fileRes.ok) return undefined
	const match = (await fileRes.text()).match(/\/\/ Module ID: (\d+)/)
	return match ? Number(match[1]) : undefined
}

const nextIds = {}
const missing = []
for (const path of tracked) {
	const entry = remotePaths.find(m => m.path === path)
	if (!entry) {
		missing.push(path)
		nextIds[path] = current.discordModules[path]
		continue
	}
	nextIds[path] = entry.id
}

// Resolve the async require module ID from decord's source tree so it tracks
// Discord across builds instead of staying a hardcoded constant.
const asyncRequireId = await deriveAsyncRequireId()
if (asyncRequireId !== undefined) {
	nextIds['asyncRequireImpl'] = asyncRequireId
	// No longer "missing": successfully sourced from the decord source tree.
	const i = missing.indexOf('asyncRequireImpl')
	if (i !== -1) missing.splice(i, 1)
}

const buildChanged = remoteBuild !== current.discordBuild
const idsChanged = tracked.some(
	path => nextIds[path] !== current.discordModules[path],
)

if (buildChanged || idsChanged) {
	const rows = Object.entries(nextIds)
		.map(([path, id]) => `\t'${path}': ${id},`)
		.join('\n')
	const out = [
		'// Shared Discord module ID store for plugins. Module IDs shift between Discord',
		"// builds; they're refreshed here by scripts/update-discord-module-ids.mjs from",
		"// lvwmwm/decord's data branch (https://github.com/lvwmwm/decord/tree/data) on the",
		'// latest build. Module paths are stable across builds; you can add/remove entries',
		'// here and the script only updates the IDs.',
		'',
		`export const discordBuild = ${remoteBuild}`,
		'',
		'export const discordModules = {',
		rows,
		'} as const',
		'',
	].join('\n')
	await writeFile(TARGET, out)
	console.log(
		`Updated discord-modules.ts: build ${current.discordBuild} -> ${remoteBuild}`,
	)
	await bumpDependentVersions()
} else {
	console.log(`discord-modules.ts is already up to date (build ${remoteBuild})`)
}

if (missing.length > 0) {
	const stable = missing.filter(p => STABLE_RUNTIME_MODULES.has(p))
	const unexpected = missing.filter(p => !STABLE_RUNTIME_MODULES.has(p))
	if (stable.length > 0) {
		console.log(
			`Preserved stable runtime module IDs (not tracked by decord): ${stable.join(', ')}`,
		)
	}
	if (unexpected.length > 0) {
		console.error(`Missing modules in decord data branch: ${unexpected.join(', ')}`)
		console.error(
			'Keeping their current IDs; the plugin fallback still covers them.',
		)
		process.exitCode = 1
	}
}

async function bumpDependentVersions() {
	const dependents = []
	for (const entry of await readdir(PLUGINS_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name === 'shared') continue
		const src = join(PLUGINS_DIR, entry.name, 'src')
		const js = join(PLUGINS_DIR, entry.name, 'js')
		if (!existsSync(join(PLUGINS_DIR, entry.name, 'manifest.json'))) continue
		if ((await importsSharedStore(src)) || (await importsSharedStore(js))) dependents.push(entry.name)
	}

	for (const name of dependents) {
		const manifestPath = join(PLUGINS_DIR, name, 'manifest.json')
		const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
		const next = bumpVersion(manifest.version)
		if (!next || next === manifest.version) continue
		const prev = manifest.version
		manifest.version = next
		await writeFile(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`)
		console.log(`Bumped ${name} version: ${prev} -> ${next}`)
	}
}

async function importsSharedStore(dir) {
	const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
	for (const entry of entries) {
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			if (await importsSharedStore(full)) return true
		} else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
			const src = await readFile(full, 'utf8')
			if (src.includes('shared/discord-modules') || src.includes('@shared'))
				return true
		}
	}
	return false
}

function bumpVersion(version) {
	if (!/^\d+\.\d+\.\d+$/.test(version)) {
		console.warn(`Skipping version bump for "${version}": not x.y.z semver`)
		return null
	}
	return version.replace(/(\d+)$/, n => String(Number(n) + 1))
}
