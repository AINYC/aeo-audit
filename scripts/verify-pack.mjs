import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
})

const [packResult] = JSON.parse(raw)
const paths = new Set(packResult.files.map((file) => file.path))

for (const expected of ['README.md', 'LICENSE', 'bin/aeo-audit.js', 'skills/aeo/SKILL.md']) {
  assert.ok(paths.has(expected), `Expected ${expected} in npm pack output.`)
}

assert.ok(
  [...paths].some((path) => path.startsWith('dist/')),
  'Expected dist/ output in npm pack output.',
)

for (const forbiddenPrefix of ['apps/', 'packages/', 'docs/', '.github/']) {
  assert.ok(
    [...paths].every((path) => !path.startsWith(forbiddenPrefix)),
    `Unexpected ${forbiddenPrefix} content in npm pack output.`,
  )
}

console.log(`Verified npm tarball contents for ${packResult.id}.`)
