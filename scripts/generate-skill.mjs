import { mkdir, readFile, writeFile } from 'node:fs/promises'

const source = await readFile(new URL('../skill/handkey.md', import.meta.url), 'utf8')
const target = new URL('../src/generated/skill.ts', import.meta.url)
const output = `export const skillContent = ${JSON.stringify(source)}\n`
if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8')
  if (current !== output) throw new Error('Generated skill is stale. Run pnpm generate:skill.')
} else {
  await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true })
  await writeFile(target, output)
}
