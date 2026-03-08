import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const skillPath = new URL('../skills/aeo/SKILL.md', import.meta.url)
const source = readFileSync(skillPath, 'utf8')

assert.ok(source.startsWith('---\n'), 'Expected skill frontmatter to start with ---')

const closingMarker = source.indexOf('\n---\n', 4)
assert.ok(closingMarker !== -1, 'Expected skill frontmatter closing marker.')

const frontmatter = source.slice(4, closingMarker).trim()
assert.ok(frontmatter.length > 0, 'Expected non-empty skill frontmatter.')

for (const expected of ['name:', 'description:', 'allowed-tools:']) {
  assert.ok(frontmatter.includes(expected), `Expected ${expected} in skill frontmatter.`)
}

for (const expected of ['pnpm run build', 'node bin/aeo-audit.js']) {
  assert.ok(source.includes(expected), `Expected "${expected}" in skill instructions.`)
}

console.log('Verified shipped skill metadata and local verification instructions.')
